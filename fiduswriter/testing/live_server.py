import asyncio
import multiprocessing
import socket
import tempfile
import threading
import time
import traceback as _traceback
import warnings
from functools import partial
from pathlib import Path
from django.conf import settings

# Python 3.14 changed the Linux default from "fork" to "forkserver".  The
# live-server test case relies on the child process inheriting the parent's
# Django configuration, which only happens with "fork".  Restore the old
# default before any multiprocessing code runs.
try:
    multiprocessing.set_start_method("fork", force=True)
except (RuntimeError, AttributeError):
    pass

from django.core.exceptions import ImproperlyConfigured
from django.db import connections
from django.db.backends.base.creation import TEST_DATABASE_PREFIX
from django.test.testcases import TransactionTestCase
from django.test.utils import modify_settings

from channels.routing import get_default_application


def _find_free_port(host):
    """Bind to port 0, let the OS pick a free port, return it."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind((host, 0))
        return s.getsockname()[1]


def _wait_for_port(host, port, timeout=10):
    """Poll until the TCP port accepts connections or timeout expires."""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            with socket.create_connection((host, port), timeout=0.1):
                return True
        except (ConnectionRefusedError, OSError):
            time.sleep(0.05)
    return False


# ---------------------------------------------------------------------------
# Reimplementation of channels.testing.live.set_database_connection
#
# We cannot import from channels.testing at all: channels/testing/__init__.py
# unconditionally does `from .live import ChannelsLiveServerTestCase`, and
# live.py does `from daphne.testing import DaphneProcess` at module level.
# That blows up as soon as daphne is not installed – even if DaphneProcess is
# never used.  So we reproduce the tiny helpers we need here instead.
# ---------------------------------------------------------------------------


def set_database_connection():
    """
    Switch the default database to the test database.
    Called as a setup hook inside the server child process.
    """
    from django.conf import settings

    test_db_name = settings.DATABASES["default"]["TEST"].get("NAME")
    if not test_db_name:
        test_db_name = (
            TEST_DATABASE_PREFIX + settings.DATABASES["default"]["NAME"]
        )
    settings.DATABASES["default"]["NAME"] = test_db_name


# ---------------------------------------------------------------------------
# GranianProcess – drop-in replacement for daphne.testing.DaphneProcess
# ---------------------------------------------------------------------------


class GranianProcess(multiprocessing.Process):
    """
    A ``multiprocessing.Process`` subclass that boots an ASGI application
    using Granian instead of Daphne/Twisted.

    The public interface is intentionally identical to
    ``daphne.testing.DaphneProcess`` so that it can be used as a direct
    replacement::

        class ProtocolServerProcess = GranianProcess  # on the test-case class

    Attributes
    ----------
    port : multiprocessing.Value("i", …)
        Holds the actual TCP port the server is listening on.  Written by the
        child process once the listen socket is bound; readable by the parent.
    ready : multiprocessing.Event
        Set by the child as soon as the listen socket is bound and before the
        first worker is spawned.  The parent waits on this event.
    errors : multiprocessing.Queue
        Receives ``(exception, traceback_string)`` tuples if the child process
        fails to start.  The parent can check it after a failed ``ready``
        wait.
    """

    def __init__(
        self,
        host,
        get_application,
        kwargs=None,
        setup=None,
        teardown=None,
        port=None,
    ):
        super().__init__()
        self.host = host
        self.get_application = get_application
        # kwargs are accepted for interface compatibility but not forwarded to
        # Granian because the two servers have different parameter names.
        self._extra_kwargs = kwargs or {}
        self.setup = setup
        self.teardown = teardown
        self.port = multiprocessing.Value("i", port if port is not None else 0)
        self.ready = multiprocessing.Event()
        self.errors = multiprocessing.Queue()

    def run(self):
        """Entry point of the child process."""
        from granian import Granian
        from granian.constants import Interfaces

        try:
            if self.setup is not None:
                self.setup()

            # Granian requires a raw IP address (not a hostname like
            # "localhost"), so resolve it now.
            resolved_host = socket.gethostbyname(self.host)

            # Pre-select a free port and publish it to shared memory *before*
            # starting the server.  This guarantees the parent always reads a
            # valid port number — even if an exception is raised later.
            port = self.port.value or _find_free_port(self.host)
            self.port.value = port

            application = self.get_application()

            # Read MEDIA_ROOT after get_application() has fully bootstrapped
            # Django (via asgi.py), then let Granian serve media files directly
            # at the Rust level, avoiding Django's sync FileResponse entirely.

            media_root = getattr(settings, "MEDIA_ROOT", None)
            static_path_mount = [Path(media_root)] if media_root else None
            static_path_route = ["/media"] if media_root else None

            # Daemon thread: probe the TCP port and signal ready as soon as
            # the server accepts its first connection.  This avoids relying on
            # any Granian-internal hooks (_init_shared_socket, _sso, _sfd)
            # that may change across Granian versions.
            def _probe():
                if _wait_for_port(resolved_host, port):
                    self.ready.set()
                elif not self.ready.is_set():
                    self.errors.put(
                        (
                            RuntimeError(
                                f"Granian did not start on {self.host}:{port}"
                            ),
                            "",
                        )
                    )
                    self.ready.set()

            threading.Thread(target=_probe, daemon=True).start()

            Granian(
                target="__live_test_app__",
                address=resolved_host,
                port=port,
                interface=Interfaces.ASGI,
                workers=1,
                log_enabled=False,
                static_path_route=static_path_route,
                static_path_mount=static_path_mount,
            ).serve(target_loader=lambda _: application, wrap_loader=True)

        except BaseException as exc:
            self.errors.put((exc, _traceback.format_exc()))
            if not self.ready.is_set():
                self.ready.set()
        finally:
            try:
                if self.teardown is not None:
                    self.teardown()
            except Exception:
                pass


# ---------------------------------------------------------------------------
# Helpers used by ChannelsLiveServerTestCase
# ---------------------------------------------------------------------------

_server_command_queue = None


def clear_contenttype_cache():
    from django.contrib.contenttypes.models import ContentType

    ContentType.objects.clear_cache()


def make_application(*, static_wrapper, commands={}):
    # Module-level function for pickle-ability
    application = get_default_application()
    # Wrap the application with our command processing middleware
    application = ServerCommandMiddleware(application, commands)
    if static_wrapper is not None:
        application = static_wrapper(application)
    return application


class ServerCommandMiddleware:
    """
    Middleware that processes commands from the test process.
    This is automatically added to the ASGI application in test mode.
    """

    def __init__(self, app, commands):
        self.app = app
        self.commands = commands
        self._exception_handler_installed = False

    async def __call__(self, scope, receive, send):
        # Install a custom event loop exception handler on first request
        # to suppress CancelledError noise from asyncio/asgiref during tests.
        # This handles the "CancelledError exception in shielded future"
        # messages that occur when Selenium navigates away while the server
        # is still processing a request via sync_to_async.
        if not self._exception_handler_installed:
            self._install_exception_handler()
            self._exception_handler_installed = True

        # Process any pending server commands before handling the request
        self.process_server_commands()
        try:
            return await self.app(scope, receive, send)
        except asyncio.CancelledError:
            # Silently handle cancellation. This happens when the test
            # client (Selenium) navigates away or disconnects while the
            # server is still processing a previous request.
            pass

    def _install_exception_handler(self):
        """
        Set a custom asyncio event loop exception handler that suppresses
        CancelledError. The default handler logs these to stderr which
        produces noisy output in CI and can be mistaken for real errors.
        """
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            return

        original_handler = loop.get_exception_handler()

        def _custom_exception_handler(loop, context):
            exception = context.get("exception")
            if isinstance(exception, asyncio.CancelledError):
                return
            # For all other exceptions, use the original handler or default
            if original_handler is not None:
                original_handler(loop, context)
            else:
                loop.default_exception_handler(context)

        loop.set_exception_handler(_custom_exception_handler)

    def process_server_commands(self):
        global _server_command_queue
        if _server_command_queue is None:
            return

        while not _server_command_queue.empty():
            command = _server_command_queue.get_nowait()
            if command in self.commands:
                self.commands[command]()


# ---------------------------------------------------------------------------
# ChannelsLiveServerTestCase
#
# Reimplemented from scratch on top of Django's TransactionTestCase so that
# channels.testing (and therefore daphne) is never imported.
# ---------------------------------------------------------------------------


class ChannelsLiveServerTestCase(TransactionTestCase):
    """
    Equivalent to ``channels.testing.ChannelsLiveServerTestCase`` but backed
    by Granian instead of Daphne, and with no daphne dependency at import time.
    """

    host = "localhost"
    ProtocolServerProcess = GranianProcess
    static_wrapper = None
    serve_static = False
    commands = {"clear_contenttype_cache": clear_contenttype_cache}

    @property
    def live_server_url(self):
        return f"http://{self.host}:{self._port}"

    @property
    def live_server_ws_url(self):
        return f"ws://{self.host}:{self._port}"

    @classmethod
    def setUpClass(cls):
        for connection in connections.all():
            if cls._is_in_memory_db(connection):
                raise ImproperlyConfigured(
                    "ChannelsLiveServerTestCase cannot be used with "
                    "in-memory databases"
                )

        # Suppress Django's warning about sync StreamingHttpResponse
        # iterators served through the ASGI handler.  This is set before
        # the server child is forked so it is inherited by the child.
        warnings.filterwarnings(
            "ignore",
            message=".*StreamingHttpResponse must consume synchronous iterators.*",
            category=Warning,
        )

        super().setUpClass()

        cls._live_server_modified_settings = modify_settings(
            ALLOWED_HOSTS={"append": cls.host}
        )
        cls._live_server_modified_settings.enable()

        # Use a temporary directory for MEDIA_ROOT during tests so that
        # Granian's static mount always points at an existing directory,
        # and leftover test files never persist across runs.  The temp
        # dir is created before the server child is forked so both the
        # test runner and the server child can access it.
        cls._test_media_dir = tempfile.mkdtemp(
            prefix="fiduswriter-test-media-"
        )
        cls._saved_media_root = getattr(settings, "MEDIA_ROOT", None)
        settings.MEDIA_ROOT = cls._test_media_dir

        global _server_command_queue
        _server_command_queue = multiprocessing.Queue()
        cls._server_command_queue = _server_command_queue

        get_application = partial(
            make_application,
            static_wrapper=cls.static_wrapper if cls.serve_static else None,
            commands=cls.commands,
        )
        cls._server_process = cls.ProtocolServerProcess(
            cls.host,
            get_application,
            setup=set_database_connection,
        )
        cls._server_process.start()
        while True:
            if not cls._server_process.ready.wait(timeout=1):
                if cls._server_process.is_alive():
                    continue
                raise RuntimeError("Server stopped unexpectedly") from None
            break

        # Surface any startup error from the child process immediately,
        # rather than proceeding with port=0 and failing obscurely later.
        if not cls._server_process.errors.empty():
            _exc, tb = cls._server_process.errors.get()
            raise RuntimeError(
                f"Live server process failed to start:\n{tb}"
            ) from _exc

        cls._port = cls._server_process.port.value

    @classmethod
    def tearDownClass(cls):
        cls._server_process.terminate()
        cls._server_process.join()
        cls._live_server_modified_settings.disable()
        # Restore MEDIA_ROOT and remove the temporary media directory
        if hasattr(cls, "_saved_media_root"):
            settings.MEDIA_ROOT = cls._saved_media_root
        if hasattr(cls, "_test_media_dir"):
            import shutil

            shutil.rmtree(cls._test_media_dir, ignore_errors=True)
        super().tearDownClass()

    @classmethod
    def _is_in_memory_db(cls, connection):
        if connection.vendor == "sqlite":
            return connection.is_in_memory_db()
        return False

    def setUp(self):
        super().setUp()
        self.run_server_command("clear_contenttype_cache")

    def run_server_command(self, command):
        """Send a command to be executed in the server process."""
        if hasattr(self.__class__, "_server_command_queue"):
            self._server_command_queue.put(command)

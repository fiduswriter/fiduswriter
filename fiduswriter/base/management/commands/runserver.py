# Origin: https://github.com/django/daphne/blob/2b13b74ce266fedf1cad9122314a2a3579cee576/daphne/management/commands/runserver.py
# With Fidus Writer specific adjustments.
# Daphne replaced with Granian (Rust-based ASGI server).

import datetime
import logging
import os
import signal
import subprocess
import sys
import threading
import time
from http.server import HTTPServer, SimpleHTTPRequestHandler

from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer

from base import get_version

from django.conf import settings
from django.core.management import CommandError, call_command
from django.core.management.commands.runserver import (
    Command as RunserverCommand,
)

logger = logging.getLogger("django.channels.server")


class MaintenancePageHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def _serve_maintenance(self):
        self.path = "/index.html"
        return SimpleHTTPRequestHandler.do_GET(self)

    def do_GET(self):
        return self._serve_maintenance()

    def do_POST(self):
        return self._serve_maintenance()

    def do_PUT(self):
        return self._serve_maintenance()

    def do_DELETE(self):
        return self._serve_maintenance()

    def do_PATCH(self):
        return self._serve_maintenance()

    def do_OPTIONS(self):
        return self._serve_maintenance()

    def translate_path(self, path):
        return os.path.join(settings.SETUP_PAGE_PATH, "index.html")


class JSFileHandler(FileSystemEventHandler):
    def __init__(self, command_instance):
        self.command_instance = command_instance
        self.last_transpile = 0
        self.watched_extensions = (".js", ".mjs", ".json5")
        self.last_modified_times = {}

    def on_any_event(self, event):
        if event.event_type in ["created", "modified", "moved"]:
            if event.src_path.endswith(self.watched_extensions):
                if not self._should_ignore(event.src_path):
                    self._handle_change(event.src_path)

    def _should_ignore(self, path):
        ignore_list = ["node_modules", ".git"]
        return any(ignore_item in path for ignore_item in ignore_list)

    def _handle_change(self, path):
        current_time = time.time()
        try:
            mtime = os.path.getmtime(path)
        except OSError:
            # File might have been deleted or moved
            return

        if path in self.last_modified_times:
            if mtime == self.last_modified_times[path]:
                # File hasn't actually changed
                return

        self.last_modified_times[path] = mtime

        if current_time - self.last_transpile > 30:
            print(f"File changed: {path}")
            self.command_instance.stdout.write(
                "JavaScript or related file changed. Transpiling..."
            )
            call_command("transpile")
            self.last_transpile = current_time


def get_internal_port(conn):
    if isinstance(conn, int):
        return conn
    elif isinstance(conn, dict):
        return int(conn["internal"])


def _free_ports(ports):
    """Kill any processes listening on the given TCP ports to release them."""
    if not ports:
        return
    try:
        subprocess.run(
            ["fuser", "-k"] + [f"{port}/tcp" for port in ports],
            capture_output=True,
            timeout=5,
        )
        # Give the OS a moment to actually release the ports
        time.sleep(0.3)
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass
    except Exception:
        pass


class Command(RunserverCommand):
    protocol = "http"

    def add_arguments(self, parser):
        super().add_arguments(parser)
        parser.add_argument(
            "--http_timeout",
            action="store",
            dest="http_timeout",
            type=int,
            default=None,
            help=(
                "Specify the granian read_timeout interval in seconds "
                "(default: no timeout)"
            ),
        )

    def get_version(self):
        return get_version()

    def handle(self, *args, **options):
        self.addrport_provided = (
            "addrport" in options and options["addrport"] is not None
        )
        self.http_timeout = options.get("http_timeout", None)
        # Check Channels is installed right
        if not hasattr(settings, "ASGI_APPLICATION"):
            raise CommandError(
                "You have not set ASGI_APPLICATION, which is needed to run the server."
            )
        # Dispatch upward
        super().handle(*args, **options)

    def _build_granian_env(self):
        """
        Build the subprocess environment for Granian.

        Ensures the directory containing the 'fiduswriter' package is on
        PYTHONPATH so that 'fiduswriter.asgi:application' is always importable,
        regardless of how manage.py was invoked.
        """
        env = os.environ.copy()
        src_parent = os.path.dirname(settings.SRC_PATH)
        existing = env.get("PYTHONPATH", "")
        parts = [p for p in existing.split(os.pathsep) if p]
        if src_parent not in parts:
            parts.insert(0, src_parent)
        env["PYTHONPATH"] = os.pathsep.join(parts)
        return env

    def _build_granian_cmd(self, port, options):
        """Return the Granian CLI invocation for a single port."""
        cmd = [
            sys.executable,
            "-m",
            "granian",
            "--interface",
            "asgi",
            "--host",
            self.addr,
            "--port",
            str(port),
            "--access-log",
        ]

        if settings.DEBUG:
            cmd += ["--log-level", "info"]

        root_path = getattr(settings, "FORCE_SCRIPT_NAME", "") or ""
        if root_path:
            cmd += ["--base-path", root_path]

        if self.http_timeout:
            cmd += ["--read-timeout", str(self.http_timeout)]

        # Serve media files via Granian's built-in static file server.
        # Django's settings are fully loaded by this point (we're inside
        # inner_run which runs after Django is configured).
        media_root = getattr(settings, "MEDIA_ROOT", None)
        if media_root:
            cmd += [
                "--static-path-route",
                "/media",
                "--static-path-mount",
                media_root,
            ]

        # Use the production ASGI entry point; it handles its own Django
        # settings bootstrap via asgi.py.
        cmd.append("fiduswriter.asgi:application")
        return cmd

    def inner_run(self, *args, **options):
        # Determine the address to bind to
        if not options.get("addrport"):
            # If address not specified on command line, use settings
            listen_to_all = getattr(
                settings, "LISTEN_TO_ALL_INTERFACES", False
            )
            self.addr = "0.0.0.0" if listen_to_all else "127.0.0.1"

        # Determine ports to use
        default_port = int(self.port)
        if self.addrport_provided:
            ports = [default_port]
        else:
            ports = getattr(settings, "PORTS", [default_port])
            if isinstance(ports, int):
                ports = [ports]
            elif isinstance(ports, (list, tuple)):
                ports = list(ports)
            else:
                ports = [default_port]
            if not ports:
                ports = [default_port]
            try:
                ports = [get_internal_port(p) for p in ports]
            except (ValueError, TypeError):
                raise CommandError(
                    "PORTS must be a list of integers or dicts with an `internal` key."
                )

        # Kill any stale processes still holding the target ports from a
        # previous run (common during auto-reload when old Granian workers
        # haven't released their sockets yet).
        _free_ports(ports)

        # Start maintenance page servers for each port
        maintenance_servers = []
        for port in ports:
            server_address = (
                "[%s]" % self.addr if self._raw_ipv6 else self.addr,
                port,
            )
            maintenance_server = HTTPServer(
                server_address, MaintenancePageHandler
            )
            maintenance_server_thread = threading.Thread(
                target=maintenance_server.serve_forever
            )
            maintenance_server_thread.start()
            maintenance_servers.append(
                (maintenance_server, maintenance_server_thread)
            )

        # Run checks
        self.stdout.write("Performing system checks...\n\n")
        self.check(display_num_errors=True)
        self.check_migrations()
        call_command("setup", force_transpile=False)

        # Stop maintenance page servers
        for maintenance_server, thread in maintenance_servers:
            maintenance_server.shutdown()
            maintenance_server.server_close()
            thread.join()

        # Print helpful text
        quit_command = "CTRL-BREAK" if sys.platform == "win32" else "CONTROL-C"
        now = datetime.datetime.now().strftime("%B %d, %Y - %X")
        self.stdout.write(now)
        addr_display = "[%s]" % self.addr if self._raw_ipv6 else self.addr
        urls = [f"{self.protocol}://{addr_display}:{port}/" for port in ports]
        self.stdout.write(
            (
                "Fidus Writer version %(version)s, using settings %(settings)r\n"
                "Fidus Writer server is running at the following URL(s):\n"
                "%(urls)s\n"
                "Quit the server with %(quit_command)s.\n"
            )
            % {
                "version": self.get_version(),
                "settings": settings.SETTINGS_MODULE,
                "urls": "\n".join(urls),
                "quit_command": quit_command,
            }
        )

        # Add JavaScript file watcher
        observer = None
        if settings.DEBUG:
            js_handler = JSFileHandler(self)
            observer = Observer()
            observer.schedule(
                js_handler, path=settings.SRC_PATH, recursive=True
            )
            observer.start()

        # Launch one Granian subprocess per port
        granian_env = self._build_granian_env()
        processes = []
        for port in ports:
            cmd = self._build_granian_cmd(port, options)
            proc = subprocess.Popen(cmd, env=granian_env)
            processes.append(proc)

        try:
            # Poll until a process exits unexpectedly or CTRL-C is received
            while True:
                for proc in processes:
                    ret = proc.poll()
                    if ret is not None:
                        logger.error(
                            "Granian worker on port %s exited with code %s",
                            ports[processes.index(proc)],
                            ret,
                        )
                        raise SystemExit(ret)
                time.sleep(0.5)
        except (KeyboardInterrupt, SystemExit):
            pass
        finally:
            # Graceful shutdown: SIGTERM first, SIGKILL after timeout
            for proc in processes:
                if proc.poll() is None:
                    proc.send_signal(signal.SIGTERM)
            for proc in processes:
                try:
                    proc.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    proc.kill()

            if observer is not None:
                observer.stop()
                observer.join()

            shutdown_message = options.get("shutdown_message", "")
            if shutdown_message:
                self.stdout.write(shutdown_message)

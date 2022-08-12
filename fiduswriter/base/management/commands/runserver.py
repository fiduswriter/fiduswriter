import re
import threading

from datetime import datetime
from sys import platform
from tornado.httpserver import HTTPServer
import tornado.ioloop
from tornado.web import Application

from django.core.management import call_command
from django.core.management.base import CommandError
from django.utils import translation
from django.conf import settings

from base.servers.tornado_django_hybrid import run as run_server
from base.handlers import SetupStaticFilesHandler
from base.management import BaseCommand

try:
    from asyncio import set_event_loop_policy
    from tornado.platform.asyncio import AnyThreadEventLoopPolicy

    set_event_loop_policy(AnyThreadEventLoopPolicy())
except ImportError:
    pass

naiveip_re = re.compile(
    r"""^(?:
(?P<addr>
    (?P<ipv4>\d{1,3}(?:\.\d{1,3}){3}) |         # IPv4 address
    (?P<ipv6>\[[a-fA-F0-9:]+\]) |               # IPv6 address
    (?P<fqdn>[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*) # FQDN
):)?(?P<port>\d+)$""",
    re.X,
)


class Command(BaseCommand):
    help = "Run django using the tornado server"
    requires_migrations_checks = True
    requires_system_checks = "__all__"
    leave_locale_alone = True
    default_addr = "127.0.0.1"
    default_port = str(settings.PORT)
    compile_server = False

    def add_arguments(self, parser):
        parser.add_argument(
            "addrport", nargs="?", help="Optional port number, or ipaddr:port"
        )

    def handle(self, *args, **options):
        if options["addrport"]:
            m = re.match(naiveip_re, options["addrport"])
            if m is None:
                raise CommandError(
                    '"%s" is not a valid port number '
                    "or address:port pair." % options["addrport"]
                )
            self.addr, _ipv4, _ipv6, _fqdn, self.port = m.groups()
            if not self.addr:
                self.addr = self.default_addr
        else:
            self.addr = self.default_addr
            self.port = self.default_port
        if not self.port.isdigit():
            raise CommandError("%r is not a valid port number." % self.port)
        self.inner_run(*args, **options)

    def inner_run(self, *args, **options):
        quit_command = (platform == "win32") and "CTRL-BREAK" or "CONTROL-C"
        if (hasattr(settings, "AUTO_SETUP") and settings.AUTO_SETUP) or (
            not hasattr(settings, "AUTO_SETUP") and settings.DEBUG
        ):
            server = self.get_setup_server()
            loop_thread = threading.Thread(
                target=tornado.ioloop.IOLoop.current().start
            )
            loop_thread.daemon = True
            loop_thread.start()
            call_command("setup", force_transpile=False)
            server.stop()
            ioloop = tornado.ioloop.IOLoop.current()
            ioloop.add_callback(ioloop.stop)
        self.stdout.write(
            (
                "%(started_at)s\n"
                "Fidus Writer version %(version)s, using settings %(settings)r\n"
                "Fidus Writer server is running at http://%(addr)s:%(port)s/\n"
                "Quit the server with %(quit_command)s.\n"
            )
            % {
                "started_at": datetime.now().strftime("%B %d, %Y - %X"),
                "version": self.get_version(),
                "settings": settings.SETTINGS_MODULE,
                "addr": self.addr,
                "port": self.port,
                "quit_command": quit_command,
            }
        )
        # django.core.management.base forces the locale to en-us. We should
        # set it up correctly for the first request (particularly important
        # in the "--noreload" case).
        translation.activate(settings.LANGUAGE_CODE)

        run_server(self.port)

    def get_setup_server(self):
        # Start a tornado server to run while the compile is happening
        tornado_app = Application(
            [
                (
                    r"/(.*)",
                    SetupStaticFilesHandler,
                    {
                        "path": settings.SETUP_PAGE_PATH,
                        "default_filename": "index.html",
                    },
                ),
            ],
            debug=settings.DEBUG,
            websocket_ping_interval=settings.WEBSOCKET_PING_INTERVAL,
            compress_response=True,
        )
        server = HTTPServer(tornado_app, no_keep_alive=True)
        server.xheaders = True
        server.listen(int(self.port))
        return server

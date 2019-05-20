import re

from datetime import datetime
from sys import platform

from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.utils import translation
from django.conf import settings

from base.servers.tornado_django_hybrid import run as run_server

try:
    from asyncio import set_event_loop_policy
    from tornado.platform.asyncio import AnyThreadEventLoopPolicy
    set_event_loop_policy(AnyThreadEventLoopPolicy())
except ImportError:
    pass

naiveip_re = re.compile(r"""^(?:
(?P<addr>
    (?P<ipv4>\d{1,3}(?:\.\d{1,3}){3}) |         # IPv4 address
    (?P<ipv6>\[[a-fA-F0-9:]+\]) |               # IPv6 address
    (?P<fqdn>[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*) # FQDN
):)?(?P<port>\d+)$""", re.X)


class Command(BaseCommand):
    help = 'Run django using the tornado server'
    requires_migrations_checks = True
    requires_system_checks = True
    leave_locale_alone = True
    default_addr = '127.0.0.1'
    default_port = '8000'

    def add_arguments(self, parser):
        parser.add_argument(
            'addrport', nargs='?',
            help='Optional port number, or ipaddr:port'
        )

    def handle(self, *args, **options):
        if options['addrport']:
            m = re.match(naiveip_re, options['addrport'])
            if m is None:
                raise CommandError(
                    '"%s" is not a valid port number '
                    'or address:port pair.' % options['addrport']
                )
            self.addr, _ipv4, _ipv6, _fqdn, self.port = m.groups()
        else:
            self.addr = self.default_addr
            self.port = self.default_port
        if not self.port.isdigit():
            raise CommandError("%r is not a valid port number." % self.port)
        self.inner_run(*args, **options)

    def inner_run(self, *args, **options):
        quit_command = (platform == 'win32') and 'CTRL-BREAK' or 'CONTROL-C'
        if hasattr(settings, 'AUTO_TRANSPILE') and settings.AUTO_TRANSPILE:
            call_command("transpile")
        self.stdout.write((
            "%(started_at)s\n"
            "Django version %(version)s, using settings %(settings)r\n"
            "Django tornado server is running at http://%(addr)s:%(port)s/\n"
            "Quit the server with %(quit_command)s.\n"
        ) % {
            "started_at": datetime.now().strftime('%B %d, %Y - %X'),
            "version": self.get_version(),
            "settings": settings.SETTINGS_MODULE,
            "addr": self.addr,
            "port": self.port,
            "quit_command": quit_command,
        })
        # django.core.management.base forces the locale to en-us. We should
        # set it up correctly for the first request (particularly important
        # in the "--noreload" case).
        translation.activate(settings.LANGUAGE_CODE)

        run_server(self.port)

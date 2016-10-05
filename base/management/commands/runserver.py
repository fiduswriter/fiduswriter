#
# This file is part of Fidus Writer <http://www.fiduswriter.org>
#
# Copyright (C) 2013 Takuto Kojima, Johannes Wilm
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as
# published by the Free Software Foundation, either version 3 of the
# License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.

from datetime import datetime
from sys import platform

from django.core.management.base import BaseCommand, CommandError
from django.utils import translation, autoreload
from django.conf import settings

from base.servers.tornado_django_hybrid import run as run_server


class Command(BaseCommand):
    help = 'Run django using the tornado server'
    requires_migrations_checks = True
    requires_system_checks = False
    leave_locale_alone = True
    default_port = '8000'

    def add_arguments(self, parser):
        parser.add_argument(
            'port', nargs='?',
            help='Optional port number'
        )

    def handle(self, *args, **options):
        if options['port']:
            self.port = options['port']
        else:
            self.port = self.default_port
        if not self.port.isdigit():
            raise CommandError("%r is not a valid port number." % self.port)
        if settings.DEBUG:
            autoreload.main(self.inner_run, args, options)
        else:
            self.inner_run(*args, **options)

    def inner_run(self, *args, **options):
        quit_command = (platform == 'win32') and 'CTRL-BREAK' or 'CONTROL-C'

        self.stdout.write((
            "%(started_at)s\n"
            "Django version %(version)s, using settings %(settings)r\n"
            "Django tornado server is running at http://%(addr)s:%(port)s/\n"
            "Quit the server with %(quit_command)s.\n"
        ) % {
            "started_at": datetime.now().strftime('%B %d, %Y - %X'),
            "version": self.get_version(),
            "settings": settings.SETTINGS_MODULE,
            "addr": '127.0.0.1',
            "port": self.port,
            "quit_command": quit_command,
        })
        # django.core.management.base forces the locale to en-us. We should
        # set it up correctly for the first request (particularly important
        # in the "--noreload" case).
        translation.activate(settings.LANGUAGE_CODE)

        run_server(self.port)

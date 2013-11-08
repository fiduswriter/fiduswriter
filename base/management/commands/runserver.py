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
from django.core.handlers.wsgi import WSGIHandler

from tornado.options import options, define, parse_command_line
from tornado.httpserver import HTTPServer
from tornado.ioloop import IOLoop
from tornado.web import Application, FallbackHandler, RequestHandler, StaticFileHandler
from tornado.wsgi import WSGIContainer

from text.ws_views import DocumentWS

DEFAULT_PORT = "8000"


class Command(BaseCommand):
    args = '[optional port number]'
    help = 'Run django using the tornado server'

    def handle(self, port=None, *args, **options):
        if not port:
            self.port = DEFAULT_PORT
        else:
            self.port = port
        if not self.port.isdigit():
            raise CommandError("%r is not a valid port number." % self.port)        
        if settings.DEBUG:
            autoreload.main(self.inner_run, args, options)
        else:
            self.inner_run(*args, **options)
        
    def inner_run(self, *args, **options):    
        wsgi_app = WSGIContainer(WSGIHandler())
        tornado_app = Application([(r'/static/(.*)',
            DjangoStaticFilesHandler, {'default_filename': 'none.img'}),
            (r'/media/(.*)', StaticFileHandler, {'path': settings.MEDIA_ROOT}),
            ('/hello-tornado', HelloHandler), 
            ('/ws/doc/(\w+)', DocumentWS), 
            ('.*', FallbackHandler, dict(fallback=wsgi_app))])
        quit_command = (platform == 'win32') and 'CTRL-BREAK' or 'CONTROL-C'
        
        self.stdout.write("Validating models...\n\n")
        self.validate(display_num_errors=True)
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
        
        server = HTTPServer(tornado_app)
        server.listen(int(self.port))
        IOLoop.instance().start()



class HelloHandler(RequestHandler):

    def get(self):
        self.write('Hello from tornado')



class DjangoStaticFilesHandler(StaticFileHandler):

    #settings = None

    def initialize(self, default_filename=None):
        super(DjangoStaticFilesHandler, self).initialize(None,
                default_filename=None)
        #self.settings = settings

    def validate_absolute_path(self, root, absolute_path):
        return absolute_path

    def get_absolute_path(self, root, path):
        for finder in settings.STATICFILES_FINDERS:
            finderClass = self.get_class(finder)
            instance = finderClass()

            new_path = instance.find(path)
            if len(new_path) > 0:
                return new_path

    def get_class(self, kls):
        parts = kls.split('.')
        module = '.'.join(parts[:-1])
        m = __import__(module)
        for comp in parts[1:]:
            m = getattr(m, comp)
        return m

    def set_extra_headers(self, path):
        self.set_header('Cache-Control', 'no-cache, must-revalidate')
        self.set_header('Expires', '0')
        now = datetime.now()
        expiration = datetime(now.year - 1, now.month, now.day)
        self.set_header('Last-Modified', expiration)
        

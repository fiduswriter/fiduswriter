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

from django.conf import settings

from tornado.web import RequestHandler, StaticFileHandler


class HelloHandler(RequestHandler):

    def head(self):
        self.finish()

    def get(self):
        self.write('Hello from tornado')

class RobotsHandler(RequestHandler):

    def head(self):
        self.finish()

    def get(self):
        self.write('User-agent: *\nDisallow: /document/\nDisallow: /bibliography/\nDisallow: /usermedia/\nDisallow: /book/')

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

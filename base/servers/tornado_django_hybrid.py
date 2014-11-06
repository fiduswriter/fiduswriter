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

from django.conf import settings
from django.core.handlers.wsgi import WSGIHandler

from tornado.httpserver import HTTPServer
from tornado.ioloop import IOLoop
from tornado.web import Application, FallbackHandler, StaticFileHandler
from tornado.wsgi import WSGIContainer

from base.handlers import DjangoStaticFilesHandler, HelloHandler

if settings.CACHES["default"]["BACKEND"] == "redis_cache.cache.RedisCache":
    from document.ws_views_redis import DocumentWS
else:
    from document.ws_views import DocumentWS


def make_tornado_server():
    wsgi_app = WSGIContainer(WSGIHandler())
    tornado_app = Application([
        (r'/static/(.*)', DjangoStaticFilesHandler, {'default_filename':
                                                     'none.img'}),
        (r'/media/(.*)', StaticFileHandler, {'path': settings.MEDIA_ROOT}),
        ('/hello-tornado', HelloHandler),
        ('/ws/doc/(\w+)', DocumentWS),
        ('.*', FallbackHandler, dict(fallback=wsgi_app))
    ])

    return HTTPServer(tornado_app)


def run(port):
    make_tornado_server().listen(int(port))
    IOLoop.instance().start()

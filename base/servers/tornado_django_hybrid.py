from django.conf import settings
from django.core.wsgi import get_wsgi_application

from tornado.httpserver import HTTPServer
from tornado.ioloop import IOLoop
from tornado.web import Application, FallbackHandler, StaticFileHandler
from tornado.wsgi import WSGIContainer

from base.handlers import DjangoStaticFilesHandler, HelloHandler, RobotsHandler

from document.ws_views import DocumentWS
from ojs.proxy_views import OJSProxy


def make_tornado_server():
    wsgi_app = WSGIContainer(get_wsgi_application())
    tornado_app = Application([
        (r'/static/(.*)', DjangoStaticFilesHandler, {'default_filename':
                                                     'none.img'}),
        (r'/media/(.*)', StaticFileHandler, {'path': settings.MEDIA_ROOT}),
        ('/hello-tornado', HelloHandler),
        ('/robots.txt', RobotsHandler),
        ('/ws/doc/(\w+)', DocumentWS),
        ('/proxy/ojs/(\w+)', OJSProxy),
        ('.*', FallbackHandler, dict(fallback=wsgi_app))
    ])

    return HTTPServer(tornado_app)


def run(port):
    make_tornado_server().listen(int(port))
    IOLoop.instance().start()

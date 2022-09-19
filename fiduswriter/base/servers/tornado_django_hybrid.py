from importlib import import_module

from django.conf import settings
from django.core.asgi import get_asgi_application

from tornado.httpserver import HTTPServer
from tornado.ioloop import IOLoop
from tornado.web import Application, StaticFileHandler

from base.handlers import DjangoStaticFilesHandler, HelloHandler, RobotsHandler

from . import asgi


def make_tornado_server():
    tornado_url_list = [
        (
            r"/static/(.*)",
            DjangoStaticFilesHandler,
            {"default_filename": "none.img"},
        ),
        (r"/media/(.*)", StaticFileHandler, {"path": settings.MEDIA_ROOT}),
        ("/hello-tornado", HelloHandler),
        ("/robots.txt", RobotsHandler),
    ]

    for app in settings.INSTALLED_APPS:
        app_name = app.rsplit(".", 1).pop()
        # add proxy views
        try:
            proxy_module = import_module("%s.proxy_views" % app)
        except ImportError:
            pass
        else:
            tornado_url_list += [
                ("/proxy/%s/([^?]*)" % app_name, proxy_module.Proxy)
            ]
        # add ws views
        try:
            ws_module = import_module("%s.ws_views" % app)
        except ImportError:
            pass
        else:
            tornado_url_list += [
                (
                    "/ws/%s/([^?]*)" % app_name,
                    ws_module.WebSocket,
                    dict(app_name=app_name),
                )
            ]
    tornado_url_list += [
        (".*", asgi.AsgiHandler, dict(asgi_app=get_asgi_application()))
    ]
    tornado_app = Application(
        tornado_url_list,
        debug=settings.DEBUG,
        websocket_ping_interval=settings.WEBSOCKET_PING_INTERVAL,
        compress_response=True,
    )
    server = HTTPServer(tornado_app)
    server.xheaders = True
    return server


def run(port):
    make_tornado_server().listen(int(port))
    IOLoop.current().start()

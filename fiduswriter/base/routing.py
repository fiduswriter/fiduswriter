from importlib import import_module

from asgiref.sync import sync_to_async
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator
from django.urls import path
from django.core.asgi import get_asgi_application
from django.conf import settings

websocket_routes = []

for app in settings.INSTALLED_APPS:
    app_name = app.rsplit(".", 1).pop()
    # add ws consumers
    try:
        ws_urls = import_module("%s.ws_urls" % app)
    except ImportError:
        pass
    else:
        websocket_routes += [
            path(f"ws/{app_name}/", URLRouter(ws_urls.urlpatterns)),
        ]


async def lifespan_handler(scope, receive, send):
    """
    ASGI Lifespan handler for server startup/shutdown lifecycle events.

    On shutdown, saves all open documents before confirming completion so
    that Granian (or any other ASGI server) waits until the flush is done
    before terminating the process.
    """
    while True:
        message = await receive()
        if message["type"] == "lifespan.startup":
            await send({"type": "lifespan.startup.complete"})
        elif message["type"] == "lifespan.shutdown":
            from document.consumers import WebsocketConsumer

            await sync_to_async(WebsocketConsumer.save_all_docs)()
            await send({"type": "lifespan.shutdown.complete"})
            return


application = ProtocolTypeRouter(
    {
        "http": get_asgi_application(),
        "lifespan": lifespan_handler,
        "websocket": AllowedHostsOriginValidator(
            AuthMiddlewareStack(URLRouter(websocket_routes))
        ),
    }
)

from urllib.parse import urlparse
from tornado.websocket import WebSocketHandler
from django.db import connection
from logging import info, debug

from .django_handler_mixin import DjangoHandlerMixin


class BaseWebSocketHandler(DjangoHandlerMixin, WebSocketHandler):

    def check_origin(self, origin):
        parsed_origin = urlparse(origin)
        origin = parsed_origin.netloc
        # remove port if present
        origin = origin.split(':')[0]
        origin = origin.lower()

        host = self.request.headers.get("Host")
        # remove port if present
        host = host.split(':')[0]
        # Check to see that origin matches host directly, EXCLUDING ports
        return origin == host

    def allow_draft76(self):
        # for iOS 5.0 Safari
        return True

    def prepare(self):
        super(BaseWebSocketHandler, self).prepare()

    def finish(self, chunk=None):
        super(BaseWebSocketHandler, self).finish(chunk=chunk)

    # Clean up django ORM connections

        connection.close()
        if False:
            info('%d sql queries' % len(connection.queries))
            for query in connection.queries:
                debug('%s [%s seconds]' % (query['sql'], query['time']))

    # Clean up after python-memcached

        from django.core.cache import cache
        if hasattr(cache, 'close'):
            cache.close()

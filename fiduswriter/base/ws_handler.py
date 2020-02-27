from urllib.parse import urlparse
from tornado.websocket import WebSocketHandler
from tornado.websocket import WebSocketClosedError
from tornado.iostream import StreamClosedError
import tornado
from django.db import connection
import logging
from logging import info, debug
from tornado.ioloop import IOLoop
from tornado.escape import json_decode

from .django_handler_mixin import DjangoHandlerMixin

logger = logging.getLogger(__name__)


class BaseWebSocketHandler(DjangoHandlerMixin, WebSocketHandler):

    def open(self, arg):
        self.set_nodelay(True)
        logger.debug('Websocket opened')
        self.id = 0
        self.user = self.get_current_user()
        self.args = arg.split("/")
        self.messages = {
            'server': 0,
            'client': 0,
            'last_ten': []
        }
        if not self.user.is_authenticated:
            self.access_denied()
            return
        response = dict()
        response['type'] = 'welcome'
        self.send_message(response)

    def access_denied(self):
        response = dict()
        response['type'] = 'access_denied'
        self.send_message(response)
        IOLoop.current().add_callback(self.do_close)
        return

    def do_close(self):
        self.close()

    def on_message(self, data):
        message = json_decode(data)
        if message["type"] == 'request_resend':
            self.resend_messages(message["from"])
            return
        if 'c' not in message and 's' not in message:
            self.send({
                'type': 'access_denied'
            })
            # Message doesn't contain needed client/server info. Ignore.
            return
        logger.debug("Type %s, server %d, client %d, id %d" % (
            message["type"], message["s"], message["c"], self.id
        ))
        if message["c"] < (self.messages["client"] + 1):
            # Receive a message already received at least once. Ignore.
            return
        elif message["c"] > (self.messages["client"] + 1):
            # Messages from the client have been lost.
            logger.debug('REQUEST RESEND FROM CLIENT')
            self.send({
                'type': 'request_resend',
                'from': self.messages["client"]
            })
            return
        elif message["s"] < self.messages["server"]:
            # Message was sent either simultaneously with message from server
            # or a message from the server previously sent never arrived.
            # Resend the messages the client missed.
            logger.debug('SIMULTANEOUS')
            self.messages["client"] += 1
            self.resend_messages(message["s"])
            self.reject_message(message)
            return
        # Message order is correct. We continue processing the data.
        self.messages["client"] += 1
        self.handle_message(message)

    def handle_message(message):
        pass

    def reject_message(message):
        pass

    def send_message(self, message):
        self.messages['server'] += 1
        message['c'] = self.messages['client']
        message['s'] = self.messages['server']
        self.messages['last_ten'].append(message)
        self.messages['last_ten'] = self.messages['last_ten'][-10:]
        logger.debug("Sending: Type %s, Server: %d, Client: %d, id: %d" % (
            message["type"],
            message['s'],
            message['c'],
            self.id
        ))
        self.send(message)

    @tornado.gen.coroutine
    def send(self, message):
        try:
            yield self.write_message(message)
        except (WebSocketClosedError, StreamClosedError):
            pass

    def unfixable(self):
        pass

    def resend_messages(self, from_no):
        to_send = self.messages["server"] - from_no
        logger.debug('resending messages: %d' % to_send)
        logger.debug(
            'Server: %d, from: %d' % (
                self.messages["server"],
                from_no
            )
        )
        if to_send > len(self.messages['last_ten']):
            # Too many messages requested. We have to abort.
            logger.debug('cannot fix it')
            self.unfixable()
            return
        self.messages['server'] -= to_send
        for message in self.messages['last_ten'][0-to_send:]:
            self.send_message(message)

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

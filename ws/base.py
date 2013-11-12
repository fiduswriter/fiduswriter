import json

from tornado.websocket import WebSocketHandler
from tornado.wsgi import WSGIContainer
import tornado.gen

from django.db import connection
from django.contrib import auth
from logging import info, debug
from django.conf import settings
from django.utils.importlib import import_module
from django.core.handlers.wsgi import WSGIRequest

USE_REDIS = False

if settings.CACHES and settings.CACHES["default"]["BACKEND"]=="redis_cache.cache.RedisCache":
    try:
        import tornadoredis
        USE_REDIS = True
        try:
            redis_password = settings.CACHES['default']['OPTIONS']['PASSWORD']
        except KeyError:
            redis_password = None
        redis_server_info = settings.CACHES["default"]["location"].split(':')
        if redis_server_info[0] == 'unix':
            redis_client_publisher = tornadoredis.Client(unix_socket_path=redis_server_info[1],password=redis_password)
        else:
            redis_client_publisher = tornadoredis.Client(host=redis_server_info[0],port=redis_server_info[1],password=redis_password)
        
        redis_client_publisher.connect()
    except ImportError:
        USE_REDIS = False


class BaseWebSocketHandler(WebSocketHandler):
    subscribers = dict()


    def __init__(self, *args, **kwargs):
        super(BaseWebSocketHandler, self).__init__(*args, **kwargs)
        if USE_REDIS:
            self.USE_REDIS = True
            self.channel = 'channel'
        else:
            self.USE_REDIS = False

    @tornado.gen.engine
    def listen_to_redis(self):
        self.redis_client = tornadoredis.Client()
        self.redis_client.connect()
        yield tornado.gen.Task(self.redis_client.subscribe, self.channel)
        self.redis_client.listen(self.process_redis_message)
        
    def process_redis_message(self, message):
        if message.kind == 'message':
            self.write_message(message.body)
        
    def process_message(self, message):
        pass

    def allow_draft76(self):
        # for iOS 5.0 Safari
        return True

    def prepare(self):
        super(BaseWebSocketHandler, self).prepare()

    # Prepare ORM connections

        connection.queries = []

    def finish(self, chunk=None):
        super(BaseWebSocketHandler, self).finish(chunk=chunk)

    # Clean up django ORM connections

        connection.close()
        if False:
            info('%d sql queries'
                         % len(connection.queries))
            for query in connection.queries:
                debug('%s [%s seconds]' % (query['sql'],
                              query['time']))

    # Clean up cache

        from django.core.cache import cache
        if hasattr(cache, 'close'):
            cache.close()

    def get_django_session(self):
        if not hasattr(self, '_session'):
            engine = \
                import_module(settings.SESSION_ENGINE)
            session_key = \
                self.get_cookie(settings.SESSION_COOKIE_NAME)
            self._session = engine.SessionStore(session_key)
        return self._session

    def get_current_user(self):

    # get_user needs a django request object, but only looks at the session

        class Dummy(object):

            pass

        django_request = Dummy()
        django_request.session = self.get_django_session()
        user = auth.get_user(django_request)
        if user.is_authenticated():
            return user
        else:

      # try basic auth

            if not self.request.headers.has_key('Authorization'):
                return None
            (kind, data) = self.request.headers['Authorization'
                    ].split(' ')
            if kind != 'Basic':
                return None
            (username, _, password) = data.decode('base64'
                    ).partition(':')
            user = auth.authenticate(username=username,
                    password=password)
            if user is not None and user.is_authenticated():
                return user
            return None

    def get_django_request(self):
        request = \
            WSGIRequest(WSGIContainer.environ(self.request))
        request.session = self.get_django_session()

        if self.current_user:
            request.user = self.current_user
        else:
            request.user = auth.models.AnonymousUser()
        return request


    @classmethod
    def send_updates(cls, chat, channel, sender_id=None):
        if USE_REDIS:
            print "sending out chat"
            print chat
            redis_client_publisher.publish(channel, json.dumps(chat))
        else:
            for waiter in cls.sessions[channel].keys():
                if cls.sessions[channel][waiter].id != sender_id:
                    try:
                        cls.sessions[channel][waiter].write_message(chat)
                    except:
                        error("Error sending message", exc_info=True)      

import json
import redis

from redis.exceptions import ResponseError

from tornado.websocket import WebSocketHandler
from tornado.wsgi import WSGIContainer
from tornado.escape import json_decode
import tornado.gen

from django.db import connection
from django.contrib import auth
from logging import info, debug
from django.conf import settings
from django.utils.importlib import import_module
from django.core.handlers.wsgi import WSGIRequest

import tornadoredis

# TODO: Redis connection pools. When/how should they be used? Currently we don't use them at all.
# Also, the subscription list of every pubsub channel is kept in regular redis. 
# When using Redis 2.8, it is reset when "pubsub numsub channelname" returns zero.
try:
    redis_password = settings.CACHES['default']['OPTIONS']['PASSWORD']
except KeyError:
    redis_password = None
    
redis_server_info = settings.CACHES["default"]["LOCATION"].split(':')
if redis_server_info[0] == 'unix':
    redis_client_publisher = tornadoredis.Client(unix_socket_path=redis_server_info[1],password=redis_password)
    redis_client_storage = redis.StrictRedis(unix_socket_path=redis_server_info[1],password=redis_password)
    redis_client_publisher.connect()
else:
    redis_client_publisher = tornadoredis.Client(host=redis_server_info[0],port=int(redis_server_info[1]),password=redis_password)
    redis_client_storage = redis.StrictRedis(host=redis_server_info[0],port=int(redis_server_info[1]),password=redis_password)
    redis_client_publisher.connect()


class BaseRedisWebSocketHandler(WebSocketHandler):


    def __init__(self, *args, **kwargs):
        super(BaseRedisWebSocketHandler, self).__init__(*args, **kwargs)
        self.channel = 'channel'

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
    
    def get_storage_object(self, variable):
        value = redis_client_storage.get(variable)
        if value:
            return json_decode(value)
        else:
            return None

    def set_storage_object(self, variable,contents):
        return redis_client_storage.set(variable,json.dumps(contents))

    def pubsub_numsub(self, channel):
        try:
            # Requires Redis 2.8
            subscribers = int(redis_client_storage.execute_command('PUBSUB','NUMSUB', channel)[1])
        except ResponseError:
            subscribers = 'UNKNOWN'
        return subscribers


    def allow_draft76(self):
        # for iOS 5.0 Safari
        return True

    def prepare(self):
        super(BaseRedisWebSocketHandler, self).prepare()

    # Prepare ORM connections

        connection.queries = []

    def finish(self, chunk=None):
        super(BaseRedisWebSocketHandler, self).finish(chunk=chunk)

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

    def send_updates(self, update):
        redis_client_publisher.publish(self.channel, json.dumps(update))    

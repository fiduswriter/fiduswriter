from tornado.websocket import WebSocketHandler
from tornado.wsgi import WSGIContainer

from django.db import connection
from django.contrib import auth
from logging import info, debug
from django.conf import settings
from django.utils.importlib import import_module
from django.core.handlers.wsgi import WSGIRequest

class BaseWebSocketHandler(WebSocketHandler):

    def check_origin(self, origin):
        return True

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

    # Clean up after python-memcached

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

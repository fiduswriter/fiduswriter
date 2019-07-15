import base64

from builtins import object
from django.contrib import auth
from django.conf import settings
from django.core.handlers.wsgi import WSGIRequest
from importlib import import_module
from tornado.wsgi import WSGIContainer


class DjangoHandlerMixin(object):
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
        if user.is_authenticated:
            return user
        else:
            # try basic auth
            if 'Authorization' not in self.request.headers:
                return None
            (kind, data) = self.request.headers['Authorization'].split(' ')
            if kind != 'Basic':
                return None
            data += "=" * ((4 - len(data) % 4) % 4)
            (username, password) = base64.b64decode(
                data
            ).decode('utf-8').split(':')
            user = auth.authenticate(username=username, password=password)
            if user is not None and user.is_authenticated:
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

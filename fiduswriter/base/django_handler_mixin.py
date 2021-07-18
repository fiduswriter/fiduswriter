from builtins import object
from django.contrib import auth
from django.conf import settings
from importlib import import_module


class DjangoHandlerMixin(object):
    def get_django_session(self):
        if not hasattr(self, "_session"):
            engine = import_module(settings.SESSION_ENGINE)
            session_key = self.get_cookie(settings.SESSION_COOKIE_NAME)
            self._session = engine.SessionStore(session_key)
        return self._session

    def get_current_user(self):
        # get_user needs a django request object, but only looks at the session

        class Dummy(object):
            pass

        django_request = Dummy()
        django_request.session = self.get_django_session()
        return auth.get_user(django_request)

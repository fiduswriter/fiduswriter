from django.utils import translation
from django.utils.deprecation import MiddlewareMixin


class UserLanguageMiddleware(MiddlewareMixin):
    """
    Middleware to set user's preferred language
    """

    def process_request(self, request):
        if request.user.is_authenticated:
            # Set the user's preferred language
            translation.activate(request.user.language)
            request.session["django_language"] = request.user.language

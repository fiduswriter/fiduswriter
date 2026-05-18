from django.utils import translation
from asgiref.sync import iscoroutinefunction, markcoroutinefunction


class UserLanguageMiddleware:
    """
    Middleware to set user's preferred language
    """

    async_capable = True
    sync_capable = True

    def __init__(self, get_response):
        self.get_response = get_response
        if iscoroutinefunction(self.get_response):
            markcoroutinefunction(self)

    def __call__(self, request):
        self._process_request(request)
        return self.get_response(request)

    async def __acall__(self, request):
        self._process_request(request)
        return await self.get_response(request)

    def _process_request(self, request):
        if request.user.is_authenticated:
            # Set the user's preferred language
            translation.activate(request.user.language)
            # Only modify the session if the language is different to avoid
            # unnecessary session saves and race conditions with deleted sessions
            if request.session.get("django_language") != request.user.language:
                request.session["django_language"] = request.user.language

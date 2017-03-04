from tornado.web import RequestHandler, asynchronous, HTTPError
from tornado.httpclient import AsyncHTTPClient
from base.django_handler_mixin import DjangoHandlerMixin
from django.conf import settings

ALLOWED_DOMAINS = {
    'sowiportbeta.gesis.org':
        'api_key=' + settings.SOWIPORT_KEY if settings.SOWIPORT_KEY else True,
    'xisbn.worldcat.org': False,
    'www.worldcat.org':
        'wskey=' + settings.WORLDCAT_KEY if settings.WORLDCAT_KEY else True
}


class Proxy(DjangoHandlerMixin, RequestHandler):
    @asynchronous
    def get(self, url):
        user = self.get_current_user()
        domain = url.split('/')[2]
        if domain not in ALLOWED_DOMAINS or not user.is_authenticated():
            self.set_status(401)
            self.finish()
            return
        query = self.request.query
        api_key = ALLOWED_DOMAINS[domain]
        if api_key is not False:
            if api_key is True:
                # There is an API-key, but it is not defined. Return empty.
                self.set_status(200)
                self.finish()
                return
            if query:
                query = query + '&' + api_key
            else:
                query = api_key
        if query:
            url += '?' + query
        http = AsyncHTTPClient()
        http.fetch(
            url,
            method='GET',
            callback=self.on_response
        )

    # The response is asynchronous so that the getting of the data from the
    # remote server doesn't block the server connection.
    def on_response(self, response):
        if response.error:
            raise HTTPError(500)
        self.write(response.body)
        self.finish()

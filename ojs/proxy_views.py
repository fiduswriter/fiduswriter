from tornado.web import RequestHandler, asynchronous, HTTPError
from tornado.httpclient import AsyncHTTPClient
from tornado.httpclient import HTTPRequest
from tornado.httputil import url_concat
from base.django_handler_mixin import DjangoHandlerMixin
from tornado.escape import json_decode, json_encode

from .models import Journal

class OJSProxy(DjangoHandlerMixin, RequestHandler):
    @asynchronous
    def get(self, relative_url):
        user = self.get_current_user()
        if not user.is_authenticated():
            self.set_status(401)
            return
        if relative_url == 'journals':
            base_url = self.get_argument('url')
            key = self.get_argument('key')
        else:
            return
        plugin_path = '/index.php/index/gateway/plugin/RestApiGatewayPlugin/'
        url = base_url + plugin_path + relative_url
        http = AsyncHTTPClient()
        http.fetch(
            HTTPRequest(
                url_concat(url, {'key': key}),
                'GET'
            ),
            callback=self.on_response
        )

    @asynchronous
    def post(self, relative_url):
        user = self.get_current_user()
        if not user.is_authenticated():
            self.set_status(401)
            return
        if relative_url == 'articles':
            journal_id = self.get_argument('journal_id')
            journal = Journal.objects.get(ojs_jid=journal_id)
            key = journal.ojs_key
            base_url = journal.ojs_url
        else:
            return
        plugin_path = '/index.php/index/gateway/plugin/RestApiGatewayPlugin/'
        url = base_url + plugin_path + relative_url
        http = AsyncHTTPClient()
        http.fetch(
            HTTPRequest(
                url_concat(url, {'key': key}),
                'POST'
            ),
            callback=self.on_response,
            body = self.request.body
        )

    # The response is asynchronous so that the getting of the data from the OJS
    # server doesn't block the server connection.
    def on_response(self, response):
        if response.error:
            raise HTTPError(500)
        self.write(response.body)
        self.finish()

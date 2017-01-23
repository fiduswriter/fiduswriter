from tornado.web import RequestHandler, asynchronous, HTTPError
from tornado.httpclient import AsyncHTTPClient
#from tornado.escape import json_decode
from tornado.httpclient import HTTPRequest
from tornado.httputil import url_concat

class OJSProxy(RequestHandler):
    @asynchronous
    def get(self, relative_url):
        http = AsyncHTTPClient()
        plugin_path = '/index.php/index/gateway/plugin/RestApiGatewayPlugin/'
        if relative_url == 'journals':
            base_url = self.get_argument('url')
            key = self.get_argument('key')
        url = base_url + plugin_path + relative_url
        http.fetch(
            HTTPRequest(
                url_concat(url, {'key': key}),
                'GET'
            ),
            callback=self.on_response
        )

    # The response is asynchronous so that the getting of the data from the OJS
    # server doesn't block the server connection.
    def on_response(self, response):
        if response.error:
            raise HTTPError(500)
        self.write(response.body)
        self.finish()

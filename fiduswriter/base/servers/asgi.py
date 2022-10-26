# Source: https://github.com/plter/tornado_asgi_handler plter (MIT)

from tornado.web import RequestHandler

GLOBAL_CHARSET = "utf-8"


class AsgiHandler(RequestHandler):
    def initialize(self, asgi_app) -> None:
        super().initialize()
        self._asgi_app = asgi_app

    async def handle_request(self):
        headers = []
        for k in self.request.headers:
            for v in self.request.headers.get_list(k):
                headers.append(
                    (
                        k.encode(GLOBAL_CHARSET).lower(),
                        v.encode(GLOBAL_CHARSET),
                    )
                )

        scope = {
            "type": "http",
            "http_version": self.request.version,
            "path": self.request.path,
            "method": self.request.method,
            "query_string": self.request.query.encode(GLOBAL_CHARSET),
            "headers": headers,
            "client": (self.request.remote_ip, 0),
        }

        async def receive():
            return {
                "body": self.request.body,
                "type": "http.request",
                "more_body": False,
            }

        async def send(data):
            if data["type"] == "http.response.start":
                self.set_status(data["status"])
                self.clear_header("content-type")
                self.clear_header("server")
                self.clear_header("date")
                for h in data["headers"]:
                    if len(h) == 2:
                        self.add_header(
                            h[0].decode(GLOBAL_CHARSET),
                            h[1].decode(GLOBAL_CHARSET),
                        )
            elif data["type"] == "http.response.body":
                status = self.get_status()
                if status not in (204, 304) and "body" in data:
                    self.write(data["body"])
            else:
                raise RuntimeError(
                    f"Unsupported response type \"{data['type']}\" for asgi app"
                )

        await self._asgi_app(scope, receive, send)

    async def get(self):
        await self.handle_request()

    async def post(self):
        await self.handle_request()

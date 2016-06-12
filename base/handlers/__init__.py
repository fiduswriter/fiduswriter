from datetime import datetime, timedelta

from django.conf import settings

from tornado.web import RequestHandler, StaticFileHandler


class HelloHandler(RequestHandler):

    def head(self):
        self.finish()

    def get(self):
        self.write('Hello from tornado')


class RobotsHandler(RequestHandler):

    def head(self):
        self.finish()

    def get(self):
        self.write(
            (
                'User-agent: *\nDisallow: /document/\nDisallow: /bibliography/'
                '\nDisallow: /usermedia/\nDisallow: /book/'
            )
        )


class DjangoStaticFilesHandler(StaticFileHandler):

    def initialize(self, default_filename=None):
        super(DjangoStaticFilesHandler, self).initialize(None,
                                                         default_filename=None)

    def validate_absolute_path(self, root, absolute_path):
        return absolute_path

    def get_absolute_path(self, root, path):
        for finder in settings.STATICFILES_FINDERS:
            finderClass = self.get_class(finder)
            instance = finderClass()

            new_path = instance.find(path)
            if len(new_path) > 0:
                return new_path

    def get_class(self, kls):
        parts = kls.split('.')
        module = '.'.join(parts[:-1])
        m = __import__(module)
        for comp in parts[1:]:
            m = getattr(m, comp)
        return m

    def set_extra_headers(self, path):
        self.set_header('Cache-Control', 'no-cache, must-revalidate')
        self.set_header('Expires', '0')
        expiration = datetime.now() - timedelta(days=366)
        self.set_header('Last-Modified', expiration)

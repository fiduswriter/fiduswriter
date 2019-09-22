from django.apps import AppConfig


class DocumentConfig(AppConfig):
    name = 'document'

    def ready(self):
        import document.signals  # noqa

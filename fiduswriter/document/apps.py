from django.apps import AppConfig


class DocumentConfig(AppConfig):
    name = "document"
    default_auto_field = "django.db.models.AutoField"

    def ready(self):
        import document.signals  # noqa

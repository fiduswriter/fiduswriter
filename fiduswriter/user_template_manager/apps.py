from django.apps import AppConfig


class UserTemplateManagerConfig(AppConfig):
    name = 'user_template_manager'

    def ready(self):
        from document.models import DocumentTemplate
        # End user managers document templates, so do not attempt to delete
        # them automatically when not in use.
        DocumentTemplate.auto_delete = False

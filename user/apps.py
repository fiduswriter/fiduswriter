from django.apps import AppConfig


class UserConfig(AppConfig):
    name = 'user'

    def ready(self):
        pass

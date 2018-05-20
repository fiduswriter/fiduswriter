from __future__ import unicode_literals

from django.apps import AppConfig


class UserConfig(AppConfig):
    name = 'user'

    def ready(self):
        pass

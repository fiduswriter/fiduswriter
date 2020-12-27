import os
from django.conf import settings
from django.core.management.base import BaseCommand as DjangoBaseCommand

class BaseCommand(DjangoBaseCommand):
    def get_version(self):
        with open(
            os.path.join(
                settings.SRC_PATH,
                "version.txt"
            )
        ) as f:
            return f.read().splitlines()[0]

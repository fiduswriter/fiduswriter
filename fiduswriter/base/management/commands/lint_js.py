import shutil
import os
from subprocess import call

from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.conf import settings


class Command(BaseCommand):
    help = 'Check JavaScript files with ESLint'

    def handle(self, *args, **options):
        call_command("npm_install")
        shutil.os.chdir(settings.SRC_PATH)
        return_value = call([
            os.path.join(
                settings.PROJECT_PATH,
                ".transpile/node_modules/.bin/eslint"
            ),
            "."
        ])
        if return_value > 0:
            exit(return_value)

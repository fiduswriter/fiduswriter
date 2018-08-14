
import shutil
from subprocess import call

from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.conf import settings


class Command(BaseCommand):
    help = 'Check JavaScript files with JSHint'

    def handle(self, *args, **options):
        call_command("npm_install")
        shutil.os.chdir(settings.PROJECT_PATH)
        call(["npm", "run", "jshint"])

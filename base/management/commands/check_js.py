import shutil
from subprocess import call

from django.core.management.base import BaseCommand
from django.core.management import call_command
from fiduswriter.settings import PROJECT_PATH


class Command(BaseCommand):
    help = 'Check JavaScript files with JSHint'

    def handle(self, *args, **options):
        call_command("transpile")
        shutil.os.chdir(PROJECT_PATH)
        call(["npm", "run", "jshint"])

import shutil
from os import path
from subprocess import call

from django.core.management.base import BaseCommand
from django.core.management import call_command
from fiduswriter.settings import PROJECT_PATH


class Command(BaseCommand):
    help = 'Check JavaScript files with JSHint'
    requires_system_checks = False

    def handle(self, *args, **options):
        shutil.os.chdir(PROJECT_PATH)
        if not path.exists(
            path.join(
                PROJECT_PATH,
                "node_modules/.bin/jshint"
            )
        ):
            call_command("transpile")
        call(["npm", "run", "jshint"])

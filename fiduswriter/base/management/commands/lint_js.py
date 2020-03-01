import shutil
import os
from subprocess import call

from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.conf import settings


class Command(BaseCommand):
    help = 'Check JavaScript files with ESLint'

    def add_arguments(self, parser):
        parser.add_argument(
            '--fix',
            action='store_true',
            dest='fix',
            default=False,
            help='Whether to also attempt to fix files'
        )

    def handle(self, *args, **options):
        call_command("npm_install")
        shutil.os.chdir(settings.PROJECT_PATH)
        command_array = [
            os.path.join(
                settings.PROJECT_PATH,
                ".transpile/node_modules/.bin/eslint"
            ),
            "--ignore-path",
            os.path.join(
                settings.SRC_PATH,
                ".eslintignore"
            ),
            "-c",
            os.path.join(
                settings.SRC_PATH,
                ".eslintrc.js"
            ),
            "."
        ]
        if options['fix']:
            command_array.append('--fix')
        return_value = call(command_array)
        if return_value > 0:
            exit(return_value)

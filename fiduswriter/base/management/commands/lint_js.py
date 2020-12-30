import shutil
import os
import json
from subprocess import call

from django.apps import apps
from base.management import BaseCommand
from django.core.management import call_command
from django.conf import settings


class Command(BaseCommand):
    help = 'Check JavaScript files with ESLint'

    def add_arguments(self, parser):
        parser.add_argument(
            'dir',
            nargs='?',
            default='.',
            help='Directory to check'
        )
        parser.add_argument(
            '--fix',
            action='store_true',
            dest='fix',
            default=False,
            help='Whether to also attempt to fix files'
        )

    def handle(self, *args, **options):
        self.stdout.write("Linting JavaScript code...")
        call_command("npm_install")
        shutil.os.chdir(settings.PROJECT_PATH)
        apps_paths = []
        for app in list(apps.get_app_configs()):
            apps_paths.append(app.path)
        os.environ['DJANGO_APPS_PATHS'] = json.dumps(apps_paths)
        command_array = [
            os.path.join(
                settings.PROJECT_PATH,
                ".transpile/node_modules/.bin/eslint"
            ),
            "--max-warnings=0",
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
            options['dir'],
        ]
        if options['fix']:
            command_array.append('--fix')
        return_value = call(command_array)
        if return_value > 0:
            exit(return_value)

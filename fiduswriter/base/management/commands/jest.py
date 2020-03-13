import shutil
import os
from subprocess import call

from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.conf import settings


class Command(BaseCommand):
    help = 'Run jest unit tests.'

    def handle(self, *ars, **options):
        call_command('transpile')
        shutil.os.chdir(
            os.path.join(
                settings.PROJECT_PATH,
                '.transpile',
            )
        )
        command_array = [
            os.path.join(
                settings.PROJECT_PATH,
                ".transpile",
                "node_modules",
                ".bin",
                "jest"
            ),
            "--no-cache",
        ]
        return_value = call(command_array)
        if return_value > 0:
            exit(return_value)
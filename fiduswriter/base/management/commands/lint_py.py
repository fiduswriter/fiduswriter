import shutil
from subprocess import call
from django.core.management.base import BaseCommand
from django.conf import settings


class Command(BaseCommand):
    help = 'Check Python files for PEP8 compliance'

    def handle(self, *args, **options):
        shutil.os.chdir(settings.PROJECT_PATH)
        return_value = call([
            "flake8",
            "--exclude",
            "node_modules/*,*/migrations/*,venv/*,configuration.py",
            "./"
        ])
        if return_value > 0:
            exit(return_value)

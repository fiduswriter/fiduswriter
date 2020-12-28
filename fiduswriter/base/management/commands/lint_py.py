import shutil
from subprocess import call
from base.management import BaseCommand
from django.conf import settings


class Command(BaseCommand):
    help = 'Check Python files for PEP8 compliance'

    def handle(self, *args, **options):
        self.stdout.write("Linting Python code...")
        shutil.os.chdir(settings.PROJECT_PATH)
        return_value = call([
            "flake8",
            "--exclude",
            "node_modules/*,*/migrations/*,venv/*,.direnv/*,configuration.py",
            "./"
        ])
        if return_value > 0:
            exit(return_value)

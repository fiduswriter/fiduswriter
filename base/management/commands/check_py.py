from subprocess import call
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Check Python files for PEP8 compliance'

    def handle(self, *args, **options):
        return_value = call(["flake8", "./"])
        if return_value > 0:
            exit(return_value)

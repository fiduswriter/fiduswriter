from subprocess import call
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Check Python files for PEP8 compliance'

    def handle(self, *args, **options):
        call(["flake8", "./"])

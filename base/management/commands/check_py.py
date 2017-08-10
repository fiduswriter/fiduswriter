from subprocess import call
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Check Python files for PEP8 compliance'
    requires_system_checks = False

    def handle(self, *args, **options):
        call(["flake8", "./"])

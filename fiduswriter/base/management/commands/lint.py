from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.core.management.base import CommandError


class Command(BaseCommand):
    help = 'Lint JavaScript and Python files'

    def handle(self, *args, **options):
        try:
            call_command("lint_js")
        except CommandError:
            pass
        call_command("lint_py")

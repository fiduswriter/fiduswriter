from django.core.management.base import BaseCommand
from django.core.management import call_command


class Command(BaseCommand):
    help = 'Lint JavaScript and Python files'

    def handle(self, *args, **options):
        call_command("lint_js")
        call_command("lint_css")
        call_command("lint_py")

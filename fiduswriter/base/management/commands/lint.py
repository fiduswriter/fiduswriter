from base.management import BaseCommand
from django.core.management import call_command


class Command(BaseCommand):
    help = "Lint all source files"

    def add_arguments(self, parser):
        parser.add_argument(
            "--fix",
            action="store_true",
            dest="fix",
            default=False,
            help="Whether to also attempt to fix files",
        )

    def handle(self, *args, **options):
        fix = options["fix"]
        call_command("lint_js", fix=fix)
        call_command("lint_css", fix=fix)
        call_command("lint_py", fix=fix)

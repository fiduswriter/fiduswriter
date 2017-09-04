from django.core.management.base import BaseCommand
from django.core.management import call_command
import os
import shutil

from fiduswriter.settings import PROJECT_PATH


class Command(BaseCommand):
    help = ('Initialize Fidus Writer installation.')

    def add_arguments(self, parser):
        parser.add_argument(
            '--restart',
            action='store_true',
            dest='restart',
            default=False,
            help='Flush database before initialization.',
        )
        parser.add_argument(
            '--no-static',
            action='store_true',
            dest='no-static',
            default=False,
            help='Do not collect static files.',
        )
        parser.add_argument(
            '--no-compress',
            action='store_true',
            dest='no-compress',
            default=False,
            help='Do not attempt to compress static files.',
        )


    def handle(self, *args, **options):
        if options["restart"]:
            call_command("flush")
            call_command("migrate", fake=True)
        else:
            call_command("migrate")
        call_command("loaddata", "style/fixtures/initial_styles.json")
        call_command("loaddata", "base/fixtures/initial_terms.json")
        call_command(
            "loaddata",
            "document/fixtures/initial_export_templates.json")
        call_command("compilemessages")
        # Remove the es6 cache if it exists
        if os.path.exists(os.path.join(PROJECT_PATH, "es6-cache")):
            shutil.rmtree("es6-cache")
        call_command("transpile")
        if not options["no-compress"]:
            try:
                call_command("compress")
            except:
                pass
        if not options["no-static"]:
            call_command("collectstatic", interactive=False)

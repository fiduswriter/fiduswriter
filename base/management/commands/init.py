from django.core.management.base import BaseCommand
from django.core.management import call_command

from optparse import make_option

class Command(BaseCommand):
    args = '[restart]'
    help = 'Initialize Fidus Writer installation. If the argument "reset" is given, the database is flushed before initializing.'

    def handle(self, *args, **options):
        if "restart" in args:
            call_command("flush")
            call_command("migrate", fake=True)
        else:
            call_command("migrate")
        call_command("loaddata", "bibliography/fixtures/initial_bib_rules.json")
        call_command("create_bibliography_js")
        call_command("loaddata", "style/fixtures/initial_styles.json")
        call_command("create_document_styles")
        call_command("create_citation_styles")
        call_command("loaddata", "base/fixtures/initial_terms.json")
        call_command("compilemessages")
        call_command("transpile")
        try:
            call_command("compress")
        except:
            pass
        call_command("collectstatic", interactive=False)

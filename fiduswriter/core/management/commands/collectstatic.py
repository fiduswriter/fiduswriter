from django.core.management import call_command
from npm_mjs.management.commands.collectstatic import (
    Command as CollectStaticCommand
)


class Command(CollectStaticCommand):
    def handle(self, *args, **options):
        call_command("transpile")
        return super().handle(*args, **options)

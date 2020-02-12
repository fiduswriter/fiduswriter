import os
from django.core.management.commands.compilemessages import (
    Command as CompilemessagesCommand
)


class Command(CompilemessagesCommand):
    def handle(self, *args, **options):
        if os.environ.get('NO_COMPILEMESSAGES'):
            self.stdout.write(
                'Using packaged version. Skipping compile messages.'
            )
        else:
            return super().handle(*args, **options)

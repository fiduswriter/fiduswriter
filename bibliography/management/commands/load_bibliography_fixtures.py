from bibliography.models import (
    TexSpecialChar,
    EntryField,
    EntryType,
    EntryFieldAlias,
    EntryTypeAlias,
    LocalizationKey
)

from django.core.management.base import BaseCommand
from django.core.management import call_command


class Command(BaseCommand):
    help = 'Load bibliography fixtures into DB.'

    def handle(self, *args, **options):

        # delete all previous entries
        TexSpecialChar.objects.all().delete()
        EntryField.objects.all().delete()
        EntryType.objects.all().delete()
        EntryFieldAlias.objects.all().delete()
        EntryTypeAlias.objects.all().delete()
        LocalizationKey.objects.all().delete()

        call_command("loaddata", "initial_bib_rules.json")

from django.core.management import call_command
from django.core.management.commands import migrate
from django.db import connection
from django.db.utils import OperationalError
from django.contrib.contenttypes.models import ContentType
from base.management import BaseCommand


class Command(migrate.Command, BaseCommand):
    def handle(self, *args, **options):
        self.ensure_custom_user()
        return super().handle(*args, **options)

    def ensure_custom_user(self):
        try:
            ct = ContentType.objects.filter(
                app_label='auth',
                model='user'
            ).first()
            if ct:
                ct.app_label = 'user'
                ct.save()
        except OperationalError:
            # DB not yet initialized. Save to ignore
            pass

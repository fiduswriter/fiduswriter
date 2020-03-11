# code adapted by github.com/jobdiogenes from
# https://github.com/dkarchmer/aws-eb-docker-django/blob/master
# /authentication/manage
# used to help automation install like in docker.
# Create admins accounts if no users exists.
# Password 'admin' is used unless defined by ADMIN_PASSWORD
from django.conf import settings
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from os import getenv


class Command(BaseCommand):

    def handle(self, *args, **options):
        if User.objects.count() == 0:
            for user in settings.ADMINS:
                username = user[0].replace(' ', '')
                email = user[1]
                if getenv('ADMIN_PASSWORD') != '':
                    password = getenv('ADMIN_PASSWORD')
                else:
                    password = 'admin'
                print('Creating account for %s (%s)' % (username, email))
                admin = User.objects.create_superuser(
                    username=username,
                    email=email,
                    password=password
                )
                admin.is_active = True
                admin.is_admin = True
                admin.save()
        else:
            print(
                'Admin accounts can only be initialized if no Accounts exist'
            )

# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='TeamMember',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('roles', models.CharField(max_length=100, blank=True)),
                ('leader', models.ForeignKey(related_name=b'leader', to=settings.AUTH_USER_MODEL)),
                ('member', models.ForeignKey(related_name=b'member', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'account_teammember',
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='UserProfile',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('about', models.TextField(max_length=500, blank=True)),
                ('user', models.ForeignKey(to=settings.AUTH_USER_MODEL, unique=True)),
            ],
            options={
                'db_table': 'account_userprofile',
            },
            bases=(models.Model,),
        ),
        migrations.AlterUniqueTogether(
            name='teammember',
            unique_together=set([('leader', 'member')]),
        ),
    ]

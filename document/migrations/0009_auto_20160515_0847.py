# -*- coding: utf-8 -*-
# Generated by Django 1.9.5 on 2016-05-15 13:47
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('document', '0008_auto_20160515_0838'),
    ]

    operations = [
        migrations.AlterField(
            model_name='accessright',
            name='rights',
            field=models.CharField(choices=[(b'r', b'reader'), (b'w', b'author'), (b'e', b'editor'), (b'c', b'reviewer'), (b'o', b'comment_only')], max_length=7),
        ),
    ]

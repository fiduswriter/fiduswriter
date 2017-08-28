# -*- coding: utf-8 -*-
# Generated by Django 1.11.3 on 2017-08-13 21:54
from __future__ import unicode_literals

from django.db import migrations

def move_fields_to_user_image(apps, schema_editor):
    Image = apps.get_model('usermedia', 'Image')
    UserImage = apps.get_model('usermedia', 'UserImage')
    for image in Image.objects.all():
        user_image = UserImage(
            title=image.title,
            owner=image.owner,
            image_cat=image.image_cat,
            image=image
        )
        user_image.save()


class Migration(migrations.Migration):

    dependencies = [
        ('usermedia', '0005_userimage'),
    ]

    operations = [
        migrations.RunPython(move_fields_to_user_image),
    ]

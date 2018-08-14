# -*- coding: utf-8 -*-


from django.db import models, migrations
from django.conf import settings
import usermedia.models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Image',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('title', models.CharField(max_length=128)),
                ('added', models.DateTimeField(auto_now_add=True)),
                ('image', models.FileField(upload_to=usermedia.models.get_file_path)),
                ('thumbnail', models.ImageField(max_length=500, null=True, upload_to='image_thumbnails', blank=True)),
                ('image_cat', models.CharField(default='', max_length=255)),
                ('file_type', models.CharField(max_length=20, null=True, blank=True)),
                ('height', models.IntegerField(null=True, blank=True)),
                ('width', models.IntegerField(null=True, blank=True)),
                ('checksum', models.BigIntegerField(default=0, max_length=50)),
                ('uploader', models.ForeignKey(related_name='uploader', to=settings.AUTH_USER_MODEL)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='ImageCategory',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('category_title', models.CharField(max_length=100)),
                ('category_owner', models.ForeignKey(to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name_plural': 'Image categories',
            },
            bases=(models.Model,),
        ),
    ]

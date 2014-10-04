# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import style.models


class Migration(migrations.Migration):

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='CitationLocale',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('language_code', models.SlugField(help_text=b'language code of the locale file.', max_length=4)),
                ('contents', models.TextField(help_text=b'The XML style definiton.')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='CitationStyle',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('title', models.CharField(help_text=b'The human readable title.', max_length=128)),
                ('short_title', models.SlugField(help_text=b'A title used for constant names.', max_length=40)),
                ('contents', models.TextField(help_text=b'The XML style definiton.')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='DocumentFont',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('title', models.CharField(help_text=b'The human readable title.', max_length=128)),
                ('font_file', models.FileField(help_text=b'The font file.', upload_to=style.models.document_filename)),
                ('fontface_definition', models.TextField(help_text=b'The CSS definition of the font face (everything inside of @font-face{}). Add [URL] where the link to the font file is to appear.')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='DocumentStyle',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('title', models.CharField(help_text=b'The human readable title.', max_length=128)),
                ('filename', models.SlugField(help_text=b'The base of the filenames the style occupies.', max_length=20)),
                ('contents', models.TextField(help_text=b'The CSS style definiton.')),
                ('fonts', models.ManyToManyField(default=None, to='style.DocumentFont', null=True, blank=True)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
    ]

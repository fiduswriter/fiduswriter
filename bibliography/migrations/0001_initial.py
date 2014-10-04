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
            name='Entry',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('entry_key', models.CharField(max_length=64)),
                ('entry_cat', models.CharField(default=b'', max_length=255)),
                ('last_modified', models.DateTimeField(auto_now=True)),
                ('fields', models.TextField(default=b'{}')),
                ('entry_owner', models.ForeignKey(to=settings.AUTH_USER_MODEL)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='EntryCategory',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('category_title', models.CharField(max_length=100)),
                ('category_owner', models.ForeignKey(to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name_plural': 'Entry categories',
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='EntryField',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('field_name', models.CharField(unique=True, max_length=30)),
                ('biblatex', models.CharField(max_length=30)),
                ('csl', models.CharField(max_length=30, blank=True)),
                ('field_title', models.CharField(max_length=100)),
                ('field_type', models.CharField(default=b'l_name', max_length=30, choices=[(b'l_name', b'Name list'), (b'l_literal', b'Literal list'), (b'l_key', b'Key list'), (b'f_literal', b'Literal field'), (b'f_range', b'Range field'), (b'f_integer', b'Integer field'), (b'f_date', b'Date field'), (b'f_verbatim', b'Vervatim field'), (b'f_commaSeparatedValue', b'Comma-separated value field'), (b'f_pattern', b'Pattern field'), (b'f_key', b'Key field'), (b'f_code', b'Code field'), (b'f_uri', b'URI Field')])),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='EntryFieldAlias',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('field_name', models.CharField(unique=True, max_length=30)),
                ('field_alias', models.ForeignKey(to='bibliography.EntryField')),
            ],
            options={
                'verbose_name_plural': 'Entry field aliases',
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='EntryType',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('type_name', models.CharField(unique=True, max_length=30)),
                ('type_title', models.CharField(max_length=100)),
                ('type_order', models.IntegerField()),
                ('biblatex', models.CharField(max_length=30)),
                ('csl', models.CharField(max_length=30)),
                ('eitheror_fields', models.ManyToManyField(related_name=b'eitheror_fields', to='bibliography.EntryField')),
                ('optional_fields', models.ManyToManyField(related_name=b'optional_fields', to='bibliography.EntryField')),
                ('required_fields', models.ManyToManyField(related_name=b'required_fields', to='bibliography.EntryField')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='EntryTypeAlias',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('type_name', models.CharField(unique=True, max_length=30)),
                ('type_alias', models.ForeignKey(to='bibliography.EntryType')),
            ],
            options={
                'verbose_name_plural': 'Entry type aliases',
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='LocalizationKey',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('key_type', models.CharField(max_length=20)),
                ('key_name', models.CharField(max_length=20)),
                ('key_title', models.CharField(max_length=48)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='TexSpecialChar',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('tex', models.CharField(max_length=255)),
                ('unicode', models.CharField(max_length=20)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.AddField(
            model_name='entry',
            name='entry_type',
            field=models.ForeignKey(to='bibliography.EntryType'),
            preserve_default=True,
        ),
        migrations.AlterUniqueTogether(
            name='entry',
            unique_together=set([('entry_key', 'entry_owner')]),
        ),
    ]

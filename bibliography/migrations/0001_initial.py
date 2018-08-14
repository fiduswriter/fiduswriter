# -*- coding: utf-8 -*-


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
                ('entry_cat', models.CharField(default='', max_length=255)),
                ('last_modified', models.DateTimeField(auto_now=True)),
                ('fields', models.TextField(default='{}')),
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
                ('field_type', models.CharField(default='l_name', max_length=30, choices=[('l_name', 'Name list'), ('l_literal', 'Literal list'), ('l_key', 'Key list'), ('f_literal', 'Literal field'), ('f_range', 'Range field'), ('f_integer', 'Integer field'), ('f_date', 'Date field'), ('f_verbatim', 'Vervatim field'), ('f_commaSeparatedValue', 'Comma-separated value field'), ('f_pattern', 'Pattern field'), ('f_key', 'Key field'), ('f_code', 'Code field'), ('f_uri', 'URI Field')])),
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
                ('eitheror_fields', models.ManyToManyField(related_name='eitheror_fields', to='bibliography.EntryField')),
                ('optional_fields', models.ManyToManyField(related_name='optional_fields', to='bibliography.EntryField')),
                ('required_fields', models.ManyToManyField(related_name='required_fields', to='bibliography.EntryField')),
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

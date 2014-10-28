# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('document', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('usermedia', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Book',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('title', models.CharField(max_length=128)),
                ('metadata', models.TextField(default=b'{}')),
                ('settings', models.TextField(default=b'{}')),
                ('added', models.DateTimeField(auto_now_add=True)),
                ('updated', models.DateTimeField(auto_now_add=True)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='BookAccessRight',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('rights', models.CharField(max_length=1, choices=[(b'r', b'read'), (b'w', b'read/write')])),
                ('book', models.ForeignKey(to='book.Book')),
                ('user', models.ForeignKey(to=settings.AUTH_USER_MODEL)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Chapter',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('number', models.IntegerField()),
                ('part', models.CharField(default=b'', max_length=128, blank=True)),
                ('book', models.ForeignKey(to='book.Book')),
                ('text', models.ForeignKey(to='document.Document')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.AlterUniqueTogether(
            name='bookaccessright',
            unique_together=set([('book', 'user')]),
        ),
        migrations.AddField(
            model_name='book',
            name='chapters',
            field=models.ManyToManyField(to='document.Document', null=True, through='book.Chapter', blank=True),
            preserve_default=True,
        ),
        migrations.AlterField(
            model_name='book',
            name='chapters',
            field=models.ManyToManyField(default=None, to=b'document.Document', null=True, through='book.Chapter', blank=True),
        ),
        migrations.AddField(
            model_name='book',
            name='cover_image',
            field=models.ForeignKey(default=None, blank=True, to='usermedia.Image', null=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='book',
            name='owner',
            field=models.ForeignKey(to=settings.AUTH_USER_MODEL),
            preserve_default=True,
        ),
    ]

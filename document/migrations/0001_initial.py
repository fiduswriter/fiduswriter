# -*- coding: utf-8 -*-


from django.db import models, migrations
from django.conf import settings
import document.models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='AccessRight',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('rights', models.CharField(max_length=1, choices=[('r', 'read'), ('w', 'read/write')])),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Document',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('title', models.CharField(default='', max_length=255, blank=True)),
                ('contents', models.TextField(default='{"nn":"DIV","a":[],"c":[{"nn":"P","c":[{"nn":"BR"}]}]}')),
                ('metadata', models.TextField(default='{}')),
                ('settings', models.TextField(default='{}')),
                ('added', models.DateTimeField(auto_now_add=True)),
                ('updated', models.DateTimeField(auto_now=True)),
                ('owner', models.ForeignKey(related_name='owner', to=settings.AUTH_USER_MODEL)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='DocumentRevision',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('note', models.CharField(default='', max_length=255, blank=True)),
                ('date', models.DateTimeField(auto_now=True)),
                ('file_object', models.FileField(upload_to=document.models.revision_filename)),
                ('file_name', models.CharField(default='', max_length=255, blank=True)),
                ('document', models.ForeignKey(to='document.Document')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.AddField(
            model_name='accessright',
            name='document',
            field=models.ForeignKey(to='document.Document'),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='accessright',
            name='user',
            field=models.ForeignKey(to=settings.AUTH_USER_MODEL),
            preserve_default=True,
        ),
        migrations.AlterUniqueTogether(
            name='accessright',
            unique_together=set([('document', 'user')]),
        ),
    ]

# Generated by Django 2.1.2 on 2018-11-08 22:44

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('document', '0004_auto_20181108_2238'),
    ]

    operations = [
        migrations.AddField(
            model_name='document',
            name='template',
            field=models.ForeignKey(default=1, on_delete=django.db.models.deletion.CASCADE, to='document.DocumentTemplate'),
            preserve_default=False,
        ),
    ]

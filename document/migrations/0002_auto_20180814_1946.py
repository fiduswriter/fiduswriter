# Generated by Django 2.1 on 2018-08-14 19:46
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('document', '0001_squashed_0032_document_listed'),
    ]

    operations = [
        migrations.AlterField(
            model_name='document',
            name='doc_version',
            field=models.DecimalField(decimal_places=1, default=2.2, max_digits=3),
        ),
    ]

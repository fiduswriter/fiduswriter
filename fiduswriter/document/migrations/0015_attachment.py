# Generated by Django 2.2.4 on 2019-09-08 17:31

from django.db import migrations, models
import django.db.models.deletion
import document.models


class Migration(migrations.Migration):

    dependencies = [
        ('document', '0014_auto_20190811_1204'),
    ]

    operations = [
        migrations.CreateModel(
            name='Attachment',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('file', models.FileField(help_text='Attachment file of the document. The filename will be replaced with the final url of the file in the attached file.', upload_to=document.models.documentattachmentfile_location)),
                ('file_name', models.CharField(blank=True, default='', max_length=255)),
                ('date_uploaded', models.DateTimeField(auto_now_add=True, null=True)),
                ('document', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='document.Document')),
            ],
        ),
    ]

# Generated by Django 2.1.2 on 2018-11-08 22:36

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('style', '0001_squashed_0002_auto_20151226_1110'),
        ('document', '0003_auto_20181115_0926'),
    ]

    operations = [
        migrations.CreateModel(
            name='DocumentTemplate',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(blank=True, default='', max_length=255)),
                ('slug', models.SlugField()),
                ('definition', models.TextField(default='{"main": [], "footnote": {}}')),
                ('citation_styles', models.ManyToManyField(to='style.CitationStyle')),
                ('document_styles', models.ManyToManyField(to='style.DocumentStyle')),
                ('export_templates', models.ManyToManyField(to='document.ExportTemplate', blank=True)),
            ],
        ),
    ]

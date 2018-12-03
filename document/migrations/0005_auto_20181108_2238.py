# Generated by Django 2.1.2 on 2018-11-08 22:38

from django.db import migrations

def create_base_template(apps, schema_editor):
    DocumentTemplate = apps.get_model('document', 'DocumentTemplate')
    template = DocumentTemplate()
    template.slug = 'article'
    template.title = 'Standard Article'
    template.definition = '[{"type":"contributors","id":"authors","title":"Authors","help":"","initial":"","locking":"free","optional":"true_off","attrs":{"item_title":"Author"}},{"type":"richtext","id":"abstract","title":"Abstract","help":"","initial":"","locking":"free","optional":"true_off","attrs":{"elements":"paragraph heading figure table","marks":"strong emph highlight underline"}},{"type":"tags","id":"keywords","title":"Keywords","help":"","initial":"","locking":"free","optional":"true_off","attrs":{"item_title":"Keyword"}},{"type":"richtext","id":"body","title":"Body","help":"","initial":"","locking":"free","optional":"false","attrs":{"elements":"paragraph heading figure table","marks":"strong emph highlight underline"}}]'
    template.save()
    CitationStyle = apps.get_model('style', 'CitationStyle')
    for style in CitationStyle.objects.all():
        template.citation_styles.add(style)
    DocumentStyle = apps.get_model('style', 'DocumentStyle')
    for style in DocumentStyle.objects.all():
        template.document_styles.add(style)
    ExportTemplate = apps.get_model('document', 'ExportTemplate')
    for exporter in ExportTemplate.objects.all():
        template.export_templates.add(exporter)
    template.save()

def remove_base_template(apps, schema_editor):
    DocumentTemplate = apps.get_model('document', 'DocumentTemplate')
    template = DocumentTemplate.objects.filter(pk=1).first()
    if template:
        template.delete()

class Migration(migrations.Migration):

    dependencies = [
        ('document', '0004_documenttemplate'),
    ]

    operations = [
        migrations.RunPython(create_base_template, remove_base_template),
    ]

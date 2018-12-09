# Generated by Django 2.1.2 on 2018-11-08 22:38

from django.db import migrations

def create_base_template(apps, schema_editor):
    DocumentTemplate = apps.get_model('document', 'DocumentTemplate')
    template = DocumentTemplate()
    template.slug = 'article'
    template.title = 'Standard Article'
    template.definition = '[{"type":"heading","id":"subtitle","title":"Subtitle","locking":"free","optional":"true_off","attrs":{"elements":"heading1","marks":"strong emph highlight underline anchor"}},{"type":"contributors","id":"authors","title":"Authors","locking":"free","optional":"true_off","help":[{"type":"paragraph","content":[{"type":"text","text":"The "},{"type":"text","marks":[{"type":"strong"}],"text":"author"},{"type":"text","text":" of an article is the person who wrote it."}]}],"attrs":{"item_title":"Author"}},{"type":"richtext","id":"abstract","title":"Abstract","locking":"free","optional":"true_off","help":[{"type":"paragraph","content":[{"type":"text","text":"An "},{"type":"text","marks":[{"type":"strong"}],"text":"abstract"},{"type":"text","text":" of scientific article is a short summary. In many cases journals have very specific expectation son how the abstract should be structured."}]}],"initial":[{"type":"paragraph","attrs":{"track":[]},"content":[{"type":"text","marks":[{"type":"strong"}],"text":"Abstract: "}]}],"language":"true_off","attrs":{"elements":"paragraph heading figure ordered_list bullet_list horizontal_rule equation citation blockquote","marks":"strong emph highlight underline anchor"}},{"type":"tags","id":"keywords","title":"Keywords","locking":"free","optional":"true_off","attrs":{"item_title":"Keyword"}},{"type":"richtext","id":"body","title":"Body","locking":"free","optional":"false","help":[{"type":"paragraph","content":[{"type":"text","text":"The "},{"type":"text","marks":[{"type":"strong"}],"text":"body"},{"type":"text","text":" of a scientific article contains the main contents.This is where you should present your argument in detail."}]}],"attrs":{"elements":"paragraph heading figure ordered_list bullet_list horizontal_rule equation citation blockquote","marks":"strong emph highlight underline anchor"}}]'
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

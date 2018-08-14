# -*- coding: utf-8 -*-
# Set the bib_type based on the entry_type name ahead of removal of entry_type foreign key.


from django.db import migrations

def set_bib_type(apps, schema_editor):
    # We can't import the model directly as it may be a newer
    # version than this migration expects. We use the historical version.
    Entry = apps.get_model("bibliography", "Entry")
    for entry in Entry.objects.all():
        entry.bib_type = entry.entry_type.type_name
        entry.save()

class Migration(migrations.Migration):

    dependencies = [
        ('bibliography', '0002_entry_bib_type'),
    ]

    operations = [
        migrations.RunPython(set_bib_type),
    ]

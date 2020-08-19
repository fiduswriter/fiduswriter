from django.db import migrations, models


def text_to_json(apps, schema_editor):
    UserImage = apps.get_model('usermedia', 'UserImage')
    images = UserImage.objects.all()
    for image in images:
        image.cats = json.loads(image.image_cat)
        image.save()

def json_to_text(apps, schema_editor):
    UserImage = apps.get_model('usermedia', 'UserImage')
    images = UserImage.objects.all()
    for image in images:
        image.image_cat = json.dumps(image.cats)
        image.save()


class Migration(migrations.Migration):

    dependencies = [
        ('usermedia', '0004_auto_20200205_2347'),
    ]

    operations = [
        migrations.AddField(
            model_name='entry',
            name='cats',
            field=models.JSONField(default=list),
        ),
        migrations.AddField(
            model_name='entry',
            name='content',
            field=models.JSONField(default=dict),
        ),
        migrations.RunPython(text_to_json, json_to_text),
        migrations.RemoveField(
            model_name='bibliography',
            name='entry_cat',
        ),
        migrations.RemoveField(
            model_name='bibliography',
            name='fields',
        ),
    ]

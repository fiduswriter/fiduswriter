from django.db import transaction
from django.db.models.signals import post_delete
from django.dispatch import receiver

from .models import Document, DocumentRevision


@receiver(post_delete, sender=Document)
def delete_unused_template(sender, instance, **kwargs):
    if (
        instance.template.user
        and instance.template.document_set.count() == 0
        and instance.template.auto_delete
    ):
        # User's document template no longer used.
        instance.template.delete()


@receiver(post_delete, sender=DocumentRevision)
def delete_revision_file(sender, instance, **kwargs):
    name = instance.file_object.name
    if not name:
        return
    storage = instance.file_object.storage

    def remove_file():
        if storage.exists(name):
            storage.delete(name)

    # Only delete the file once the transaction that deleted the revision
    # has actually committed.
    transaction.on_commit(remove_file)

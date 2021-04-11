from django.db import models
from django.utils.translation import ugettext as _
from django.contrib.contenttypes.fields import GenericRelation
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    contacts = models.ManyToManyField("self", symmetrical=True)
    document_rights = GenericRelation(
        'document.AccessRight',
        content_type_field='holder_type',
        object_id_field='holder_id',
        related_query_name="user"
    )


class LoginAs(models.Model):

    class Meta:
        managed = False
        default_permissions = ()

        permissions = (
            ('can_login_as', _('Can login as another user')),
        )

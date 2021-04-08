from django.db import models
from django.conf import settings
from django.utils.translation import ugettext as _
from django.contrib.contenttypes.fields import GenericRelation


class UserProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.deletion.CASCADE
    )
    contacts = models.ManyToManyField("self", symmetrical=True)
    document_rights = GenericRelation(
        'document.AccessRight',
        content_type_field='holder_type',
        object_id_field='holder_id',
        related_query_name="holder"
    )

    def __str__(self):
        return self.user.__str__()


class LoginAs(models.Model):

    class Meta:
        managed = False
        default_permissions = ()

        permissions = (
            ('can_login_as', _('Can login as another user')),
        )

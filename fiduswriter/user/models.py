import uuid

from django.db import models
from django.utils.translation import ugettext as _
from django.contrib.contenttypes.fields import GenericRelation
from django.contrib.auth.models import AbstractUser
from django.core.files import File
from avatar.utils import get_default_avatar_url


def auto_avatar(username):
    hash = 0
    for ch in username:
        hash = ord(ch) + ((hash << 5) - hash)

    r = str((hash >> (0 * 8)) & 255)
    g = str((hash >> (1 * 8)) & 255)
    b = str((hash >> (2 * 8)) & 255)

    cl = 'rgb(' + r + ',' + g + ',' + b + ')'
    return {
        'url': get_default_avatar_url(),
        'uploaded': False,
        'html': (
            '<span class="fw-string-avatar" '
            'style="background-color: ' +
            cl +
            ';">' +
            '<span>' +
            username[0] +
            '</span></span>'
        )
    }


class User(AbstractUser):
    contacts = models.ManyToManyField("self", symmetrical=True)
    document_rights = GenericRelation(
        'document.AccessRight',
        content_type_field='holder_type',
        object_id_field='holder_id',
        related_query_name="user"
    )

    @property
    def avatar_url(self):
        size = 80
        # We use our own method to find the avatar to instead of
        # "get_primary_avatar" as this way we can minimize the reading from
        # disk and set a default thumbnail in case we could not create one.
        # See https://github.com/grantmcconnaughey/django-avatar/pull/187
        avatar = self.avatar_set.order_by("-primary", "-date_uploaded").first()
        if avatar:
            if not avatar.thumbnail_exists(size):
                avatar.create_thumbnail(size)
                # Now check if the thumbnail was actually created
                if not avatar.thumbnail_exists(size):
                    # Thumbnail was not saved. There must be some PIL bug
                    # with this image type. We store the original file instead.
                    avatar.avatar.storage.save(
                        avatar.avatar_name(size),
                        File(avatar.avatar.storage.open(
                            avatar.avatar.name,
                            'rb'
                        ))
                    )
            url = avatar.avatar_url(size)
            return {
                'url': url,
                'uploaded': True,
                'html': (
                    '<img class="fw-avatar" src="' +
                    url +
                    '" alt="' + self.username + '">'
                )
            }
        else:
            return auto_avatar(self.username)

    @property
    def readable_name(self):
        readable_name = self.get_full_name()
        if readable_name == '':
            readable_name = self.username
        return readable_name


class UserInvite(models.Model):
    key = models.UUIDField(
        unique=True,
        default=uuid.uuid4,
        editable=False,
    )
    email = models.EmailField(_('email address'))
    username = models.CharField(
        max_length=150,
    )
    by = models.ForeignKey(
        User,
        related_name='invites_by',
        on_delete=models.CASCADE,
    )
    to = models.ForeignKey(
        User,
        related_name='invites_to',
        on_delete=models.CASCADE,
        blank=True,
        null=True
    )
    document_rights = GenericRelation(
        'document.AccessRight',
        content_type_field='holder_type',
        object_id_field='holder_id',
        related_query_name="userinvite"
    )

    @property
    def avatar_url(self):
        return auto_avatar(self.username)

    @property
    def readable_name(self):
        return self.username

    def get_absolute_url(self):
        return "/contacts/%i/" % self.key


class LoginAs(models.Model):

    class Meta:
        managed = False
        default_permissions = ()

        permissions = (
            ('can_login_as', _('Can login as another user')),
        )

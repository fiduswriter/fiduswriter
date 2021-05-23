from django.db import models
from django.utils.translation import ugettext as _
from django.contrib.contenttypes.fields import GenericRelation
from django.contrib.auth.models import AbstractUser
from django.core.files import File
from avatar.utils import get_default_avatar_url


def string_to_color(username):
    hash = 0
    for ch in username:
        hash = ord(ch) + ((hash << 5) - hash)

    r = str((hash >> (0 * 8)) & 255)
    g = str((hash >> (1 * 8)) & 255)
    b = str((hash >> (2 * 8)) & 255)

    return 'rgb(' + r + ',' + g + ',' + b + ')'


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
        # disk and set a default thumbnail in case we could not create on.
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
            cl = string_to_color(self.username)
            return {
                'url': get_default_avatar_url(),
                'uploaded': False,
                'html': (
                    '<span class="fw-string-avatar" '
                    'style="background-color: ' +
                    cl +
                    ';">' +
                    '<span>' +
                    self.username[0] +
                    '</span></span>'
                )
            }

    @property
    def readable_name(self):
        readable_name = self.get_full_name()
        if readable_name == '':
            readable_name = self.username
        return readable_name


class LoginAs(models.Model):

    class Meta:
        managed = False
        default_permissions = ()

        permissions = (
            ('can_login_as', _('Can login as another user')),
        )

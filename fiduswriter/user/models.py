import uuid

from django.db import models
from django.utils.translation import ugettext as _
from django.contrib.contenttypes.fields import GenericRelation
from django.contrib.auth.models import AbstractUser
from django.core.files import File
from avatar.utils import get_default_avatar_url

from document.models import AccessRight


def auto_avatar(username):
    hash = 0
    for ch in username:
        hash = ord(ch) + ((hash << 5) - hash)

    r = str((hash >> (0 * 8)) & 255)
    g = str((hash >> (1 * 8)) & 255)
    b = str((hash >> (2 * 8)) & 255)

    cl = f"rgb({r},{g},{b})"
    return {
        "url": get_default_avatar_url(),
        "uploaded": False,
        "html": (
            f'<span class="fw-string-avatar" style="background-color: {cl};">'
            f"<span>{username[0]}</span>"
            "</span>"
        ),
    }


class User(AbstractUser):
    contacts = models.ManyToManyField("self", symmetrical=True)
    document_rights = GenericRelation(
        "document.AccessRight",
        content_type_field="holder_type",
        object_id_field="holder_id",
        related_query_name="user",
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
                        File(
                            avatar.avatar.storage.open(
                                avatar.avatar.name, "rb"
                            )
                        ),
                    )
            url = avatar.avatar_url(size)
            return {
                "url": url,
                "uploaded": True,
                "html": (
                    f'<img class="fw-avatar" src="{url}" '
                    f'alt="{self.username}">'
                ),
            }
        else:
            return auto_avatar(self.username)

    @property
    def readable_name(self):
        readable_name = self.get_full_name()
        if readable_name == "":
            readable_name = self.username
        return readable_name


class UserInvite(models.Model):
    key = models.UUIDField(
        unique=True,
        default=uuid.uuid4,
    )
    email = models.EmailField(_("email address"))
    username = models.CharField(
        max_length=150,
    )
    by = models.ForeignKey(
        User,
        related_name="invites_by",
        on_delete=models.CASCADE,
    )
    to = models.ForeignKey(
        User,
        related_name="invites_to",
        on_delete=models.CASCADE,
        blank=True,
        null=True,
    )
    document_rights = GenericRelation(
        "document.AccessRight",
        content_type_field="holder_type",
        object_id_field="holder_id",
        related_query_name="userinvite",
    )
    _apply = False

    @property
    def avatar_url(self):
        return auto_avatar(self.username)

    @property
    def readable_name(self):
        return self.username

    def get_relative_url(self):
        return "/invite/%s/" % self.key

    def apply(self):
        if not self.to:
            # Cannot apply
            return
        for right in self.document_rights.all():
            old_ar = AccessRight.objects.filter(
                user=self.to, document=right.document
            ).first()
            if old_ar:
                # If the user already has rights, we should only be upgrading
                # them, not downgrade. Unfortuantely it is not easy to
                # say how each right compares. So unless the invite gives read
                # access, or the user already has write access, we change to
                # the access right of the invite.
                if right.rights == "read":
                    pass
                elif old_ar.rights == "write":
                    pass
                else:
                    old_ar.rights = right.rights
                    old_ar.save()
            elif right.document.owner == self.to:
                pass
            else:
                right.holder_obj = self.to
                right.save()
        if self.to not in list(self.by.contacts.all()):
            self.by.contacts.add(self.to)
        self._apply = True
        self.delete()


class LoginAs(models.Model):
    class Meta:
        managed = False
        default_permissions = ()

        permissions = (("can_login_as", _("Can login as another user")),)

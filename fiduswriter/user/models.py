import uuid

from django.db import models, transaction
from django.utils.translation import gettext as _
from django.contrib.contenttypes.fields import GenericRelation
from django.contrib.contenttypes.models import ContentType
from django.contrib.auth.models import AbstractUser
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
    contacts = models.ManyToManyField("self", blank=True, symmetrical=True)
    document_rights = GenericRelation(
        "document.AccessRight",
        content_type_field="holder_type",
        object_id_field="holder_id",
        related_query_name="user",
    )
    language = models.CharField(
        max_length=10,
        choices=[
            ("en", "English"),
            ("bg", "Bulgarian"),
            ("de", "German"),
            ("fr", "French"),
            ("it", "Italian"),
            ("es", "Spanish"),
            ("pt-br", "Portuguese (Brazil)"),
        ],
        default=None,
        help_text=_("Interface language preference"),
        blank=True,
        null=True,
    )

    @property
    def readable_name(self):
        readable_name = self.get_full_name()
        if readable_name == "":
            readable_name = self.username
        return readable_name

    class Meta:
        permissions = (("can_login_as", _("Can login as another user")),)


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
        if not self.to.id:
            # User must have a valid ID before we can apply
            return

        # Refresh the user from database to ensure it's in a valid state
        self.to.refresh_from_db()

        user_ct = ContentType.objects.get_for_model(User)
        rights_to_transfer = []

        # Use atomic transaction to ensure database consistency
        with transaction.atomic():
            # Evaluate QuerySet upfront to avoid issues with lazy evaluation during modification
            for right in list(self.document_rights.all()):
                # Check if the user already has access rights for this document
                # using explicit ContentType filter to avoid GenericRelation issues
                old_ar = AccessRight.objects.filter(
                    holder_type=user_ct,
                    holder_id=self.to.id,
                    document=right.document,
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
                    # Delete the invite's access right since user already has one
                    right.delete()
                elif right.document.owner == self.to:
                    # User already owns the document, delete the redundant access right
                    right.delete()
                else:
                    # Save info about rights to transfer (use IDs to avoid stale references)
                    rights_to_transfer.append(
                        {
                            "document_id": right.document_id,
                            "path": right.path,
                            "rights": right.rights,
                        }
                    )
                    # Delete the old access right from the invite
                    right.delete()

            # After all old rights are deleted, create new ones for the user
            for right_info in rights_to_transfer:
                # Create the access right with explicit holder_type and holder_id
                # instead of using holder_obj to avoid GenericForeignKey issues
                AccessRight.objects.create(
                    document_id=right_info["document_id"],
                    path=right_info["path"],
                    holder_type=user_ct,
                    holder_id=self.to.id,
                    rights=right_info["rights"],
                )

            if self.to not in list(self.by.contacts.all()):
                self.by.contacts.add(self.to)
            self._apply = True

            # Ensure ALL AccessRights pointing to this UserInvite are deleted
            # before we delete the invite itself to avoid FK constraint issues
            userinvite_ct = ContentType.objects.get_for_model(UserInvite)
            remaining_rights = AccessRight.objects.filter(
                holder_type=userinvite_ct, holder_id=self.id
            )
            remaining_rights.delete()

            self.delete()

    def __str__(self):
        return f"{self.to or self.username} by {self.by}"

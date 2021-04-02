from django.db import models
from django.contrib.auth.models import User
from django.utils.translation import ugettext as _


class UserProfile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.deletion.CASCADE
    )
    contacts = models.ManyToManyField("self", symmetrical=True)

    def __str__(self):
        return self.user.__str__()


User.profile = property(lambda u: UserProfile.objects.get_or_create(user=u)[0])


class LoginAs(models.Model):

    class Meta:
        managed = False
        default_permissions = ()

        permissions = (
            ('can_login_as', _('Can login as another user')),
        )


def get_readable_name(user):
    readable_name = user.get_full_name()
    if readable_name == '':
        readable_name = user.username
    return readable_name


User.readable_name = property(lambda u: get_readable_name(u))

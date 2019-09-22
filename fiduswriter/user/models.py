from builtins import object
from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.deletion.CASCADE
    )
    about = models.TextField(max_length=500, blank=True)


User.profile = property(lambda u: UserProfile.objects.get_or_create(user=u)[0])


def get_readable_name(user):
    readable_name = user.get_full_name()
    if readable_name == '':
        readable_name = user.username
    return readable_name


User.readable_name = property(lambda u: get_readable_name(u))


# Anyone can define anyone as a team member without approval from that person.
# This works in only one direction. Team leaders are the owners of their
# documents, and the same user can be a Team member on the document of someone
# else.
# Students/academics helping oneanother with their writings with shifting
# responsibilities are the use case in mind here.
# Roles are stored as a comma separated list as a CharField


class TeamMember(models.Model):
    leader = models.ForeignKey(
        User,
        related_name='leader',
        on_delete=models.deletion.CASCADE
    )
    member = models.ForeignKey(
        User,
        related_name='member',
        on_delete=models.deletion.CASCADE
    )
    roles = models.CharField(max_length=100, blank=True)

    class Meta(object):
        unique_together = (("leader", "member"),)

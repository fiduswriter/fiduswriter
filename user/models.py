#
# This file is part of Fidus Writer <http://www.fiduswriter.org>
#
# Copyright (C) 2013 Takuto Kojima, Johannes Wilm
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as
# published by the Free Software Foundation, either version 3 of the
# License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.

from django.db import models
from django.contrib.auth.models import User

class UserProfile(models.Model):
    user = models.OneToOneField(User)
    about = models.TextField(max_length=500, blank=True)

User.profile = property(lambda u: UserProfile.objects.get_or_create(user=u)[0])

def get_readable_name(user):
    readable_name = user.get_full_name()
    if readable_name == u'':
        readable_name = user.username
    return readable_name

User.readable_name = property(lambda u: get_readable_name(u))


# Anyone can define anyone as a team member without approval from that person.
# This works in only one direction. Team leaders are the owners of their documents,
# and the same user can be a Team member on the document of someone else.
# Students/academics helping oneanother with their writings with shifting
# responsibilities are the use case in mind here.
# Roles are stored as a comma separated list as a CharField


class TeamMember(models.Model):
    leader = models.ForeignKey(User, related_name='leader')
    member = models.ForeignKey(User, related_name='member')
    roles = models.CharField(max_length=100, blank=True)

    class Meta:
        unique_together = (("leader", "member"),)

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
from django.core.mail import send_mail
from django.conf import settings


class Feedback(models.Model):
    message = models.TextField()

    owner = models.ForeignKey(User, blank=True, null=True)

    def __unicode__(self):
        if self.owner:
            return self.owner.username + ': ' + self.message
        else:
            return 'Anonymous: ' + self.message

    def save(self, *args, **kwargs):
        reply_to = ''
        if self.owner:
            from_sender = self.owner.username
            if self.owner.email and self.owner.email:
                reply_to = ' (' + self.owner.email + ')'
        else:
            from_sender = 'Anonymous'
        send_mail('Feedback from ' + from_sender + reply_to,
                  self.message,
                  settings.DEFAULT_FROM_EMAIL,
                  [settings.SERVER_INFO['CONTACT_EMAIL']],
                  fail_silently=True)
        super(Feedback, self).save(*args, **kwargs)

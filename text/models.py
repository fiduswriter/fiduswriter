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
from django.utils import timezone

from datetime import timedelta

from fiduswriter.settings import LOCK_TIMEOUT

MAX_SINCE_SAVE=timedelta(seconds=LOCK_TIMEOUT)

class Text(models.Model):
    title = models.TextField(blank=True)
    contents = models.TextField()
    metadata = models.TextField(default='{}') #json object of metadata besides the title
    comments = models.TextField(default='[]') #json list of comments
    settings = models.TextField(default='{}') #json object of settings
    history = models.TextField(default='[]') #json list with the document history
    owner = models.ForeignKey(User,related_name='owner')
    added = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    
    # The following is needed for locking texts
    last_editor = models.ForeignKey(User,related_name='last_editor')
    last_accessed = models.DateTimeField(auto_now=True,default=timezone.now())
    currently_open = models.BooleanField(default=True)
    # last_accessed is slightly different than updated, as it will be updated
    # even when the model is saved without any changes to title or contents.

    def __unicode__(self):
        return self.title
    
    def get_absolute_url(self):
        return "/text/%i/" % self.id
    
    def is_locked(self):
        if self.currently_open == False:
            return False
        if timezone.now() - self.last_accessed < MAX_SINCE_SAVE:
            return True
        else:
            return False
            
    def is_locked_for(self, user):
        if self.is_locked():
            if self.last_editor!=user:
                return True
        return False
        

RIGHTS_CHOICES  = (
    ('r', 'read'),
    ('w', 'read/write'),
)

class AccessRight(models.Model):
    text = models.ForeignKey(Text)
    user = models.ForeignKey(User)
    rights = models.CharField(max_length=1, choices=RIGHTS_CHOICES, blank=False)
    
    class Meta:
        unique_together = (("text", "user"),)

    def __unicode__(self):
        return self.user.readable_name+' ('+self.rights+') on '+self.text.title
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
    title = models.CharField(max_length=255, default='', blank=True)
    contents = models.TextField(default='<p><br></p>')
    metadata = models.TextField(default='{}') #json object of metadata
    settings = models.TextField(default='{}') #json object of settings
#    history = models.TextField(default='') #json list with the document history with the beginning and end brackets ('[' and ']') left out. 
    owner = models.ForeignKey(User,related_name='owner')
    added = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    def __unicode__(self):
        return self.title
    
    def get_absolute_url(self):
        return "/text/%i/" % self.id
        

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
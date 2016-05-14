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
from django.core.exceptions import ObjectDoesNotExist
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

from datetime import timedelta

from fiduswriter.settings import LOCK_TIMEOUT

MAX_SINCE_SAVE=timedelta(seconds=LOCK_TIMEOUT)

class Document(models.Model):
    title = models.CharField(max_length=255, default='', blank=True)
    contents = models.TextField(default='{"nn":"DIV","a":[],"c":[{"nn":"P","c":[]}]}')
    metadata = models.TextField(default='{}') #json object of metadata
    version = models.PositiveIntegerField(default=0)
    # The version number corresponds to the last full HTML/JSON copy of the
    # document that was sent in by a browser. Such full copies are sent in every
    # 2 minutes automatically or when specific actions are executed by the user
    # (such as exporting the document).
    last_diffs = models.TextField(default='[]')
    # The last few diffs that were received and approved. The number of stored
    # diffs should always be equivalent to or more than all the diffs since the
    # last full save of the document.
    diff_version = models.PositiveIntegerField(default=0)
    # The diff version is the latest version for which diffs have been accepted.
    # This version should always be the same or higher than the version attribute.
    # To obtain the very last approved version of the document, one needs to take
    # the HTML/JSON version of the document (in the fields title, contents,
    # metadata and version) and apply N of the last last_diffs, where N is
    # diff_version - version.
    settings = models.TextField(default='{}') #json object of settings
    owner = models.ForeignKey(User,related_name='owner')
    added = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    comments = models.TextField(default='{}')
    comment_version = models.PositiveIntegerField(default=0)

    def __unicode__(self):
        return self.title

    def get_absolute_url(self):
        return "/document/%i/" % self.id

RIGHTS_CHOICES  = (
    ('r', 'reader'),
    ('w', 'author'),
    ('e', 'editor'),
    ('c', 'reviewer'),
    ('o', 'comment_only')
)

#Editor and Reviewer can only comment and not edit document
COMMENT_ONLY = ('e','c', 'o')

CAN_UPDATE_DOCUMENT = ['w', 'e', 'c', 'o']

#TODO: AccessRights - EMPTY. add when create document
class AccessRight(models.Model):
    document = models.ForeignKey(Document)
    user = models.ForeignKey(User)
    rights = models.CharField(max_length=1, choices=RIGHTS_CHOICES, blank=False)

    class Meta:
        unique_together = (("document", "user"),)

    #def __unicode__(self):
     #   return self.user.username+' ('+self.rights+') on '+self.document.title
        #return self.user.readable_name+' ('+self.rights+') on '+self.document.title

def revision_filename(instance, filename):
    return '/'.join(['revision', str(instance.document.id), filename])

class DocumentRevision(models.Model):
    document = models.ForeignKey(Document)
    note = models.CharField(max_length=255, default='', blank=True)
    date = models.DateTimeField(auto_now=True)
    file_object = models.FileField(upload_to=revision_filename)
    file_name = models.CharField(max_length=255, default='', blank=True)

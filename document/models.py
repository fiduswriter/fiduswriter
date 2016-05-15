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
    ('read', 'Reader'),
    ('write', 'Writer'),
    ('edit', 'Editor'), # Editor as in "Editor of Journal X"
    ('review', 'Reviewer'),
    ('comment', 'Commentator')
)

#Editor and Reviewer can only comment and not edit document
COMMENT_ONLY = ('edit','review', 'comment')

CAN_UPDATE_DOCUMENT = ['write', 'edit', 'review', 'comment']

class AccessRight(models.Model):
    document = models.ForeignKey(Document)
    user = models.ForeignKey(User)
    rights = models.CharField(max_length=7, choices=RIGHTS_CHOICES, blank=False)

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

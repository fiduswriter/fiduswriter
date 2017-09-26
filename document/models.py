from django.db import models
from django.contrib.auth.models import User

from datetime import timedelta

from fiduswriter.settings import LOCK_TIMEOUT

MAX_SINCE_SAVE = timedelta(seconds=LOCK_TIMEOUT)


class Document(models.Model):
    title = models.CharField(max_length=255, default='', blank=True)
    contents = models.TextField(default='{}')  # json object of content
    metadata = models.TextField(default='{}')  # json object of metadata
    settings = models.TextField(default='{"doc_version":1.2}')
    # json object of settings
    # The doc_version is the version of the data format in the other fields
    # (mainly metadata and contents).
    version = models.PositiveIntegerField(default=0)
    # The version number corresponds to the last full HTML/JSON copy of the
    # document that was sent in by a browser. Such full copies are sent in
    # every 2 minutes automatically or when specific actions are executed by
    # the user (such as exporting the document).
    last_diffs = models.TextField(default='[]')
    # The last few diffs that were received and approved. The number of stored
    # diffs should always be equivalent to or more than all the diffs since the
    # last full save of the document.
    diff_version = models.PositiveIntegerField(default=0)
    # The diff version is the latest version for which diffs have been
    # accepted. This version should always be the same or higher than the
    # version attribute.
    # To obtain the very last approved version of the document, one needs to
    # take the HTML/JSON version of the document (in the fields title,
    # contents, metadata and version) and apply N of the last last_diffs, where
    # N is diff_version - version.
    owner = models.ForeignKey(User, related_name='owner')
    added = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    comments = models.TextField(default='{}')
    comment_version = models.PositiveIntegerField(default=0)

    def __unicode__(self):
        if len(self.title) > 0:
            return self.title + ' (' + str(self.id) + ')'
        else:
            return str(self.id)

    def get_absolute_url(self):
        return "/document/%i/" % self.id

RIGHTS_CHOICES = (
    ('read', 'Reader'),
    ('read-without-comments', 'Reader without comment access'),
    # Can read the text, but not the comments.
    ('write', 'Writer'),
    ('review', 'Reviewer'),
    ('comment', 'Commentator'),
    ('edit', 'Editor'),
    # Editor as in "Editor of Journal X"
)

# Editor and Reviewer can only comment and not edit document
COMMENT_ONLY = ('edit', 'review', 'comment')

CAN_UPDATE_DOCUMENT = ['write', 'edit', 'review', 'comment']

# Whether the collaborator is allowed to know about other collaborators
# and communicate with them.
CAN_COMMUNICATE = ['read', 'write', 'comment']


class AccessRight(models.Model):
    document = models.ForeignKey(Document)
    user = models.ForeignKey(User)
    rights = models.CharField(
        max_length=21,
        choices=RIGHTS_CHOICES,
        blank=False)

    class Meta:
        unique_together = (("document", "user"),)

    def __unicode__(self):
        return (
            '%(name)s %(rights)s on %(doc_id)d' %
            {
                'name': self.user.readable_name,
                'rights': self.rights,
                'doc_id': self.document.id
            }
        )


def revision_filename(instance, filename):
    return '/'.join(['revision', str(instance.document.id), filename])


class DocumentRevision(models.Model):
    document = models.ForeignKey(Document)
    note = models.CharField(max_length=255, default='', blank=True)
    date = models.DateTimeField(auto_now=True)
    file_object = models.FileField(upload_to=revision_filename)
    file_name = models.CharField(max_length=255, default='', blank=True)

    def __unicode__(self):
        if len(self.note) > 0:
            return self.note + ' (' + str(self.id) + ') of ' + \
                str(self.document.id)
        else:
            return str(self.id) + ' of ' + str(self.document.id)

TEMPLATE_CHOICES = (
    ('docx', 'Docx'),
    ('odt', 'ODT')
)


def template_filename(instance, filename):
    return '/'.join(['export-templates', filename])


class ExportTemplate(models.Model):
    file_name = models.CharField(max_length=255, default='', blank=True)
    file_type = models.CharField(
        max_length=5,
        choices=TEMPLATE_CHOICES,
        blank=False)
    template_file = models.FileField(upload_to=template_filename)

    class Meta:
        unique_together = (("file_name", "file_type"),)

    def __unicode__(self):
        return self.file_name + " (" + self.file_type + ")"

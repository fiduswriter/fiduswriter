from django.db import models
from django.db.utils import OperationalError
from django.contrib.auth.models import User
from django.core import checks

# FW_DOCUMENT_VERSION: See also FW_FILETYPE_VERSION specified in export
# (same value from >= 2.0) in
# document/static/js/es6_modules/documents/exporter/native/zip.js

FW_DOCUMENT_VERSION = 2.0


class Document(models.Model):
    title = models.CharField(max_length=255, default='', blank=True)
    contents = models.TextField(default='{}')  # json object of content
    doc_version = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        default=FW_DOCUMENT_VERSION
    )
    # The doc_version is the version of the data format in the contents field.
    # We upgrade the contents field in JavaScript and not migrations so that
    # the same code can be used for migrations and for importing old fidus
    # files that are being uploaded. This field is only used for upgrading data
    # and is therefore not handed to the editor or document overview page.
    version = models.PositiveIntegerField(default=0)
    last_diffs = models.TextField(default='[]')
    # The last few diffs that were received and approved. The number of stored
    # diffs should always be equivalent to or more than all the diffs since the
    # last full save of the document.
    owner = models.ForeignKey(User, related_name='owner')
    added = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    comments = models.TextField(default='{}')
    bibliography = models.TextField(default='{}')

    def __unicode__(self):
        if len(self.title) > 0:
            return self.title + ' (' + str(self.id) + ')'
        else:
            return str(self.id)

    class Meta:
        ordering = ['-id']

    def get_absolute_url(self):
        return "/document/%i/" % self.id

    @classmethod
    def check(cls, **kwargs):
        errors = super(Document, cls).check(**kwargs)
        errors.extend(cls._check_doc_versions(**kwargs))
        return errors

    @classmethod
    def _check_doc_versions(cls, **kwargs):
        try:
            if len(cls.objects.filter(doc_version__lt=FW_DOCUMENT_VERSION)):
                return [
                    checks.Warning(
                        'Documents need to be upgraded. Please navigate to '
                        '/admin/maintenance/ with a browser as a superuser '
                        'and upgrade all documents on this server.',
                        obj=cls
                    )
                ]
            else:
                return []
        except OperationalError:
            # Database has not yet been initialized, so don't throw any error.
            return []

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
            return str(self.id) + ' of ' + self.document.id

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

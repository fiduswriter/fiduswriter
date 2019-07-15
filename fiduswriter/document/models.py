import uuid

from builtins import str
from builtins import object

from django.db import models
from django.db.utils import OperationalError, ProgrammingError
from django.contrib.auth.models import User
from django.utils.translation import ugettext as _
from django.core import checks
from django.db.models.signals import post_delete
from django.dispatch import receiver

from style.models import DocumentStyle, CitationStyle

from django.conf import settings

# FW_DOCUMENT_VERSION:
# Also defined in frontend
# document/static/js/modules/schema/index.js

FW_DOCUMENT_VERSION = 3.0

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

    class Meta(object):
        unique_together = (("file_name", "file_type"),)

    def __str__(self):
        return self.file_name + " (" + self.file_type + ")"


class DocumentTemplate(models.Model):
    title = models.CharField(max_length=255, default='', blank=True)
    definition = models.TextField(default='{}')
    doc_version = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        default=FW_DOCUMENT_VERSION
    )
    definition_hash = models.CharField(max_length=22, default='', blank=True)
    document_styles = models.ManyToManyField(DocumentStyle)
    citation_styles = models.ManyToManyField(CitationStyle)
    export_templates = models.ManyToManyField(ExportTemplate, blank=True)
    user = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.deletion.CASCADE
    )

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        super(DocumentTemplate, self).save(*args, **kwargs)
        if self.citation_styles.count() == 0:
            style, created = CitationStyle.objects.get_or_create(
                short_title='default'
            )
            self.citation_styles.add(style)
        # TODO: add a field to classify document styles by used fields
        if self.document_styles.count() == 0:
            style, created = DocumentStyle.objects.get_or_create(
                filename='default'
            )
            self.document_styles.add(style)

    @classmethod
    def check(cls, **kwargs):
        errors = super(DocumentTemplate, cls).check(**kwargs)
        errors.extend(cls._check_doc_versions(**kwargs))
        return errors

    @classmethod
    def _check_doc_versions(cls, **kwargs):
        try:
            if len(
                cls.objects.filter(doc_version__lt=str(FW_DOCUMENT_VERSION))
            ):
                return [
                    checks.Warning(
                        'Document templates need to be upgraded. Please '
                        'navigate to /admin/document/document/maintenance/ '
                        'with a browser as a superuser and upgrade all '
                        'document templates on this server.',
                        obj=cls
                    )
                ]
            else:
                return []
        except (ProgrammingError, OperationalError):
            # Database has not yet been initialized, so don't throw any error.
            return []


def default_template():
    # We need to get the historical version of the model as newer versions
    # may have changed in structure
    template = DocumentTemplate.objects.first()
    if template:
        return template.pk
    template = DocumentTemplate()
    template.definition = settings.DOC_TEMPLATE
    template.definition_hash = settings.DOC_TEMPLATE_HASH
    template.title = _('Standard Article')
    template.save()
    for style in CitationStyle.objects.all():
        template.citation_styles.add(style)
    for style in DocumentStyle.objects.all():
        template.document_styles.add(style)
    for exporter in ExportTemplate.objects.all():
        template.export_templates.add(exporter)
    return template.pk


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
    owner = models.ForeignKey(
        User,
        related_name='owner',
        on_delete=models.deletion.CASCADE
    )
    added = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    comments = models.TextField(default='{}')
    bibliography = models.TextField(default='{}')
    # Whether or not document is listed on document overview list page.
    # True by default and for all normal documents. Can be set to False when
    # documents are added in plugins that list these documents somewhere else.
    listed = models.BooleanField(default=True)
    template = models.ForeignKey(
        DocumentTemplate,
        on_delete=models.deletion.CASCADE,
        default=default_template
    )

    def __str__(self):
        if len(self.title) > 0:
            return self.title + ' (' + str(self.id) + ')'
        else:
            return str(self.id)

    class Meta(object):
        ordering = ['-id']

    def get_absolute_url(self):
        return "/document/%i/" % self.id

    def is_deletable(self):
        reverse_relations = [
            f for f in self._meta.model._meta.get_fields()
            if (f.one_to_many or f.one_to_one) and
            f.auto_created and not f.concrete and
            f.name not in ['accessright', 'documentrevision']
        ]

        for r in reverse_relations:
            if r.remote_field.model.objects.filter(
                **{r.field.name: self}
            ).exists():
                return False
        return True

    @classmethod
    def check(cls, **kwargs):
        errors = super(Document, cls).check(**kwargs)
        errors.extend(cls._check_doc_versions(**kwargs))
        return errors

    @classmethod
    def _check_doc_versions(cls, **kwargs):
        try:
            if len(
                cls.objects.filter(doc_version__lt=str(FW_DOCUMENT_VERSION))
            ):
                return [
                    checks.Warning(
                        'Documents need to be upgraded. Please navigate to '
                        '/admin/document/document/maintenance/ with a browser '
                        'as a superuser and upgrade all documents on this '
                        'server.',
                        obj=cls
                    )
                ]
            else:
                return []
        except (ProgrammingError, OperationalError):
            # Database has not yet been initialized, so don't throw any error.
            return []


@receiver(post_delete)
def delete_document(sender, instance, **kwargs):
    if sender == Document:
        if (
            instance.template.user and
            instance.template.document_set.count() == 0
        ):
            # User template no longer used.
            instance.template.delete()


RIGHTS_CHOICES = (
    ('write', 'Writer'),
    # Can write contents and can read+write comments.
    # Can chat with collaborators.
    ('write-tracked', 'Write with tracked changes'),
    # Can write tracked contents and can read/write comments.
    # Cannot turn off tracked changes.
    # Can chat with collaborators.
    ('comment', 'Commentator'),
    # Can read contents and can read+write comments.
    # Can chat with collaborators.
    ('review', 'Reviewer'),
    # Can read the contents and can read/write his own comments.
    # Comments by users with this access right only show the user's
    # numeric ID, not their username.
    # Cannot chat with collaborators nor see that they are connected.
    ('read', 'Reader'),
    # Can read contents, including comments
    # Can chat with collaborators.
    ('read-without-comments', 'Reader without comment access'),
    # Can read contents, but not the comments.
    # Cannot chat with collaborators.
)

# Editor and Reviewer can only comment and not edit document
COMMENT_ONLY = ('review', 'comment')

CAN_UPDATE_DOCUMENT = ['write', 'write-tracked', 'review', 'comment']

# Whether the collaborator is allowed to know about other collaborators
# and communicate with them.
CAN_COMMUNICATE = ['read', 'write', 'comment', 'write-tracked']


class AccessRight(models.Model):
    document = models.ForeignKey(Document, on_delete=models.deletion.CASCADE)
    user = models.ForeignKey(User, on_delete=models.deletion.CASCADE)
    rights = models.CharField(
        max_length=21,
        choices=RIGHTS_CHOICES,
        blank=False)

    class Meta(object):
        unique_together = (("document", "user"),)

    def __str__(self):
        return (
            '%(name)s %(rights)s on %(doc_id)d' %
            {
                'name': self.user.readable_name,
                'rights': self.rights,
                'doc_id': self.document.id
            }
        )


class AccessRightInvite(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField()  # The email where the invite was sent
    document = models.ForeignKey(Document, on_delete=models.deletion.CASCADE)
    rights = models.CharField(
        max_length=21,
        choices=RIGHTS_CHOICES,
        blank=False)

    def __str__(self):
        return (
            '%(email)s %(rights)s on %(doc_id)d: %(id)d' %
            {
                'email': self.email,
                'rights': self.rights,
                'doc_id': self.document.id,
                'id': self.id
            }
        )

    def get_absolute_url(self):
        return "/invite/%i/" % self.id


def revision_filename(instance, filename):
    return "document-revisions/{id}.fidus".format(id=instance.pk)


class DocumentRevision(models.Model):
    document = models.ForeignKey(Document, on_delete=models.deletion.CASCADE)
    doc_version = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        default=FW_DOCUMENT_VERSION
    )
    note = models.CharField(max_length=255, default='', blank=True)
    date = models.DateTimeField(auto_now=True)
    file_object = models.FileField(upload_to=revision_filename)
    file_name = models.CharField(max_length=255, default='', blank=True)

    def save(self, *args, **kwargs):
        if self.pk is None:
            # We remove the file_object the first time so that we can use the
            # pk as the name of the saved revision file.
            file_object = self.file_object
            self.file_object = None
            super(DocumentRevision, self).save(*args, **kwargs)
            self.file_object = file_object
            kwargs.pop('force_insert', None)
        super(DocumentRevision, self).save(*args, **kwargs)

    def __str__(self):
        if len(self.note) > 0:
            return self.note + ' (' + str(self.id) + ') of ' + \
                str(self.document.id)
        else:
            return str(self.id) + ' of ' + str(self.document.id)

    @classmethod
    def check(cls, **kwargs):
        errors = super(DocumentRevision, cls).check(**kwargs)
        errors.extend(cls._check_doc_versions(**kwargs))
        return errors

    @classmethod
    def _check_doc_versions(cls, **kwargs):
        try:
            if len(
                cls.objects.filter(doc_version__lt=str(FW_DOCUMENT_VERSION))
            ):
                return [
                    checks.Warning(
                        'Document revisions need to be upgraded. Please '
                        'navigate to /admin/document/document/maintenance/ '
                        'with a browser as a superuser and upgrade all '
                        'document revisions on this server.',
                        obj=cls
                    )
                ]
            else:
                return []
        except (ProgrammingError, OperationalError):
            # Database has not yet been initialized, so don't throw any error.
            return []

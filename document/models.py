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

# FW_DOCUMENT_VERSION: See also FW_FILETYPE_VERSION specified in export
# (same value from >= 2.0) in
# document/static/js/modules/exporter/native/zip.js

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
            for style in CitationStyle.objects.all():
                self.citation_styles.add(style)
        # not all document_styles will really fit.
        # TODO: add a field to classify document styles by used fields
        if self.document_styles.count() == 0:
            for style in DocumentStyle.objects.all():
                self.document_styles.add(style)


def default_template():
    template = DocumentTemplate.objects.first()
    if not template:
        template = DocumentTemplate()
        template.definition = settings.DOC_TEMPLATE
        template.definition_hash = settings.DOC_TEMPLATE_HASH
        template.slug = 'article'
        template.title = _('Standard Article')
        template.save()
    save_template = False
    if template.citation_styles.count() == 0:
        for style in CitationStyle.objects.all():
            template.citation_styles.add(style)
        save_template = True
    if template.document_styles.count() == 0:
        for style in DocumentStyle.objects.all():
            template.document_styles.add(style)
        save_template = True
    if template.export_templates.count() == 0:
        for exporter in ExportTemplate.objects.all():
            template.export_templates.add(exporter)
        save_template = True
    if save_template:
        template.save()
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
    ('read', 'Reader'),
    ('read-without-comments', 'Reader without comment access'),
    # Can read the text, but not the comments.
    ('write', 'Writer'),
    ('write-tracked', 'Write with tracked changes'),
    ('review', 'Reviewer'),
    ('comment', 'Commentator'),
    ('edit', 'Editor'),
    # Editor as in "Editor of Journal X"
)

# Editor and Reviewer can only comment and not edit document
COMMENT_ONLY = ('edit', 'review', 'comment')

CAN_UPDATE_DOCUMENT = ['write', 'write-tracked', 'edit', 'review', 'comment']

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


def revision_filename(instance, filename):
    return '/'.join(['revision', str(instance.document.id), filename])


class DocumentRevision(models.Model):
    document = models.ForeignKey(Document, on_delete=models.deletion.CASCADE)
    note = models.CharField(max_length=255, default='', blank=True)
    date = models.DateTimeField(auto_now=True)
    file_object = models.FileField(upload_to=revision_filename)
    file_name = models.CharField(max_length=255, default='', blank=True)

    def __str__(self):
        if len(self.note) > 0:
            return self.note + ' (' + str(self.id) + ') of ' + \
                str(self.document.id)
        else:
            return str(self.id) + ' of ' + str(self.document.id)

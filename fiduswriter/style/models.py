import json

from django.conf import settings
from django.db import models
from django.utils.translation import ugettext as _

from .csl_xml_to_json import XMLWalker


def document_filename(instance, filename):
    return '/'.join(['document-fonts', filename])


class DocumentFont(models.Model):
    title = models.CharField(
        max_length=128,
        help_text='The human readable title.')
    font_file = models.FileField(
        upload_to=document_filename,
        help_text='The font file.')
    fontface_definition = models.TextField(
        help_text=(
            'The CSS definition of the font face (everything inside of '
            '@font-face{}). Add [URL] where the link to the font file is to '
            'appear.'
        )
    )

    def natural_key(self):
        return (self.font_file.url, self.fontface_definition)

    def __str__(self):
        return self.title


class OldDocumentStyle(models.Model):
    title = models.CharField(
        max_length=128,
        help_text='The human readable title.',
        default=_('Default')
    )
    filename = models.SlugField(
        max_length=20,
        help_text='The base of the filenames the style occupies.',
        default='default'
    )
    contents = models.TextField(
        help_text='The CSS style definiton.',
        default=''
    )
    fonts = models.ManyToManyField(DocumentFont, blank=True, default=None)

    def __str__(self):
        return self.title


class DocumentStyle(models.Model):
    title = models.CharField(
        max_length=128,
        help_text='The human readable title.',
        default='Default'
    )
    slug = models.SlugField(
        max_length=20,
        help_text='The base of the filenames the style occupies.',
        default='default'
    )
    contents = models.TextField(
        help_text='The CSS style definiton.',
        default=''
    )
    document_template = models.ForeignKey(
        'document.DocumentTemplate',
        on_delete=models.deletion.CASCADE
    )

    def __str__(self):
        return self.title

    class Meta(object):
        unique_together = (("slug", "document_template"),)


def documentstylefile_location(instance, filename):
    # preserve the original filename
    instance.filename = filename
    return '/'.join(['style-files', filename])


class DocumentStyleFile(models.Model):
    file = models.FileField(
        upload_to=documentstylefile_location,
        help_text=(
            'A file references in the style. The filename will be replaced '
            'with the final url of the file in the style.'
        )
    )
    filename = models.CharField(
        max_length=255,
        help_text='The original filename.'
    )
    style = models.ForeignKey(
        'DocumentStyle',
        on_delete=models.deletion.CASCADE
    )

    def __str__(self):
        return self.filename + ' of ' + self.style.title

    def natural_key(self):
        return (self.file.url, self.filename)

    class Meta(object):
        unique_together = (("filename", "style"),)


TEMPLATE_CHOICES = (
    ('docx', 'DOCX'),
    ('odt', 'ODT')
)


def template_filename(instance, filename):
    instance.title = filename.split('.')[0]
    return '/'.join(['export-template-files', filename])


class ExportTemplate(models.Model):
    template_file = models.FileField(upload_to=template_filename)
    title = models.CharField(
        max_length=128,
        help_text='The human readable title.',
        default=_('Default')
    )
    file_type = models.CharField(
        max_length=5,
        choices=TEMPLATE_CHOICES,
        blank=False)
    document_template = models.ForeignKey(
        'document.DocumentTemplate',
        on_delete=models.deletion.CASCADE
    )

    def __str__(self):
        return self.title + " (" + self.file_type + ")"

    class Meta(object):
        unique_together = (("title", "document_template"),)


def default_citationstyle():
    return settings.DEFAULT_CITATIONSTYLE


class CitationStyle(models.Model):
    title = models.CharField(
        max_length=128,
        help_text='The human readable title.',
        default=_('Default')
    )
    short_title = models.SlugField(
        max_length=40,
        help_text='A title used for constant names.',
        default='default'
    )
    contents = models.TextField(
        help_text='The style definiton (JSON, accepts also XML).',
        default=default_citationstyle
    )

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if self.contents.strip()[0] == '<':  # XML - we convert
            walker = XMLWalker(self.contents)
            self.contents = json.dumps(walker.output, indent=4)
        super().save(*args, **kwargs)


class CitationLocale(models.Model):
    language_code = models.SlugField(
        max_length=4,
        help_text='language code of the locale file.'
    )
    contents = models.TextField(
        help_text='The locale definiton (JSON, accepts also XML).'
    )

    def display_language_code(self):
        if len(self.language_code) > 2:
            return self.language_code[:2] + "-" + self.language_code[2:]
        else:
            self.language_code

    def __str__(self):
        return self.display_language_code()

    def save(self, *args, **kwargs):
        if self.contents.strip()[0] == '<':  # XML - we convert
            walker = XMLWalker(self.contents)
            self.contents = json.dumps(walker.output, indent=4)
        super().save(*args, **kwargs)

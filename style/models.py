from django.conf import settings
from django.db import models
from django.utils.translation import ugettext as _


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


class DocumentStyle(models.Model):
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
        help_text='The XML style definiton.',
        default=default_citationstyle
    )

    def __str__(self):
        return self.title


class CitationLocale(models.Model):
    language_code = models.SlugField(
        max_length=4,
        help_text='language code of the locale file.'
    )
    contents = models.TextField(help_text='The XML style definiton.')

    def display_language_code(self):
        if len(self.language_code) > 2:
            return self.language_code[:2] + "-" + self.language_code[2:]
        else:
            self.language_code

    def __str__(self):
        return self.display_language_code()

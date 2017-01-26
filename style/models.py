import os
import uuid

from django.db import models
from django.contrib.auth.models import User


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

    def __unicode__(self):
        return self.title


def get_latexClsfile_path(instance, filename):
    ext = filename.split('.')[-1].lower()
    return os.path.join('export-templates/Latex-classes', filename)


def get_cssfile_path(instance, filename):
    ext = filename.split('.')[-1].lower()
    return os.path.join('document-styles', filename)


def get_docxfile_path(instance, filename):
    ext = filename.split('.')[-1].lower()
    return os.path.join('export-templates', filename)


class DocumentStyle(models.Model):
    title = models.CharField(
        max_length=128,
        help_text='The human readable title.')
    filename = models.SlugField(
        max_length=20,
        help_text='The base of the filenames the style occupies.', blank=True)

    contents = models.TextField(help_text='The CSS style definiton.')
    fonts = models.ManyToManyField(DocumentFont, blank=True, default=None)

    uploader = models.ForeignKey(User, related_name='style_uploader',blank=True, null=True)
    owner = models.ForeignKey(User, related_name='style_owner', blank=True, null=True)
    added = models.DateTimeField(auto_now_add=True, null=True)
    css = models.FileField(upload_to=get_cssfile_path, blank=True, null=True)
    latexcls = models.FileField(upload_to=get_latexClsfile_path, blank=True, null=True)
    docx = models.FileField(upload_to=get_docxfile_path, blank=True, null=True)

    def __unicode__(self):
        return self.title




class CitationStyle(models.Model):
    title = models.CharField(
        max_length=128,
        help_text='The human readable title.')
    short_title = models.SlugField(
        max_length=40,
        help_text='A title used for constant names.'
    )
    contents = models.TextField(help_text='The XML style definiton.')

    def __unicode__(self):
        return self.title


class CitationLocale(models.Model):
    language_code = models.SlugField(
        max_length=4, help_text='language code of the locale file.')
    contents = models.TextField(help_text='The XML style definiton.')

    def display_language_code(self):
        if len(self.language_code) > 2:
            return self.language_code[:2] + "-" + self.language_code[2:]
        else:
            self.language_code

    def __unicode__(self):
        return self.display_language_code()


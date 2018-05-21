from __future__ import unicode_literals
from django.utils.encoding import python_2_unicode_compatible

from django.db import models
from django.contrib.auth.models import User


@python_2_unicode_compatible
class EntryCategory(models.Model):
    category_title = models.CharField(max_length=100)
    category_owner = models.ForeignKey(User)

    def __str__(self):
        return self.category_title

    class Meta:
        verbose_name_plural = 'Entry categories'


@python_2_unicode_compatible
class Entry(models.Model):
    entry_key = models.CharField(max_length=64)
    # identifier of the user, who created the entry.
    entry_owner = models.ForeignKey(User)
    # identifier of the entrytype for the entry.
    entry_cat = models.TextField(default='[]')
    last_modified = models.DateTimeField(auto_now=True)
    bib_type = models.CharField(max_length=30, default='')
    fields = models.TextField(default='{}')  # json object with all the fields

    def __str__(self):
        return self.entry_key

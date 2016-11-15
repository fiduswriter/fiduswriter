from django.db import models
from django.contrib.auth.models import User


class EntryCategory(models.Model):
    category_title = models.CharField(max_length=100)
    category_owner = models.ForeignKey(User)

    def __unicode__(self):
        return self.category_title

    class Meta:
        verbose_name_plural = 'Entry categories'


class Entry(models.Model):
    entry_key = models.CharField(max_length=64)
    # identifier of the user, who created the entry.
    entry_owner = models.ForeignKey(User)
    # identifier of the entrytype for the entry.
    entry_cat = models.CharField(max_length=255, default='')
    last_modified = models.DateTimeField(auto_now=True)
    bib_type = models.CharField(max_length=30, default='')
    fields = models.TextField(default='{}')  # json object with all the fields

    def __unicode__(self):
        return self.entry_key

    class Meta:
        unique_together = (('entry_key', 'entry_owner'),)

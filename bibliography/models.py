from django.db import models
from django.contrib.auth.models import User


# bibtex special symbols
class TexSpecialChar(models.Model):
    tex = models.CharField(max_length=255)
    unicode = models.CharField(max_length=20)

    def __unicode__(self):
        return self.unicode


# localization keys
class LocalizationKey(models.Model):
    key_type = models.CharField(max_length=20)
    key_name = models.CharField(max_length=20)
    key_title = models.CharField(max_length=48)

    def __unicode__(self):
        return self.key_title

# category


class EntryCategory(models.Model):
    category_title = models.CharField(max_length=100)
    category_owner = models.ForeignKey(User)

    def __unicode__(self):
        return self.category_title

    class Meta:
        verbose_name_plural = 'Entry categories'

# types of values


class EntryField(models.Model):
    FIELDTYPE_CHOICES = (
        ('l_name', 'Name list'),
        ('l_literal', 'Literal list'),
        ('l_key', 'Key list'),
        ('f_literal', 'Literal field'),
        ('f_range', 'Range field'),
        ('f_integer', 'Integer field'),
        ('f_date', 'Date field'),
        ('f_verbatim', 'Vervatim field'),
        ('f_commaSeparatedValue', 'Comma-separated value field'),
        ('f_pattern', 'Pattern field'),
        ('f_key', 'Key field'),
        ('f_code', 'Code field'),
        ('f_uri', 'URI Field')
    )  # types of field

    # fidus type name (only with alphabet a-z in smallcase).
    field_name = models.CharField(max_length=30, unique=True)
    # biblatex name (only with alphabet a-z in smallcase).
    biblatex = models.CharField(max_length=30)
    # csl type name (only with alphabet a-z in smallcase).
    csl = models.CharField(max_length=30, blank=True)
    field_title = models.CharField(max_length=100)  # name for human to read.
    field_type = models.CharField(
        max_length=30,
        choices=FIELDTYPE_CHOICES,
        default='l_name',
        blank=False)  # definition for datatype of input for the field.

    def __unicode__(self):
        return self.field_title

# Aliases of EntryField


class EntryFieldAlias(models.Model):
    # name for biblatex (only with alphabet a-z in smallcase).
    field_name = models.CharField(max_length=30, unique=True)
    field_alias = models.ForeignKey(EntryField)

    def __unicode__(self):
        return self.field_name

    class Meta:
        verbose_name_plural = 'Entry field aliases'

# types of bibliography


class EntryType(models.Model):
    # fidus type name (only with alphabet a-z in smallcase).
    type_name = models.CharField(max_length=30, unique=True)
    type_title = models.CharField(max_length=100)  # name for human to read.
    type_order = models.IntegerField()  # number to sort entry types
    # biblatex name (only with alphabet a-z in smallcase).
    biblatex = models.CharField(max_length=30)
    # csl type name (only with alphabet a-z in smallcase).
    csl = models.CharField(max_length=30)
    # list of ids of the required fields.
    required_fields = models.ManyToManyField(
        EntryField, related_name='required_fields')
    # list of ids of the eitheror fields (one of these has to be chosen).
    eitheror_fields = models.ManyToManyField(
        EntryField, related_name='eitheror_fields')
    # list of ids of the optional fields.
    optional_fields = models.ManyToManyField(
        EntryField, related_name='optional_fields')

    def __unicode__(self):
        return self.type_title


# Aliases of EntryType
class EntryTypeAlias(models.Model):
    # name for biblatex (only with alphabet a-z in smallcase).
    type_name = models.CharField(max_length=30, unique=True)
    type_alias = models.ForeignKey(EntryType)

    def __unicode__(self):
        return self.field_name

    class Meta:
        verbose_name_plural = 'Entry type aliases'


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

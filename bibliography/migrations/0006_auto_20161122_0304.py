# -*- coding: utf-8 -*-
# Update bibliography fields for biblatex-csl-converter v. 0.11.1
from __future__ import unicode_literals

from tornado.escape import json_decode, json_encode
from re import sub
from django.db import migrations

f_date = [u'date', u'urldate', u'eventdate', u'origdate']

l_name = [u'afterword', u'annotator', u'author', u'bookauthor', \
u'commentator', u'editor', u'editora', u'editorb', u'editorc', u'foreword', \
u'holder', u'introduction', u'shortauthor', u'shorteditor', u'translator']

#f_key = [u'authortype', u'bookpagination', u'editortype', u'editoratype',\
#u'editorbtype', u'editorctype', u'origlanguage', u'pagination', u'pubstate',\
#u'type']

l_key = [u'language',]

f_literal = [u'abstract', u'addendum', u'annotation', u'booksubtitle',\
u'booktitle', u'booktitleaddon', u'chapter', u'eid', u'entrysubtype',\
u'eprinttype', u'eventtitle', u'howpublished', u'indextitle', u'isan',\
u'isbn', u'ismn', u'isrn', u'issn', u'issue', u'issuesubtitle', u'issuetitle',\
u'iswc', u'journalsubtitle', u'journaltitle', u'label', u'library',\
u'mainsubtitle', u'maintitle', u'maintitleaddon', u'nameaddon', u'note',\
u'number', u'origtitle', u'pagetotal', u'part', u'reprinttitle', u'series',\
u'shorthand', u'shorthandintro', u'shortjournal', u'shortseries', \
u'shorttitle', u'subtitle', u'title', u'titleaddon', u'venue', u'version',\
u'volume', u'volumes']

l_literal = [u'eprintclass', u'institution', u'location', u'organization', \
u'origlocation', u'origpublisher', u'publisher']

f_integer = [u'edition',]

f_verbatim = [u'doi', u'eprint', u'file']

def strip_brackets_and_html(string):
    return sub('<[^<]+?>', '', string.replace('{','').replace('}',''))

def reform_f_date(date_string):
    date_string = date_string.replace('-AA','')
    ref_date_strings = []
    for date in date_string.split('/'):
        date_parts = date.split('-')
        year = "0000" + date_parts[0]
        ref_date_string = year[-4:]
        if len(date_parts) > 1:
            month = "0" + date_parts[1]
            ref_date_string += '-' + month[-2:]
        if len(date_parts) > 2:
            day = "0" + date_parts[2]
            ref_date_string += '-' + day[-2:]
        ref_date_strings.append(ref_date_string)
    return '/'.join(ref_date_strings)

def reform_l_name(name_string):
    names = name_string[1:-1].split('} and {')
    names_value = []
    for each_name in names:
        name_parts = each_name.split('} {')
        name_value = {}
        if len(name_parts) > 1:
            name_value['family'] = [{'type':'text', 'text': strip_brackets_and_html(name_parts[1])}]
            name_value['given'] = [{'type':'text', 'text': strip_brackets_and_html(name_parts[0])}]
        else:
            name_value['literal'] = [{'type':'text', 'text': strip_brackets_and_html(name_parts[0])}]
        names_value.append(name_value)
    return names_value

def reform_f_literal(lit_string):
    return [{'type':'text', 'text': strip_brackets_and_html(lit_string)}]

def reform_l_literal(list_string):
    in_list = list_string[1:-1].split('} and {')
    out_list = []
    for item in in_list:
        out_list.append(reform_f_literal(item))
    return out_list

def reform_l_key(list_string):
    return list_string.split(' and ')

def modify_fields(apps, schema_editor):
    # We can't import the model directly as it may be a newer
    # version than this migration expects. We use the historical version.
    Entry = apps.get_model("bibliography", "Entry")
    for entry in Entry.objects.all():
        fields = json_decode(entry.fields)

        for key in fields:
            if key in f_date:
                fields[key] = reform_f_date(fields[key])
            elif key in l_name:
                fields[key] = reform_l_name(fields[key])
            elif key in l_key:
                fields[key] = reform_l_key(fields[key])
            elif key in f_literal:
                fields[key] = reform_f_literal(fields[key])
            elif key in l_literal:
                fields[key] = reform_l_literal(fields[key])
        entry.fields = json_encode(fields)
        entry.save()

class Migration(migrations.Migration):

    dependencies = [
        ('bibliography', '0005_auto_20161115_0310'),
    ]

    operations = [
        migrations.RunPython(modify_fields),
    ]

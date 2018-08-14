# -*- coding: utf-8 -*-
# Update bibliography fields for biblatex-csl-converter v. 0.11.1


from tornado.escape import json_decode, json_encode
from re import sub
from django.db import migrations

f_date = ['date', 'urldate', 'eventdate', 'origdate']

l_name = ['afterword', 'annotator', 'author', 'bookauthor', \
'commentator', 'editor', 'editora', 'editorb', 'editorc', 'foreword', \
'holder', 'introduction', 'shortauthor', 'shorteditor', 'translator']

f_key = ['authortype', 'bookpagination', 'editortype', 'editoratype',\
'editorbtype', 'editorctype', 'origlanguage', 'pagination', 'pubstate',\
'type']

l_range = ['pages',]

l_key = ['language',]

f_literal = ['abstract', 'addendum', 'annotation', 'booksubtitle',\
'booktitle', 'booktitleaddon', 'chapter', 'eid', 'entrysubtype',\
'eprinttype', 'eventtitle', 'howpublished', 'indextitle', 'isan',\
'isbn', 'ismn', 'isrn', 'issn', 'issue', 'issuesubtitle', 'issuetitle',\
'iswc', 'journalsubtitle', 'journaltitle', 'label', 'library',\
'mainsubtitle', 'maintitle', 'maintitleaddon', 'nameaddon', 'note',\
'number', 'origtitle', 'pagetotal', 'part', 'reprinttitle', 'series',\
'shorthand', 'shorthandintro', 'shortjournal', 'shortseries', \
'shorttitle', 'subtitle', 'title', 'titleaddon', 'venue', 'version',\
'volume', 'volumes', 'eprintclass']

l_literal = ['institution', 'location', 'organization', \
'origlocation', 'origpublisher', 'publisher']

f_integer = ['edition',]

f_verbatim = ['doi', 'eprint', 'file']

def strip_brackets_and_html(string):
    return sub('<[^<]+?>', '', string.replace('{','').replace('}',''))

def reform_f_date(date_string):
    date_string = date_string.replace('-AA','').replace('A','u')
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
    names = sub(r'^{|}$','', name_string).split('} and {')
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
    in_list = sub(r'^{|}$','', list_string).split('} and {')
    out_list = []
    for item in in_list:
        out_list.append(reform_f_literal(item))
    return out_list

def reform_l_range(range_string):
    if len(range_string) == 0:
        return []
    range_list = range_string.split(',')
    out_list = []
    for range_item in range_list:
        range_parts = range_item.split('-')
        if len(range_parts) > 1:
            out_list.append([
                reform_f_literal(range_parts[0]),
                reform_f_literal(range_parts[-1])
            ])
        else:
            out_list.append([reform_f_literal(range_item)])
    return out_list

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
            elif key in f_literal:
                fields[key] = reform_f_literal(fields[key])
            elif key in f_key:
                fields[key] = reform_f_literal(fields[key])
            elif key in f_integer:
                fields[key] = reform_f_literal(fields[key])
            elif key in l_literal:
                fields[key] = reform_l_literal(fields[key])
            elif key in l_key:
                fields[key] = reform_l_literal(fields[key])
            elif key in l_range:
                fields[key] = reform_l_range(fields[key])
        entry.fields = json_encode(fields)
        entry.save()

class Migration(migrations.Migration):

    dependencies = [
        ('bibliography', '0005_auto_20161115_0310'),
    ]

    operations = [
        migrations.RunPython(modify_fields),
    ]

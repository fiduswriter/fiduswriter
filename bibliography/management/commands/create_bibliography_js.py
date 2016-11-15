import os
import json
from re import escape
from fiduswriter.settings import PROJECT_PATH
from bibliography.models import (
    TexSpecialChar,
    EntryField,
    EntryType,
    EntryFieldAlias,
    EntryTypeAlias,
    LocalizationKey
)

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = ('Create a javascript file with the a conversion map of special '
            'symbols in latex to unicode and the list of field types of the '
            'Bibligraphy DB')

    def handle(self, *args, **options):

        output_js = ('/** @file Sets up strings for working with TeX \n This '
                     'file is automatically created using ./manage.py '
                     'create_bibliography_js\n*/\n')

        output_js += ('/** A list of special chars in Tex and their unicode '
                      'equivalent. */\n')
        output_js += 'export let TexSpecialChars = [\n'

        for special_char in TexSpecialChar.objects.all():
            output_js += "    [%s,'%s'],\n" % (
                json.dumps(special_char.tex),
                special_char.unicode
            )
        output_js = output_js[:-2] + "\n"  # Remove last comma
        output_js += ']\n'

        # list of field types of Bibligraphy DB with lookup by field name
        fixtures_list = json.loads(
            open(
                PROJECT_PATH + '/bibliography/fixtures/initial_bib_rules.json'
            ).read()
        )
        localization_key = {}
        for fixture_entry in fixtures_list:
            if 'keys' in fixture_entry:
                localization_key[fixture_entry['pk']] = fixture_entry['keys']
        output_js += ('/** A list of field types of Bibligraphy DB with '
                      'lookup by field name. */\n')
        output_js += 'export let BibFieldTypes = {\n'
        for field in EntryField.objects.all():
            output_js += '\'' + str(field.field_name) + '\': {\n'
            output_js += 'type: \'' + field.field_type + '\', '
            output_js += 'biblatex: \'' + field.biblatex + '\', '
            if field.csl != '':
                output_js += 'csl: \'' + field.csl + '\', '
            if field.id in localization_key:
                fid = localization_key[field.id]
                output_js += 'localization: \'' + fid + '\''
            output_js += '},\n'
        output_js += '}'

        output2_js = 'export let BibFieldTitles = {\n'
        for field in EntryField.objects.all():
            output2_js += '\'' + str(field.field_name) + '\': '
            output2_js += 'gettext(\'' + escape(
                field.field_title
            ).replace(
                '\\ ', ' '
            ).replace(
                '\\(', '('
            ).replace(
                '\\)', ')'
            ).replace(
                '\\-', '-'
            ) + '\'),\n'
        output2_js += '}\n\n'

        # list of aliases for field types.
        output_js += (
            '/** A list of all field aliases and what they refer to. */\n'
        )
        output_js += 'export let BiblatexFieldAliasTypes = {\n'
        for field in EntryFieldAlias.objects.all():
            output_js += (
                '\''+str(field.field_name) + '\': \''
                + str(field.field_alias.biblatex) + '\',\n'
            )
        output_js += '}\n'

        # list of all bibentry types and their fields
        output_js += '/** A list of all bib types and their fields. */\n'
        output_js += 'export let BibTypes = {\n'
        for entry_type in EntryType.objects.all().order_by('type_order'):
            output_js += '\'' + str(entry_type.type_name) + '\' : {\n'
            output_js += 'order: ' + str(entry_type.type_order) + ', \n'
            output_js += 'biblatex: \'' + entry_type.biblatex + '\', \n'
            output_js += 'csl: \'' + entry_type.csl + '\', \n'
            output_js += 'required:['
            for field in entry_type.required_fields.all():
                output_js += '\'' + field.field_name + '\','
            output_js += '],\n'
            output_js += 'eitheror:['
            for field in entry_type.eitheror_fields.all():
                output_js += '\'' + field.field_name + '\','
            output_js += '],\n'
            output_js += 'optional:['
            for field in entry_type.optional_fields.all():
                output_js += '\'' + field.field_name + '\','
            output_js += ']\n'
            output_js += '},\n'

        output_js += '}\n'

        output2_js += 'export let BibTypeTitles = {\n'
        for entry_type in EntryType.objects.all():
            output2_js += '\'' + str(entry_type.type_name) + '\' : '
            output2_js += 'gettext(\'' + escape(
                entry_type.type_title
            ).replace('\\ ', ' ').replace(
                '\\(', '('
            ).replace(
                '\\)', ')'
            ).replace(
                '\\-', '-'
            ) + '\'),\n'
        output2_js += '}\n'
        # list of aliases for bibentry types.
        output_js += (
            '/** A list of all bibentry aliases and what they refer to. */\n'
        )
        output_js += 'export let BiblatexAliasTypes = {\n'
        for entry_type in EntryTypeAlias.objects.all():
            output_js += (
                '\'' + str(entry_type.type_name) + '\': \''
                + str(entry_type.type_alias.biblatex) + '\',\n'
            )
        output_js += '}\n'

        # list of all the localization keys
        output2_js += ('/** A list of all the bibliography keys and their '
                       'full name. */\n')
        output2_js += 'export let LocalizationKeys = [\n'
        for l_key in LocalizationKey.objects.all():
            output2_js += '{\n'
            output2_js += 'type: \'' + l_key.key_type + '\', \n'
            output2_js += 'name: \'' + l_key.key_name + '\', \n'
            output2_js += 'title: \'' + escape(l_key.key_title) + '\'\n'
            output2_js += '},\n'
        output2_js += ']\n'

        # write the file
        d = os.path.dirname(
            PROJECT_PATH+('/bibliography/static/js/es6_modules/bibliography/'
                          'statics.js')
        )
        if not os.path.exists(d):
            os.makedirs(d)

        bib_js_file = open(
            PROJECT_PATH+('/bibliography/static/js/es6_modules/bibliography/'
                          'statics.js'),
            "w"
        )

        bib_js_file.write(output_js.encode('utf8'))

        bib_js_file.close()

        bib2_js_file = open(
            PROJECT_PATH+('/bibliography/static/js/es6_modules/bibliography/'
                          'form/titles.js'),
            "w"
        )

        bib2_js_file.write(output2_js.encode('utf8'))

        bib2_js_file.close()

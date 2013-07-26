#
# This file is part of Fidus Writer <http://www.fiduswriter.com>
#
# Copyright (C) 2013 Takuto Kojima, Johannes Wilm
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as
# published by the Free Software Foundation, either version 3 of the
# License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.

import os
import json
from re import escape
from fiduswriter.settings import PROJECT_PATH
from bibliography.models import TexSpecialChar, EntryField, EntryType, LocalizationKey

from django.core.management.base import BaseCommand

class Command(BaseCommand):
    args = ''
    help = 'Create a javascript file with the a conversion map of special symbols in latex to unicode and the list of field types of the Bibligraphy DB'

    def handle(self, *args, **options):

        output_js = u'// This file is automatically created using ./manage.py create_bibliography_js\n'
        
        # list of tex special chars
        output_js += 'var tex_special_chars = [\n'

        for special_char in TexSpecialChar.objects.all() :
            tex_char = special_char.tex.replace('\\', '\\\\')
            tex_char = tex_char.replace('"', '\\"')
            output_js += '{ \'unicode\': "' + special_char.unicode + '", '
            output_js += '\'tex\': "' + tex_char + '"},\n'
            #print output_js
            
        output_js += '];\n'
        
        # list of field types of Bibligraphy DB with lookup by field name
        fixtures_list = json.loads(open(PROJECT_PATH + '/bibliography/fixture/initial_data.json').read())
        localization_key = {}
        for fixture_entry in fixtures_list:
            if 'keys' in fixture_entry:
                localization_key[fixture_entry['pk']] = fixture_entry['keys']
                
        output_js += 'var BibFieldTypes = {\n'
        for field in EntryField.objects.all():
            output_js += str(field.field_name) + ': {\n'
            output_js += '\'id\': ' + str(field.id) + ', '            
            output_js += '\'type\': \'' + field.field_type + '\', '
            output_js += '\'name\': \'' + field.field_name + '\', '
            output_js += '\'biblatex\': \'' + field.biblatex + '\', '
            if field.csl != '':
                output_js += '\'csl\': \'' + field.csl + '\', '
            output_js += '\'title\': gettext(\'' + escape(field.field_title).replace('\\ ',' ').replace('\\(','(').replace('\\)',')').replace('\\-','-') + '\'),'
            if field.id in localization_key :
                output_js += '\'localization\': \''  + localization_key[field.id] + '\''
            output_js += '},\n'
        output_js += '};\n'
        
        # list of all bibentry types and their fields
        
        output_js += 'var BibEntryTypes = {\n'
        
        entry_types = []
        
        for entry_type in EntryType.objects.all():
            output_js += str(entry_type.pk) + ' : {\n'
            output_js += '\'id\': ' + str(entry_type.id) + ', '
            output_js += '\'order\': ' + str(entry_type.type_order) + ', '
            output_js += '\'name\': \'' + entry_type.type_name + '\', '
            output_js += '\'biblatex\': \'' + entry_type.biblatex + '\', '
            output_js += '\'csl\': \'' + entry_type.csl + '\', '                        
            output_js += '\'title\': gettext(\'' + escape(entry_type.type_title).replace('\\ ',' ').replace('\\(','(').replace('\\)',')').replace('\\-','-') + '\'), '
            output_js += '\'required\':['
            for field in entry_type.required_fields.all():
                output_js += '\''+ field.field_name + '\','
            output_js += '],\n'
            output_js += '\'eitheror\':['
            for field in entry_type.eitheror_fields.all():
                output_js += '\''+ field.field_name + '\','
            output_js += '],\n'                 
            output_js += '\'optional\':['
            for field in entry_type.optional_fields.all():
                output_js += '\''+ field.field_name + '\','                       
            output_js += ']\n'            
            output_js += '},\n'
        
        output_js += '};\n'
        
        # list of all the localization keys
        output_js += 'var LocalizationKeys = [\n'
        for l_key in LocalizationKey.objects.all():
            output_js += '{\n'
            output_js += '\'type\': \'' + l_key.key_type + '\', '
            output_js += '\'name\': \'' + l_key.key_name + '\', '
            output_js += '\'title\': \'' + escape(l_key.key_title) + '\'\n'
            output_js += '},\n'
        output_js += '];\n'
                       
        
        # write the file

        d = os.path.dirname(PROJECT_PATH+'/bibliography/static/js/bibliography-statics.js')
        if not os.path.exists(d):
            os.makedirs(d)

        bib_js_file = open(PROJECT_PATH+"/bibliography/static/js/bibliography-statics.js", "w")

        bib_js_file.write(output_js.encode('utf8'))

        bib_js_file.close()
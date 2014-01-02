#
# This file is part of Fidus Writer <http://www.fiduswriter.org>
#
# Copyright (C) 2013 Johannes Wilm
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
from style.models import DocumentStyle

from django.core.management.base import BaseCommand

class Command(BaseCommand):
    args = ''
    help = 'Creates CSS files with the style definitions of all the document styles'

    def handle(self, *args, **options):

        output_js = u'/** @file Makes a list of available styles in the document style menu. \n This file is automatically created using ./manage.py create_document_styles\n*/\n'
        
        output_js += u'\ndocument.addEventListener("DOMContentLoaded", function(event) {\n'
        
        output_js += u'var documentStyleList = document.getElementById("documentstyle-list"), documentStyleListItem;\n'
        
        default_document_style = False
        
        for ds in DocumentStyle.objects.order_by('title'):

            if not default_document_style:
                default_document_style = ds.filename

            output_js += u'documentStyleListItem=document.createElement("li");\n'
            output_js += u'documentStyleListItem.innerHTML = "<span class=\'fw-pulldown-item style\' data-style=\'' + ds.filename + '\' title=\'' + ds.title + '\'>' + ds.title + '</span>";\n'
            output_js += u'documentStyleList.appendChild(documentStyleListItem);\n'
            output_css = u'/** @file A document style definition. \n This file is automatically created using ./manage.py create_document_styles\n*/\n'
            for font in ds.fonts.all():
                output_css += u'\n@font-face {\n'
                output_css += font.fontface_definition.replace('[URL]',font.font_file.url.split("?")[0])
                output_css += u'\n}\n'
            output_css += ds.contents
            
            d = os.path.dirname(PROJECT_PATH+'/style/static/css/document/'+ds.filename+'.css')
            if not os.path.exists(d):
                os.makedirs(d)

            css_file = open(PROJECT_PATH+'/style/static/css/document/'+ds.filename+'.css', "w")

            css_file.write(output_css.encode('utf8'))

            css_file.close()
        output_js += u'});\n'
        output_js += u'var defaultDocumentStyle = "'+default_document_style+'";'
        d = os.path.dirname(PROJECT_PATH+'/style/static/js/document/stylelist.js')
        if not os.path.exists(d):
            os.makedirs(d)
        js_file = open(PROJECT_PATH+'/style/static/js/document/stylelist.js', "w")
        js_file.write(output_js.encode('utf8'))
        
        js_file.close()
import os
import re
from fiduswriter.settings import PROJECT_PATH
from style.models import DocumentStyle

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    args = ''
    help = ('Creates CSS files with the style definitions of all the document '
            'styles')

    def handle(self, *args, **options):

        output_js = (
            '/** @file Makes a list of available styles for the document and '
            'book style menus. \n This file is automatically created using '
            './manage.py create_document_styles\n*/\n'
        )

        output_js += 'var documentStyleList = [\n'

        default_document_style = False

        for ds in DocumentStyle.objects.order_by('title'):

            if not default_document_style:
                default_document_style = ds.filename

            output_js += u'{filename: "' + ds.filename + \
                '", title: "' + ds.title + '"},\n'
            output_css = (
                u'/** @file A document style definition. \n This file is '
                'automatically created using ./manage.py '
                'create_document_styles\n*/\n'
            )

            for font in ds.fonts.all():
                font_face = u'\n@font-face {\n'
                font_face += font.fontface_definition.replace(
                    '[URL]', font.font_file.url.split("?")[0])
                font_face += u'\n}\n'
                # adding extra font with Zero Space for MVS
                font_face_mvs = re.sub(
                    r'src:(.+);',
                    (
                        'src: url(../../fonts/zerospacemvs/zerospacemvs.svg) '
                        'format("svg");\r\nunicode-range: "U+200B";'
                    ),
                    font_face
                )

                output_css += font_face
                output_css += font_face_mvs
            output_css += ds.contents

            d = os.path.dirname(
                PROJECT_PATH +
                '/style/static/css/document/' +
                ds.filename +
                '.css')
            if not os.path.exists(d):
                os.makedirs(d)

            css_file = open(
                PROJECT_PATH +
                '/style/static/css/document/' +
                ds.filename +
                '.css',
                "w")

            css_file.write(output_css.encode('utf8'))

            css_file.close()
        output_js += u'];\n'
        if (default_document_style):
            dds = default_document_style
            output_js += u'var defaultDocumentStyle = "' + dds + '";'
        d = os.path.dirname(PROJECT_PATH +
                            '/style/static/js/document/stylelist.js')
        if not os.path.exists(d):
            os.makedirs(d)
        js_file = open(
            PROJECT_PATH +
            '/style/static/js/document/stylelist.js',
            "w")
        js_file.write(output_js.encode('utf8'))

        js_file.close()

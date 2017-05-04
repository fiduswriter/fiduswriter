import os
from fiduswriter.settings import PROJECT_PATH
from style.models import DocumentStyle

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = ('Creates CSS files with the style definitions of all the document '
            'styles')
    # def filebasename(self,url):
    #    basename, extension = os.path.splitext(os.path.basename(url))
    #    return basename

    def handle(self, *args, **options):

        output_js = (
            '/** @file Makes a list of available styles for the document and '
            'book style menus. \n This file is automatically created using '
            './manage.py create_document_styles\n*/\n'
        )

        output_js += 'export let documentStyleList = [\n'

        default_document_style = False

        for ds in DocumentStyle.objects.order_by('title'):

            if not default_document_style:
                default_document_style = ds.filename
        #      if ds.latexcls:
        #         output_js += u'{filename: "' + ds.filename + \
        #                     '", title: "' + ds.title + \
        #                     '", latexCls: "' + \
        #                     self.filebasename(ds.latexcls.url) + '"},\n'
        #      else:
        #          output_js += u'{filename: "' + ds.filename + \
        #              '", title: "' + ds.title + '"},\n'
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
                output_css += font_face
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
        output_js += u']\n'
        if (default_document_style):
            dds = default_document_style
            output_js += u'export let defaultDocumentStyle = "' + dds + '"'
        d = os.path.dirname(
            PROJECT_PATH +
            '/style/static/js/es6_modules/style/documentstyle-list.js')
        if not os.path.exists(d):
            os.makedirs(d)
        js_file = open(
            PROJECT_PATH +
            '/style/static/js/es6_modules/style/documentstyle-list.js',
            "w")
        js_file.write(output_js.encode('utf8'))

        js_file.close()

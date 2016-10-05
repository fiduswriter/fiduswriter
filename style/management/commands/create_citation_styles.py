import os

from fiduswriter.settings import PROJECT_PATH
from style.models import CitationStyle, CitationLocale

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = (
        'Creates CSS files with the style definitions of all the document '
        'styles'
    )

    def handle(self, *args, **options):

        output_js = (
            u'/** @file Makes a list of available styles and locals for the '
            'citation style menus. \n This file is automatically created '
            'using ./manage.py create_citation_styles\n*/\n'
        )
        output_js += u'export let citationDefinitions = {\n'

        output_js += u'    locals: {\n'
        for cl in CitationLocale.objects.order_by('language_code'):
            output_js += '        "' + cl.display_language_code() + '": "' + \
                cl.contents.replace(
                    '\r', ''
                ).replace(
                    '\n', ''
                ).replace(
                    '"', '\\"'
                ) + '",\n'
        output_js += '    },'
        output_js += '\n'

        output_js += '    styles: {\n'

        first_cs = False
        for cs in CitationStyle.objects.order_by('short_title'):
            if not first_cs:
                first_cs = cs
            output_js += '        "' + cs.short_title + '": {\n'
            output_js += '            definition: "' + \
                cs.contents.replace(
                    '\r', ''
                ).replace(
                    '\n', ''
                ).replace(
                    '"', '\\"'
                ) + '",\n'
            output_js += '            name: "' + cs.title + '"},\n'
        output_js += '    }\n'
        output_js += '}'
        output_js += '\n'

        if first_cs:
            cs = first_cs.short_title
            output_js += 'export let defaultCitationStyle = "' + cs + '"'

        d = os.path.dirname(
            PROJECT_PATH +
            '/style/static/js/es6_modules/style/citation-definitions.js')
        if not os.path.exists(d):
            os.makedirs(d)
        js_file = open(
            PROJECT_PATH +
            '/style/static/js/es6_modules/style/citation-definitions.js',
            "w")
        js_file.write(output_js.encode('utf8'))

        js_file.close()

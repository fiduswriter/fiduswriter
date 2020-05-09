from django.core.management.base import BaseCommand
import zipfile
import os
import shutil
import magic

from django.conf import settings


def zip_folder(path, zip_file):
    file_paths = []
    for root, dirs, files in os.walk(path):
        for file in files:
            out_file = os.path.join(root, file)
            relative_out_file = os.path.relpath(out_file, path)
            zip_file.write(out_file, relative_out_file)
            mimetype = magic.from_file(out_file, mime=True)
            # Override mimetype for CSS files
            if out_file.split('.')[-1].lower() == 'css':
                mimetype = 'text/css'
            file_paths.append({
                'path': relative_out_file,
                'mimetype': mimetype
            })
    return file_paths


def opf_entries(file_paths):
    opf_text = (
        '// This file is auto-generated. CHANGES WILL BE OVERWRITTEN! '
        'Re-generate by running ./manage.py bundle_mathlive.\n'
    )
    opf_text += 'export const mathliveOpfIncludes = `\n'
    for index, file_path in enumerate(file_paths):
        mimetype = file_path['mimetype']
        path = file_path['path']
        if path.split('.')[-1] == 'woff':
            mimetype = 'font/woff'
        elif path.split('.')[-1] == 'woff2':
            mimetype = 'font/woff2'
        opf_text += \
            '<item id="mathlive-%d" href="css/%s" media-type="%s" />\n' % (
                index,
                path,
                mimetype
            )
    opf_text += '`'
    return opf_text


class Command(BaseCommand):
    args = ''
    help = (
        'Create a zip file containing the mathlive style files to be bundled '
        'with EPUB and HTML exports'
    )

    def handle(self, *args, **options):
        print("Bundling MathLive")
        # Copy MathLive CSS
        mathlive_css_path = os.path.join(
            settings.PROJECT_PATH, "static-libs/css/libs/mathlive/")
        if not os.path.exists(mathlive_css_path):
            os.makedirs(mathlive_css_path)
        with open(os.path.join(
            settings.PROJECT_PATH,
            ".transpile/node_modules/mathlive/dist/mathlive.css"
        )) as f:
            with open(os.path.join(
                mathlive_css_path,
                "mathlive.css"
            ), 'w') as g:
                g.write(f.read().replace('url(fonts/', 'url(media/'))
        mathlive_fonts_path = os.path.join(
            settings.PROJECT_PATH, "static-libs/css/libs/mathlive/media/")
        if not os.path.exists(mathlive_fonts_path):
            os.makedirs(mathlive_fonts_path)
        fontfiles_src_path = os.path.join(
            settings.PROJECT_PATH,
            ".transpile/node_modules/mathlive/dist/fonts/"
        )
        fontfiles = os.listdir(fontfiles_src_path)
        for filename in fontfiles:
            if filename[0] == '.':
                continue
            full_filename = os.path.join(fontfiles_src_path, filename)
            if os.path.isfile(full_filename):
                shutil.copy(full_filename, mathlive_fonts_path)
        zip_file_path = os.path.join(
            settings.PROJECT_PATH, 'static-libs/zip/mathlive_style.zip')
        zip_dir = os.path.dirname(zip_file_path)
        if not os.path.exists(zip_dir):
            os.makedirs(zip_dir)
        if os.path.exists(zip_file_path):
            os.remove(zip_file_path)
        zip_file = zipfile.ZipFile(zip_file_path, 'w', zipfile.ZIP_DEFLATED)
        in_dir = os.path.dirname(mathlive_css_path)
        file_paths = zip_folder(in_dir, zip_file)
        zip_file.close()

        opf_file_contents = opf_entries(file_paths)
        opf_file_path = os.path.join(
            settings.PROJECT_PATH,
            'static-libs/js/modules/mathlive/opf_includes.js'
        )
        opf_dir = os.path.dirname(opf_file_path)
        if not os.path.exists(opf_dir):
            os.makedirs(opf_dir)
        opf_file = open(opf_file_path, "wb")
        opf_file.write(opf_file_contents.encode('utf8'))
        opf_file.close()

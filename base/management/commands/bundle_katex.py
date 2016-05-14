from django.core.management.base import BaseCommand
import zipfile
import os
import magic
from subprocess import call

from fiduswriter.settings import PROJECT_PATH

def zip_folder(path, zip_file):
    file_paths = []
    for root, dirs, files in os.walk(path):
        for file in files:
            out_file = os.path.join(root, file)
            relative_out_file = os.path.relpath(out_file, path)
            zip_file.write(out_file, relative_out_file)
            mimetype = magic.from_file(out_file, mime=True)
            # Override mimetype for CSS files
            if out_file.split('.')[-1].lower()== 'css':
                mimetype = 'text/css'
            file_paths.append({
                'path': relative_out_file,
                'mimetype': mimetype
            })
    return file_paths

def opf_entries(file_paths):
    opf_text = '// This file is auto-generated. CHANGES WILL BE OVERWRITTEN! Re-generate by running ./manage.py bundle_katex.\n'
    opf_text += 'export let katexOpfIncludes = `\n'
    for index, file_path in enumerate(file_paths):
        opf_text += '<item id="katex-%d" href="%s" media-type="%s" />\n' % (index, file_path['path'], file_path['mimetype'])
    opf_text += '`'
    return opf_text

class Command(BaseCommand):
    args = ''
    help = 'Create a zip file containing the katex style files to be bundled with EPUB and HTML exports'

    def handle(self, *args, **options):
        print("Bundling KaTeX")
        # Copy KaTeX CSS
        katex_css_path = os.path.join(PROJECT_PATH, "base/static/css/libs/katex/")
        if not os.path.exists(katex_css_path):
            os.makedirs(katex_css_path)
        call(["cp", "node_modules/katex/dist/katex.min.css", "base/static/css/libs/katex"])
        call(["cp", "-R", "node_modules/katex/dist/fonts", "base/static/css/libs/katex"])
        zip_file_path = os.path.join(PROJECT_PATH, 'base/static/zip/katex-style.zip')
        zip_dir = os.path.dirname(zip_file_path)
        if not os.path.exists(zip_dir):
            os.makedirs(zip_dir)
        if os.path.exists(zip_file_path):
            os.remove(zip_file_path)
        zip_file = zipfile.ZipFile(zip_file_path, 'w', zipfile.ZIP_DEFLATED)
        in_dir = os.path.dirname(katex_css_path)
        file_paths = zip_folder(in_dir, zip_file)
        zip_file.close()

        opf_file_contents = opf_entries(file_paths)
        opf_file_path = os.path.join(PROJECT_PATH,'base/static/js/es6_modules/katex/opf-includes.js')
        opf_dir = os.path.dirname(opf_file_path)
        if not os.path.exists(opf_dir):
            os.makedirs(opf_dir)
        opf_file = open(opf_file_path, "w")
        opf_file.write(opf_file_contents.encode('utf8'))
        opf_file.close()

from django.core.management.base import BaseCommand
import zipfile
import os
import magic

from fiduswriter.settings import PROJECT_PATH

def zip_dir(path, zip_file):
    file_paths = []
    for root, dirs, files in os.walk(path):
        for file in files:
            out_file = os.path.join(root, file)
            relative_out_file = os.path.relpath(out_file, path)
            zip_file.write(out_file, relative_out_file)
            mimetype = magic.from_file(out_file, mime=True)
            file_paths.append({
                'path': relative_out_file,
                'mimetype': mimetype
            })
    return file_paths

def opf_entries(file_paths):
    opf_text = ''
    for index, file_path in enumerate(file_paths):
        opf_text += '<item id="katex-%d" href="%s" media-type="%s" />\n' % (index, file_path['path'], file_path['mimetype'])
    return opf_text.strip()

class Command(BaseCommand):
    args = ''
    help = 'Create a zip file containing the katex style files to be bundled with EPUB and HTML exports'

    def handle(self, *args, **options):
        out_file = PROJECT_PATH+'/base/static/zip/katex-style.zip'
        out_dir = os.path.dirname(out_file)
        if not os.path.exists(out_dir):
            os.makedirs(out_dir)
        if os.path.exists(out_file):
            os.remove(out_file)
        compressed_file = zipfile.ZipFile(out_file, 'w', zipfile.ZIP_DEFLATED)
        in_dir = os.path.dirname(PROJECT_PATH+'/base/static/css/libs/katex/')
        file_paths = zip_dir(in_dir, compressed_file)
        compressed_file.close()
        opf_file_contents = opf_entries(file_paths)
        contents_file =  open(PROJECT_PATH+"/base/static/zip/katex-opf-includes.txt", "w")
        contents_file.write(opf_file_contents.encode('utf8'))
        contents_file.close()

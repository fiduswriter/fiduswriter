from django.core.management.base import BaseCommand
import zipfile
import os

from fiduswriter.settings import PROJECT_PATH

def zip_dir(path, zip_file):
    out_files = ''
    for root, dirs, files in os.walk(path):
        for file in files:
            out_file = os.path.join(root, file)
            relative_out_file = os.path.relpath(out_file, path)
            zip_file.write(out_file, relative_out_file)
            out_files += relative_out_file + '\n'
    return out_files.strip()

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
        files = zip_dir(in_dir, compressed_file)
        compressed_file.close()
        contents_file =  open(PROJECT_PATH+"/base/static/zip/katex-style-contents.txt", "w")
        contents_file.write(files.encode('utf8'))
        contents_file.close()

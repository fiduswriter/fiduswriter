import os
import tempfile
import shutil
import urllib

from django.core.management.commands import makemessages
from django.core.management import call_command
from django.core.management.utils import popen_wrapper

# This makes makemessages create both translations for Python and JavaScript
# code in one go.
#
# Additionally, it works around xgettext not being able to work with ES2015
# template strings [1] by transpiling the JavaScript files in a special way to
# replace all template strings.
#
# [1] https://savannah.gnu.org/bugs/?50920


class Command(makemessages.Command):

    def handle(self, *args, **options):
        call_command("transpile")
        options['ignore_patterns'] += [
            'venv',
            'node_modules',
            'static-transpile'
        ]
        options['domain'] = 'django'
        super().handle(*args, **options)
        options['domain'] = 'djangojs'
        self.temp_dir_out = tempfile.mkdtemp()
        self.temp_dir_in = tempfile.mkdtemp()
        super().handle(*args, **options)
        shutil.rmtree(self.temp_dir_in)
        shutil.rmtree(self.temp_dir_out)

    def process_locale_dir(self, locale_dir, files):
        if self.domain == 'djangojs':
            for file in files:
                # We need to copy the JS files first, as otherwise babel will
                # attempt to read package.json files in subdirs, such as
                # base/package.json
                in_path = urllib.parse.urljoin(
                    self.temp_dir_in + '/',
                    file.dirpath
                )
                os.makedirs(in_path, exist_ok=True)
                in_file = urllib.parse.urljoin(
                    in_path + '/',
                    file.file
                )
                shutil.copy2(file.path, in_file)
                out_path = urllib.parse.urljoin(
                    self.temp_dir_out + '/',
                    file.dirpath
                )
                file.dirpath = out_path
            os.chdir('.transpile/')
            out, err, status = popen_wrapper([
                'npm',
                'run',
                'babel-transform-template-literals',
                '--',
                '--out-dir',
                self.temp_dir_out,
                self.temp_dir_in
            ])
            os.chdir('../')

        super().process_locale_dir(locale_dir, files)

    def write_po_file(self, potfile, locale):
        if self.domain == 'djangojs':
            with open(potfile, encoding='utf-8') as fp:
                msgs = fp.read()
            # Remove temp dir path info
            msgs = msgs.replace(self.temp_dir_out+"/", "")
            with open(potfile, 'w', encoding='utf-8') as fp:
                fp.write(msgs)
        super().write_po_file(potfile, locale)

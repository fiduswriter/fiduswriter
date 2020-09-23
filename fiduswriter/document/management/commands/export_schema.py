from django.core.management.base import BaseCommand
import os
import subprocess
from tempfile import mkstemp

from django.conf import settings
from django.core.management import call_command


class Command(BaseCommand):
    help = (
        'Copy the document schema used in the frontend to a JSON file so that '
        'also the backend can make use of it.'
    )

    def handle(self, *args, **options):
        self.stdout.write("Copying document schema")
        call_command("npm_install")
        json_path = os.path.join(
            settings.PROJECT_PATH,
            "static-libs/json/"
        )
        if not os.path.exists(json_path):
            os.makedirs(json_path)
        schema_json_path = os.path.join(
            json_path,
            "schema.json"
        )
        js_file = open(os.path.join(
            settings.PROJECT_PATH,
            "static-transpile/js/schema_export.js"
        ))
        js = js_file.read()
        js_file.close()
        node_file, node_file_path = mkstemp()
        with open(node_file, 'w') as f:
            f.write('global.window = {}; global.gettext = ()=>{};\n' + js)
        json = subprocess.check_output(["node", node_file_path]).decode(
            'utf-8'
        )
        os.unlink(node_file_path)
        schema_json = open(schema_json_path, 'w')
        schema_json.write(json)
        schema_json.close()

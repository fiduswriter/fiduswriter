from pathlib import Path
import shutil
from subprocess import call

from base.management import BaseCommand
from django.core.management import call_command
from django.conf import settings


BABEL_CONF = """
module.exports = {
    presets: [
        [
            '@babel/preset-env',
            {
                targets: {
                    node: 'current',
                },
            },
        ],
    ],
}
"""


class Command(BaseCommand):
    help = "Run jest unit tests."

    def handle(self, *ars, **options):
        call_command("transpile")
        p = Path(settings.PROJECT_PATH) / ".transpile"
        shutil.os.chdir(p)
        conf_file = p / "babel.config.js"

        if not conf_file.exists():
            self.stdout.write(f'Creating "babel.config.js" at {p}.')
            conf_file.write_text(BABEL_CONF)

        command_array = [
            p / "node_modules" / ".bin" / "jest",
            "--no-cache",
            "--passWithNoTests",
        ]
        return_value = call(command_array)
        if return_value > 0:
            exit(return_value)

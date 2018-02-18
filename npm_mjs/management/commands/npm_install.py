import os
import pickle
import shutil
from subprocess import call

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.conf import settings
from django.apps import apps as django_apps

from npm_mjs import signals

if settings.SETTINGS_PATHS:
    SETTINGS_PATHS = settings.SETTINGS_PATHS
else:
    SETTINGS_PATHS = []

if settings.PROJECT_PATH:
    PROJECT_PATH = settings.PROJECT_PATH
else:
    PROJECT_PATH = "./"

transpile_time_path = os.path.join(
    PROJECT_PATH,
    ".transpile-time"
)

try:
    with open(
        transpile_time_path,
        'rb'
    ) as f:
        LAST_RUN = pickle.load(f)
except EOFError:
    LAST_RUN = 0
except IOError:
    LAST_RUN = 0


def install_npm():
    change_times = [0, ]
    for path in SETTINGS_PATHS:
        change_times.append(os.path.getmtime(path))
    settings_change = max(change_times)
    package_path = os.path.join(
        PROJECT_PATH,
        "package.json"
    )
    if os.path.exists(package_path):
        package_change = os.path.getmtime(package_path)
    else:
        package_change = -1
    app_package_change = 0
    configs = django_apps.get_app_configs()
    for config in configs:
        app_package_path = os.path.join(config.path, "package.json")
        if os.path.exists(app_package_path):
            app_package_change = max(
                os.path.getmtime(app_package_path),
                app_package_change
            )
    npm_install = False
    node_modules_path = os.path.join(
        PROJECT_PATH,
        "node_modules"
    )
    if (
        settings_change > LAST_RUN or
        app_package_change > package_change
    ):
        if os.path.exists(node_modules_path):
            shutil.rmtree(node_modules_path)
        call_command("create_package_json")
        call(["npm", "install"])
        signals.post_npm_install.send(sender=None)
        npm_install = True
    return npm_install


class Command(BaseCommand):
    def handle(self, *args, **options):
        self.stdout.write("Installing npm dependencies...")
        install_npm()

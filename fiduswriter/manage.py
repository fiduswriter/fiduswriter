#!/usr/bin/env python3
import os
import sys
from importlib import import_module

from django.conf import settings

if "COVERAGE_PROCESS_START" in os.environ:
    import coverage
    coverage.process_startup()

SRC_PATH = os.path.dirname(os.path.realpath(__file__))
os.environ.setdefault(
    "SRC_PATH",
    SRC_PATH
)


def inner(default_project_path):
    sys.path.append(SRC_PATH)
    sys_argv = sys.argv
    if '--pythonpath' in sys_argv:
        index = sys_argv.index('--pythonpath')
        PROJECT_PATH = os.path.join(os.getcwd(), sys_argv[index + 1])
        # We prevent the pythonpath to be handled later on by removing it from
        # sys_argv
        sys_argv = sys_argv[:index] + sys_argv[index+2:]
    else:
        PROJECT_PATH = default_project_path
    sys.path.insert(0, PROJECT_PATH)
    os.environ.setdefault(
        "PROJECT_PATH",
        PROJECT_PATH
    )
    if '--settings' in sys_argv:
        index = sys_argv.index('--settings')
        SETTINGS_MODULE = sys_argv[index + 1]
    else:
        SETTINGS_MODULE = 'configuration'
    mod = False
    # There are three levels of settings, each overiding the previous one:
    # global_settings.py, default_settings.py and configuration.py
    from django.conf import global_settings as CONFIGURATION
    from base import default_settings
    SETTINGS_PATHS = [default_settings.__file__]
    for setting in dir(default_settings):
        setting_value = getattr(default_settings, setting)
        setattr(CONFIGURATION, setting, setting_value)
    try:
        mod = import_module(SETTINGS_MODULE)
    except ModuleNotFoundError:
        SETTINGS_MODULE = None
    if mod:
        SETTINGS_PATHS.append(mod.__file__)
        for setting in dir(mod):
            if setting.isupper():
                setattr(CONFIGURATION, setting, getattr(mod, setting))
    INSTALLED_APPS = CONFIGURATION.BASE_INSTALLED_APPS + list(
        CONFIGURATION.INSTALLED_APPS
    )
    for app in CONFIGURATION.REMOVED_APPS:
        INSTALLED_APPS.remove(app)
    settings.configure(
        CONFIGURATION,
        SETTINGS_MODULE=SETTINGS_MODULE,
        SETTINGS_PATHS=SETTINGS_PATHS,
        INSTALLED_APPS=INSTALLED_APPS,
        MIDDLEWARE=CONFIGURATION.BASE_MIDDLEWARE +
        list(CONFIGURATION.MIDDLEWARE)
    )
    os.environ['TZ'] = settings.TIME_ZONE
    from django.core.management import execute_from_command_line
    execute_from_command_line(sys_argv)


def entry():
    os.environ.setdefault(
        "NO_COMPILEMESSAGES",
        'true'
    )
    inner(os.getcwd())


if __name__ == "__main__":
    inner(SRC_PATH)

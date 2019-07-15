#!/usr/bin/env python3
import os
import sys
from importlib import import_module

from django.conf import settings

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
        sys.path.insert(0, PROJECT_PATH)
        # We prevent the pythonpath to be handled later on by removing it from
        # sys_argv
        sys_argv = sys_argv[:index] + sys_argv[index+2:]
        # If the project lives in another directory we skip recompiling the
        # messages as there are likely several installations running.
        os.environ.setdefault(
            "NO_COMPILEMESSAGES",
            'true'
        )
    else:
        PROJECT_PATH = default_project_path
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
    from core import default_settings
    for setting in dir(default_settings):
        setting_value = getattr(default_settings, setting)
        setattr(CONFIGURATION, setting, setting_value)
    try:
        mod = import_module(SETTINGS_MODULE)
    except ModuleNotFoundError:
        SETTINGS_MODULE = None
    if mod:
        for setting in dir(mod):
            if setting.isupper():
                setting_value = getattr(mod, setting)
                if setting == 'INSTALLED_PLUGINS':
                    # plugins are added to INSTALLED_APPS
                    setting_value = default_settings.INSTALLED_APPS + \
                        setting_value
                    setting = 'INSTALLED_APPS'
                setattr(CONFIGURATION, setting, setting_value)
    settings.configure(
        CONFIGURATION,
        SETTINGS_MODULE=SETTINGS_MODULE
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

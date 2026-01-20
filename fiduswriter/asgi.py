import os
import sys
from importlib import import_module
import django

from channels.routing import get_default_application


# os.environ["DJANGO_ALLOW_ASYNC_UNSAFE"] = "true"

SRC_PATH = os.path.dirname(os.path.realpath(__file__))
os.environ.setdefault("SRC_PATH", SRC_PATH)

sys.path.append(SRC_PATH)
sys_argv = sys.argv
PROJECT_PATH = os.environ.get("PROJECT_PATH", os.getcwd())
# Add PROJECT_PATH to sys.path for consistency with manage.py
# Note: In production, PYTHONPATH should include both /etc/fiduswriter
# (for configuration.py) and /var/lib/fiduswriter (for project files)
if PROJECT_PATH and PROJECT_PATH not in sys.path:
    sys.path.insert(0, PROJECT_PATH)
os.environ.setdefault("PROJECT_PATH", PROJECT_PATH)
SETTINGS_MODULE = "configuration"
mod = False
# There are three levels of settings, each overiding the previous one:
# global_settings.py, settings.py and configuration.py
from django.conf import global_settings as CONFIGURATION  # noqa
from base import settings as SETTINGS  # noqa

SETTINGS_PATHS = [SETTINGS.__file__]
for setting in dir(SETTINGS):
    setting_value = getattr(SETTINGS, setting)
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

# Check if axes is enabled (not in REMOVED_APPS)
axes_enabled = "axes" in INSTALLED_APPS

# Merge MIDDLEWARE - conditionally add AXES_BASE_MIDDLEWARE
middleware_list = list(CONFIGURATION.BASE_MIDDLEWARE)
if axes_enabled and hasattr(CONFIGURATION, "AXES_BASE_MIDDLEWARE"):
    middleware_list.extend(CONFIGURATION.AXES_BASE_MIDDLEWARE)
middleware_list.extend(CONFIGURATION.MIDDLEWARE)

# Merge AUTHENTICATION_BACKENDS - conditionally add AXES_AUTHENTICATION_BACKENDS
if axes_enabled:
    if hasattr(CONFIGURATION, "AXES_AUTHENTICATION_BACKENDS") and hasattr(
        CONFIGURATION, "BASE_AUTHENTICATION_BACKENDS"
    ):
        auth_backends = tuple(
            CONFIGURATION.AXES_AUTHENTICATION_BACKENDS
            + CONFIGURATION.BASE_AUTHENTICATION_BACKENDS
        )
    else:
        auth_backends = CONFIGURATION.AUTHENTICATION_BACKENDS
else:
    if hasattr(CONFIGURATION, "BASE_AUTHENTICATION_BACKENDS"):
        auth_backends = tuple(CONFIGURATION.BASE_AUTHENTICATION_BACKENDS)
    else:
        auth_backends = CONFIGURATION.AUTHENTICATION_BACKENDS

from django.conf import settings  # noqa

settings.configure(
    CONFIGURATION,
    SETTINGS_MODULE=SETTINGS_MODULE,
    SETTINGS_PATHS=SETTINGS_PATHS,
    INSTALLED_APPS=INSTALLED_APPS,
    MIDDLEWARE=middleware_list,
    AUTHENTICATION_BACKENDS=auth_backends,
)
django.setup()

application = get_default_application()

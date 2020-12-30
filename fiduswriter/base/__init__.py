import os
from django.conf import settings
"""
Application that contains main app settings
(Hosts, middleware, templates, installed apps)
Urls to route between applications,
statics that are shared among different django applications
Also contains helper for starting tornado server and management commands
"""
default_app_config = 'base.apps.BaseConfig'


def read_version():
    with open(
        os.path.join(
            settings.SRC_PATH,
            "version.txt"
        )
    ) as f:
        return f.read().splitlines()[0]


__version__ = False


def get_version():
    global __version__
    if not __version__:
        __version__ = read_version()
    return __version__

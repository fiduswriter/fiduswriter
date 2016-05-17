import os
import sys
import site
import inspect
from django.core.wsgi import get_wsgi_application

PROJECT_ROOT = os.path.dirname(
    os.path.abspath(
        inspect.getfile(
            inspect.currentframe())))
site_packages = os.path.join(PROJECT_ROOT,
                             'fiduswriter-venv/lib/python2.6/site-packages')
site.addsitedir(os.path.abspath(site_packages))
sys.path.insert(0, PROJECT_ROOT)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "fiduswriter.settings")

# This application object is used by any WSGI server configured to use this
# file. This includes Django's development server, if the WSGI_APPLICATION
# setting points here.

application = get_wsgi_application()

# Apply WSGI middleware here.
# from helloworld.wsgi import HelloWorldApplication
# application = HelloWorldApplication(application)

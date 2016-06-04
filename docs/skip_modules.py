import inspect
from django.utils.html import strip_tags
from django.utils.encoding import force_unicode

def skip_modules(app, what, name, obj, skip, options):
    print name + " " + what
    if name in ["admin", "tests"]:
        return False
    return skip
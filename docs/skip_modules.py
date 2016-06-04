import inspect
import re
from django.utils.html import strip_tags
from django.utils.encoding import force_unicode

def skip_modules(app, what, name, obj, skip, options):
    """
    Defines __init__ not to be skipped by sphinx
    Args:
        app ():
        what ():
        name ():
        obj ():
        skip ():
        options ():

    Returns:

    """
    if name == "__init__":
        return False
    return skip
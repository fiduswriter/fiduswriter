

def skip_modules(app, what, name, obj, skip, options):
    """
    Defines __init__ not to be skipped by sphinx
    Used in conf.py
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

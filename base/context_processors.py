from django.conf import settings


def js_locations(request):
    """
    Adds js-libraries related context variables to the context.

    """
    return settings.JS_LOCATIONS


def css_locations(request):
    """
    Adds css-libraries related context variables to the context.

    """
    return settings.CSS_LOCATIONS


def server_info(request):
    """
    Gives more info about the server to the templates.

    """
    return settings.SERVER_INFO

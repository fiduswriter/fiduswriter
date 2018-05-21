from __future__ import unicode_literals
from django.conf import settings


def server_info(request):
    """
    Gives more info about the server to the templates.

    """
    return settings.SERVER_INFO

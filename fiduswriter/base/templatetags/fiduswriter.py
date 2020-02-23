from django import template
from django.conf import settings
from allauth.socialaccount.models import providers
from django.contrib.staticfiles.storage import staticfiles_storage

register = template.Library()


@register.inclusion_tag('fiduswriter/config.html', takes_context=True)
def fiduswriter_config_js(context):
    """
    Add Fidus Writer config variables to the window object in JavaScript.
    Usage::
        {% fiduswriter_config_js %}
    """
    socialaccount_providers = []
    for provider in providers.registry.get_list():
        socialaccount_providers.append({
            'id': provider.id,
            'name': provider.name,
            'login_url': provider.get_login_url(context['request'])
        })
    return {
        'ws_port': getattr(settings, 'WS_PORT', ''),
        'ws_server': getattr(settings, 'WS_SERVER', ''),
        'contact_email': settings.CONTACT_EMAIL,
        'test_server': (
            'true' if settings.TEST_SERVER else 'false'
        ),
        'is_free': ('true' if settings.IS_FREE else 'false'),
        'registration_open': (
            'true' if settings.REGISTRATION_OPEN else 'false'
        ),
        'language': context['request'].LANGUAGE_CODE,
        'socialaccount_providers': socialaccount_providers,
        'debug': (
            'true' if settings.DEBUG else 'false'
        )
    }

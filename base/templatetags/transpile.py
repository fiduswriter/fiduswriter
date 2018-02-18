import re
from urllib.parse import quote, urljoin
from django import template
from django.templatetags.static import StaticNode, PrefixNode
from django.apps import apps

from base.management.commands.transpile import LAST_RUN

register = template.Library()


class StaticTranspileNode(StaticNode):
    def url(self, context):
        path = re.sub(
            r'^js/(.*)\.mjs',
            r'js/transpile/\1.js',
            self.path.resolve(context)
        )
        return self.handle_simple(path)

    @classmethod
    def handle_simple(cls, path):
        if apps.is_installed('django.contrib.staticfiles'):
            from django.contrib.staticfiles.storage import staticfiles_storage
            return staticfiles_storage.url(path) + '?version=%s' % LAST_RUN
        else:
            return (
                urljoin(
                    PrefixNode.handle_simple("STATIC_URL"),
                    quote(path)
                ) + '?version=%s' % LAST_RUN
            )


@register.tag('transpile-static')
def do_transpile_static(parser, token):
    """
    Join the given path with the STATIC_URL setting adding a version number
    and the location of the transpile folder.
    Usage::
        {% transpile-static path [as varname] %}
    Examples::
        {% transpile-static "js/index.js" %}
        {% transpile-static variable_with_path %}
        {% transpile-static variable_with_path as varname %}
    """
    return StaticTranspileNode.handle_token(parser, token)

from importlib import import_module

from django.conf.urls import include, url
from django.http import HttpResponse
from django.contrib import admin
from django.urls import path
from django.conf import settings
from django.views.i18n import JavaScriptCatalog

from base.views import app as app_view
from base.views import admin_console as admin_console_view


admin.site.site_header = settings.ADMIN_SITE_HEADER
admin.site.site_title = settings.ADMIN_SITE_TITLE
admin.site.index_title = settings.ADMIN_INDEX_TITLE
admin.site.index_template = 'admin/overview.html'
admin_site_urls = (admin.site.urls[0] + [
    url(
        r'console/$',
        admin.site.admin_view(admin_console_view, cacheable=True),
        name="admin_console"
    ),
], admin.site.urls[1], admin.site.urls[2])

# Django URLs -- Notice that these are only consulted after the
# tornado_url_list found in base/servers/tornado_django_hybrid.py
urlpatterns = [
    url(
        '^robots.txt$',
        lambda r: HttpResponse(
            "User-agent: *\nDisallow: /document/\nDisallow: /bibliography/",
            mimetype="text/plain"
        )
    ),

    # I18n manual language switcher
    url('^api/i18n/', include('django.conf.urls.i18n')),

    # I18n Javascript translations
    url(
        r'^api/jsi18n/$',
        JavaScriptCatalog.as_view(),
        name='javascript-catalog'
    ),

    # Admin interface
    path('admin/', admin_site_urls),

]

for app in settings.INSTALLED_APPS:
    try:
        _module = import_module('%s.urls' % app)
    except ImportError:
        pass
    else:
        app_name = app.rsplit('.', 1).pop()
        urlpatterns += [url('^api/%s/' % app_name, include('%s.urls' % app))]

if settings.DEBUG:
    from django.views.static import serve as static_serve
    urlpatterns += [
        url('^media/(?P<path>.*)$', static_serve, {
            'document_root': settings.MEDIA_ROOT,
        }),
    ]

if hasattr(settings, 'EXTRA_URLS'):
    for extra_url in settings.EXTRA_URLS:
        urlpatterns += [
            url(extra_url[0], include(extra_url[1])),
        ]

urlpatterns += [
    url('^.*/$', app_view, name='app'),
    url('^$', app_view, name='app')
]

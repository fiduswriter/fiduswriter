from django.conf.urls import include, url
from django.http import HttpResponse
from django.contrib import admin
import settings
from user.views import logout_page
from django.contrib.flatpages import views as flatpages_views
from document.views import index as document_index

from django.views.i18n import javascript_catalog as i18n_javascript_catalog
from django.contrib.auth.views import login as login_view


admin.autodiscover()

js_info_dict = {
    'packages': (
        'django.conf',
    ),
}


urlpatterns = [
    url('^$', document_index, name='index'),
    url(
        '^robots\.txt$',
        lambda r: HttpResponse(
            "User-agent: *\nDisallow: /text/\nDisallow: /bibliography/",
            mimetype="text/plain"
        )
    ),
    url('^js_error_hook/', include('django_js_error_hook.urls')),
    url('^document/', include('document.urls')),
    url('^bibliography/', include('bibliography.urls')),

    # I18n manual language switcher
    url('^i18n/', include('django.conf.urls.i18n')),



    # I18n Javascript translations
    url('^jsi18n/$', i18n_javascript_catalog, js_info_dict),


    # Login / logout.
    url('^login/$', login_view),
    url('^logout/$', logout_page, name='logout'),

    # Admin interface
    url('^admin/doc/', include('django.contrib.admindocs.urls')),
    url('^admin/', include(admin.site.urls)),

    # Account management
    url('^account/', include('user.urls')),

    # Media manager
    url('^usermedia/', include('usermedia.urls')),

    # Media manager
    url('^book/', include('book.urls')),

    # Feedback
    url('^feedback/', include('feedback.urls')),

    # Terms and conditions
    url('^terms/$', flatpages_views.flatpage,
        {'url': '/terms/'}, name='terms'),
]

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

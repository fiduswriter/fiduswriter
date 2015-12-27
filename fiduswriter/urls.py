#
# This file is part of Fidus Writer <http://www.fiduswriter.org>
#
# Copyright (C) 2013 Takuto Kojima, Johannes Wilm
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as
# published by the Free Software Foundation, either version 3 of the
# License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.

from django.conf.urls import include, url
from django.http import HttpResponse
from django.contrib import admin
admin.autodiscover()

import settings

from user.views import logout_page


from django.contrib.flatpages import views as flatpages_views

js_info_dict = {
    'packages': (
        'django.conf',
     ),
}

from document.views import index as document_index

from django.views.i18n import javascript_catalog as i18n_javascript_catalog
from django.contrib.auth.views import login as login_view

urlpatterns = [
    url('^$', document_index, name='index'),
    url('^robots\.txt$', lambda r: HttpResponse("User-agent: *\nDisallow: /text/\nDisallow: /bibliography/", mimetype="text/plain")),
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
    url('^terms/$', flatpages_views.flatpage, {'url': '/terms/'}, name='terms'),
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

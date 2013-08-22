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

from django.conf.urls import patterns, include, url
from django.http import HttpResponse
from django.contrib import admin
admin.autodiscover()

import settings

from account.views import logout_page

js_info_dict = {
    'packages': (
        'django.conf',
     ),
}


urlpatterns = patterns('',
    url(r'^$', 'text.views.index', name='index'),
    (r'^robots\.txt$', lambda r: HttpResponse("User-agent: *\nDisallow: /text/\nDisallow: /bibliography/", mimetype="text/plain")),
    url(r'^text/', include('text.urls')),
    url(r'^bibliography/', include('bibliography.urls')),

    # I18n manual language switcher
    (r'^i18n/', include('django.conf.urls.i18n')),

    # I18n Javascript translations
    url(r'^jsi18n/$', 'django.views.i18n.javascript_catalog', js_info_dict),    
    
    
    # Login / logout.
    (r'^login/$', 'django.contrib.auth.views.login'),
    (r'^logout/$', logout_page),
    
    # Admin interface
    url(r'^admin/doc/', include('django.contrib.admindocs.urls')),
    url(r'^admin/', include(admin.site.urls)),

    # Account management
    (r'^account/', include('account.urls')),
    
    # Media manager 
    url(r'^usermedia/', include('usermedia.urls')),

    # Media manager 
    url(r'^book/', include('book.urls')),
    
    # Beta 
    url(r'^beta/', include('beta.urls')), 

)

urlpatterns += patterns('django.contrib.flatpages.views',
    # Terms and conditions
    url(r'^terms/$', 'flatpage', {'url': '/terms/'}, name='terms'),
)

if settings.DEBUG:
    urlpatterns += patterns('',
        url(r'^media/(?P<path>.*)$', 'django.views.static.serve', {
            'document_root': settings.MEDIA_ROOT,
        }),
   )

#
# This file is part of Fidus Writer <http://www.fiduswriter.com>
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

from django.conf.urls import patterns, url


urlpatterns = patterns('',
    url(r'^$', 'bibliography.views.index', name='index'),
    url(r'^import_bibtex/$', 'bibliography.views.import_bibtex_js', name='import_bibtex'),
    url(r'^save/$', 'bibliography.views.save_js', name='save'),
    url(r'^delete/$', 'bibliography.views.delete_js', name='delete'),
    url(r'^save_category/$', 'bibliography.views.save_category_js', name='save_category'),
    url(r'^delete_category/$', 'bibliography.views.delete_category_js', name='delete_category'),
    url(r'^biblist/$', 'bibliography.views.biblist_js', name='biblist')
)

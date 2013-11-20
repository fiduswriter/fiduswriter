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

from django.conf.urls import patterns, url

urlpatterns = patterns('',

    url(r'^$', 'document.views.index', name='index'),
    url(r'^new/$', 'document.views.editor', name='editor'),
    url(r'^documentlist/$', 'document.views.get_documentlist_js', name='get_documentlist_js'),
    url(r'^documentlist/extra/$', 'document.views.get_documentlist_extra_js', name='get_documentlist_extra_js'),
    url(r'^delete/$', 'document.views.delete_js', name='delete_js'),
    url(r'^import/$', 'document.views.import_js', name='import_js'),
    url(r'^upload/$', 'document.views.upload_js', name='upload_js'),
    url(r'^\d+/$', 'document.views.editor', name='editor'),
    
    url(r'^accessright/save/$', 'document.views.access_right_save_js', name='access_right_save_js'), 
)

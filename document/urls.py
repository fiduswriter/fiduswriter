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

from django.conf.urls import url

from . import views

urlpatterns = [
    url('^$', views.index, name='index'),
    url('^new/$', views.editor, name='editor'),
    url('^documentlist/$', views.get_documentlist_js, name='get_documentlist_js'),
    url('^documentlist/extra/$', views.get_documentlist_extra_js, name='get_documentlist_extra_js'),
    url('^delete/$', views.delete_js, name='delete_js'),
    url('^import/$', views.import_js, name='import_js'),
    url('^upload/$', views.upload_js, name='upload_js'),
    url('^download/$', views.download_js, name='download_js'),
    url('^delete_revision/$', views.delete_revision_js, name='delete_revision_js'),
    url('^\d+/$', views.editor, name='editor'),
    url('^accessright/save/$', views.access_right_save_js, name='access_right_save_js'),
]

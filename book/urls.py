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

    url(r'^$', 'book.views.index', name='index'),
    url(r'^booklist/$', 'book.views.get_booklist_js', name='get_booklist_js'),
    url(r'^save/$', 'book.views.save_js', name='save_js'),
    url(r'^delete/$', 'book.views.delete_js', name='delete_js'),
    url(r'^print/\d+/$', 'book.views.print_book', name='print'),
    url(r'^book/$', 'book.views.get_book_js', name='get_book_js'),
    
    url(r'^accessright/delete/$', 'book.views.access_right_delete_js', name='access_right_delete_js'),
    url(r'^accessright/save/$', 'book.views.access_right_save_js', name='access_right_save_js'), 
)

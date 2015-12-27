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

import views

urlpatterns = [
    url('^save/$', views.save_profile_js, name='save_profile_js'),

    # Show user profiles
    url('^team/$', views.list_team_members, name='list_team_members'),
    url('^profile/(?P<username>[\w\d\.\-_\@]{1,30})$', views.show_profile, name='show_userprofile'),
    url('^avatar/delete/$', views.delete_avatar_js, name="delete_avatar_js"),
    url('^avatar/upload/$', views.upload_avatar_js, name="upload_avatar_js"),
    url('^passwordchange/$', views.password_change_js, name="password_change_js"),
    url('^emailadd/$', views.add_email_js, name="add_email_js"),
    url('^emaildelete/$', views.delete_email_js, name="delete_email_js"),
    url('^emailprimary/$', views.primary_email_js, name="primary_email_js"),

    # Delete a user profile
    url('^delete/$', views.delete_user_js, name='delete_user_js'),

    url('^teammember/add', views.add_team_member_js, name='add_team_member_js'),
    url('^teammember/edit', views.change_team_member_roles_js, name='change_team_member_roles_js'),
    url('^teammember/remove', views.remove_team_member_js, name='remove_team_member_js'),

    # User avatar handling
    url('^avatar/', include('avatar.urls')),

    # Authentication handling
    url('', include('allauth.urls')),
]

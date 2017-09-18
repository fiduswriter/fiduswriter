from django.conf.urls import include, url
from . import views

urlpatterns = [
    url('^save/$', views.save_profile_js, name='save_profile_js'),

    # Show user profiles
    url('^team/$', views.list_team_members, name='list_team_members'),
    url(
        '^team/list/$',
        views.list_team_members_js,
        name='list_team_members_js'
    ),
    url(
        '^profile/(?P<username>[\w\d\.\-_\@]{1,30})$',
        views.show_profile,
        name='show_userprofile'
    ),
    url('^avatar/delete/$', views.delete_avatar_js, name="delete_avatar_js"),
    url('^avatar/upload/$', views.upload_avatar_js, name="upload_avatar_js"),
    url(
        '^passwordchange/$',
        views.password_change_js,
        name="password_change_js"
    ),
    url('^emailadd/$', views.add_email_js, name="add_email_js"),
    url('^emaildelete/$', views.delete_email_js, name="delete_email_js"),
    url('^emailprimary/$', views.primary_email_js, name="primary_email_js"),

    # Delete a user profile
    url('^delete/$', views.delete_user_js, name='delete_user_js'),

    url(
        '^teammember/add',
        views.add_team_member_js,
        name='add_team_member_js'
    ),
    url(
        '^teammember/edit',
        views.change_team_member_roles_js,
        name='change_team_member_roles_js'
    ),
    url(
        '^teammember/remove',
        views.remove_team_member_js,
        name='remove_team_member_js'
    ),

    # User avatar handling
    url('^avatar/', include('avatar.urls')),

    # Authentication handling
    url('', include('allauth.urls')),
]

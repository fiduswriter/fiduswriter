from django.conf.urls import include, url
from . import views


urlpatterns = [
    url('^save/$', views.save_profile, name='save_profile'),

    # Show user profiles
    url(
        '^team/list/$',
        views.list_team_members,
        name='list_team_members'
    ),
    url(
        '^info/$',
        views.info,
        name='info'
    ),
    url('^avatar/delete/$', views.delete_avatar, name="delete_avatar"),
    url('^avatar/upload/$', views.upload_avatar, name="upload_avatar"),
    url(
        '^passwordchange/$',
        views.password_change,
        name="password_change"
    ),
    url('^emailadd/$', views.add_email, name="add_email"),
    url('^emaildelete/$', views.delete_email, name="delete_email"),
    url('^emailprimary/$', views.primary_email, name="primary_email"),

    # Delete a user profile
    url('^delete/$', views.delete_user, name='delete_user'),

    url(
        '^teammember/add',
        views.add_team_member,
        name='add_team_member'
    ),
    url(
        '^teammember/edit',
        views.change_team_member_roles,
        name='change_team_member_roles'
    ),
    url(
        '^teammember/remove',
        views.remove_team_member,
        name='remove_team_member'
    ),

    # User avatar handling
    url('^avatar/', include('avatar.urls')),

    url(
        "^get_confirmkey_data/$",
        views.get_confirmkey_data,
        name="get_confirmkey_data"
    ),

    url(r"^signup/$", views.signup, name="account_signup"),

    # Authentication handling
    url('', include('allauth.urls')),
]

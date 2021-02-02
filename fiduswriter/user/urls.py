from django.conf.urls import include, url
from django.conf import settings
from django.views.generic import RedirectView
from . import views

urlpatterns = [
    url('^save/$', views.save_profile, name='save_profile'),

    # Show user profiles
    url(
        '^team/list/$',
        views.list_team_members,
        name='list_team_members'
    ),
    # Outdated but we need it to allow for update of 3.7 instances.
    # Can be removed in 3.9.
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

    url(
        '^socialaccountdelete/$',
        views.delete_socialaccount,
        name="delete_socialaccount"
    ),
    # Delete a user profile
    url('^delete/$', views.delete_user, name='delete_user'),

    url(
        '^teammember/add',
        views.add_team_member,
        name='add_team_member'
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

if not settings.PASSWORD_LOGIN:
    urlpatterns.insert(0, url(
        '^login/$',
        RedirectView.as_view(url='/')
    ))

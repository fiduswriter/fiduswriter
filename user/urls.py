from allauth.account import views as allauth_views
from django.conf.urls import include, url
from django.views.generic.base import RedirectView
from django.conf import settings
from . import views
from base.views import app


if settings.REGISTRATION_OPEN:
    signup_view = allauth_views.signup
else:
    signup_view = RedirectView.as_view(url='/', permanent=False)

urlpatterns = [
    url('^save/$', views.save_profile_js, name='save_profile_js'),

    # Show user profiles
    url('^team/$', app, name='list_team_members'),
    url(
        '^team/list/$',
        views.list_team_members_js,
        name='list_team_members_js'
    ),
    url(
        '^profile/$',
        app,
        name='show_userprofile'
    ),
    url(
        '^info/$',
        views.info_js,
        name='info_js'
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

    # Signup view
    url(r"^signup/$", signup_view, name="account_signup"),

    # Authentication handling
    url('', include('allauth.urls')),
]

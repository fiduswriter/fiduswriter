from django.conf.urls import include, url
from django.conf import settings
from django.views.generic import RedirectView
from . import views

urlpatterns = [
    url("^save/$", views.save_profile, name="save_profile"),
    url("^avatar/delete/$", views.delete_avatar, name="delete_avatar"),
    url("^avatar/upload/$", views.upload_avatar, name="upload_avatar"),
    url("^passwordchange/$", views.password_change, name="password_change"),
    url("^email/add/$", views.add_email, name="add_email"),
    url("^email/delete/$", views.delete_email, name="delete_email"),
    url("^email/primary/$", views.primary_email, name="primary_email"),
    url(
        "^socialaccountdelete/$",
        views.delete_socialaccount,
        name="delete_socialaccount",
    ),
    # Delete a user
    url("^delete/$", views.delete_user, name="delete_user"),
    # Show contacts
    url("^contacts/list/$", views.list_contacts, name="list_contacts"),
    url("^contacts/delete/$", views.delete_contacts, name="delete_contacts"),
    url("^invite/$", views.invite, name="invite"),
    url("^invites/add/$", views.invites_add, name="invites_add"),
    url("^invites/accept/$", views.invites_accept, name="invites_accept"),
    url("^invites/decline/$", views.invites_decline, name="invites_decline"),
    # User avatar handling
    url("^avatar/", include("avatar.urls")),
    url(
        "^get_confirmkey_data/$",
        views.get_confirmkey_data,
        name="get_confirmkey_data",
    ),
    url(r"^signup/$", views.signup, name="account_signup"),
    # Authentication handling
    url("", include("allauth.urls")),
]

if not settings.PASSWORD_LOGIN:
    urlpatterns.insert(0, url("^login/$", RedirectView.as_view(url="/")))

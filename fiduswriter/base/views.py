import json

from django.shortcuts import render
from django.views.decorators.csrf import ensure_csrf_cookie
from django.contrib.sites.shortcuts import get_current_site
from django.contrib.flatpages.models import FlatPage
from django.http import JsonResponse
from django.views.decorators.http import require_GET, require_POST
from django.contrib.admin.views.decorators import staff_member_required

from allauth.socialaccount.adapter import get_adapter
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from channels_presence.models import Room, Presence


from user.helpers import Avatars
from .decorators import ajax_required
from . import get_version


@ensure_csrf_cookie
def app(request):
    """
    Load a page controlled by the JavaScript app.
    Used all user facing pages after login.
    """
    return render(request, "app.html", {"version": get_version()})


def api_404(request):
    """
    Show a 404 error within the API.
    """
    return render(request, "api_404.html", status=404)


@ajax_required
@require_POST
def configuration(request):
    """
    Load the configuration options of the page that are request dependent.
    """
    socialaccount_providers = []
    for provider in get_adapter(request).list_providers(request):
        socialaccount_providers.append(
            {
                "id": provider.id,
                "name": provider.name,
                "login_url": provider.get_login_url(request),
            }
        )
    response = {
        "language": request.LANGUAGE_CODE,
        "socialaccount_providers": socialaccount_providers,
    }
    if request.user.is_authenticated:
        avatars = Avatars()
        response["user"] = {
            "id": request.user.id,
            "username": request.user.username,
            "first_name": request.user.first_name,
            "name": request.user.readable_name,
            "last_name": request.user.last_name,
            "avatar": avatars.get_url(request.user),
            "emails": [],
            "socialaccounts": [],
            "is_authenticated": True,
        }

        for emailaddress in request.user.emailaddress_set.all():
            email = {
                "address": emailaddress.email,
            }
            if emailaddress.primary:
                email["primary"] = True
            if emailaddress.verified:
                email["verified"] = True
            response["user"]["emails"].append(email)
        for account in request.user.socialaccount_set.all():
            try:
                provider_account = account.get_provider_account()
                response["user"]["socialaccounts"].append(
                    {
                        "id": account.id,
                        "provider": account.provider,
                        "name": provider_account.to_str(),
                    }
                )
            except KeyError:
                # Social account provider has been removed.
                pass
        response["user"]["waiting_invites"] = request.user.invites_to.exists()

    else:
        response["user"] = {"is_authenticated": False}
    return JsonResponse(response, status=200)


def manifest_json(request):
    """
    Load the manifest.json.
    """
    return render(request, "manifest.json")


# view is shown only in admin interface, so authentication is taken care of
def admin_console(request):
    """
    Load the admin console page.
    """
    return render(request, "admin/console.html")


@ajax_required
@require_GET
@staff_member_required
def connection_info(request):
    """
    Return info about currently connected clients.
    """
    response = {}
    Room.objects.prune_presences()
    Room.objects.prune_rooms()
    room = Room.objects.filter(channel_name="system_messages").first()
    if room:
        response["sessions"] = Presence.objects.filter(room=room).count()
        response["users"] = room.get_users().count()
    else:
        response["sessions"] = 0
        response["users"] = 0
    return JsonResponse(response, status=200)


@ajax_required
@require_POST
@staff_member_required
def send_system_message(request):
    """
    Send out a system message to all clients connected to the frontend.
    """
    response = {}
    message = request.POST["message"]
    channel_layer = get_channel_layer()

    async_to_sync(channel_layer.group_send)(
        "system_messages",
        {
            "type": "forward.message",
            "message": json.dumps({"type": "message", "message": message}),
        },
    )
    return JsonResponse(response, status=200)


@ajax_required
@require_POST
def flatpage(request):
    """
    Models: `flatpages.flatpages`
    Context:
        flatpage
            `flatpages.flatpages` object
    """
    response = {}
    status = 404
    url = request.POST["url"]
    site_id = get_current_site(request).id
    flatpage = FlatPage.objects.filter(url=url, sites=site_id).first()
    if flatpage:
        status = 200
        response["title"] = flatpage.title
        response["content"] = flatpage.content
    return JsonResponse(response, status=status)

import json

from django.http import JsonResponse
from django.contrib.auth import logout, update_session_auth_hash
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.conf import settings
from django.shortcuts import HttpResponseRedirect
from django.views.decorators.http import require_POST

from base.decorators import ajax_required
from .forms import UserForm, TeamMemberForm
from . import util as userutil
from document.models import AccessRight, AccessRightInvite

from allauth.account.models import (
    EmailAddress,
    EmailConfirmation,
    EmailConfirmationHMAC
)
from allauth.account.views import SignupView
from allauth.account import signals
from allauth.socialaccount.models import SocialAccount
from allauth.socialaccount.signals import social_account_removed
from django.contrib.auth.forms import PasswordChangeForm
from allauth.account.forms import AddEmailForm

from avatar.models import Avatar
from avatar import views as avatarviews
from avatar.forms import UploadAvatarForm
from avatar.signals import avatar_updated

from document.views import apply_invite


# Outdated but we need it to allow for update of 3.7 instances.
# Can be removed in 3.9.
def info(request):
    return JsonResponse({'is_authenticated': False})


@login_required
@ajax_required
@require_POST
def password_change(request):
    '''
    Change password
    '''
    response = {}
    form = PasswordChangeForm(user=request.user, data=request.POST)
    if form.is_valid():
        status = 200
        form.save()
        # Updating the password logs out all other sessions for the user
        # except the current one.
        update_session_auth_hash(request, form.user)
    else:
        response['msg'] = form.errors
        status = 201

    return JsonResponse(
        response,
        status=status
    )


@login_required
@ajax_required
@require_POST
def add_email(request):
    '''
    Add email address
    '''
    response = {}
    add_email_form = AddEmailForm(request.user, request.POST)
    if add_email_form.is_valid():
        status = 200
        email_address = add_email_form.save(request)
        signals.email_added.send(
            sender=request.user.__class__,
            request=request, user=request.user,
            email_address=email_address
        )
    else:
        status = 201
        response['msg'] = add_email_form.errors

    return JsonResponse(
        response,
        status=status
    )


@login_required
@ajax_required
@require_POST
def delete_email(request):
    response = {}
    email = request.POST["email"]
    response['msg'] = "Removed e-mail address " + email
    status = 200
    email_address = EmailAddress.objects.filter(
        user=request.user,
        email=email,
        primary=False
    ).first()
    if not email_address:
        return JsonResponse(
            {'msg': 'Cannot remove email.'},
            status=404
        )
    email_address.delete()
    signals.email_removed.send(
        sender=request.user.__class__,
        request=request,
        user=request.user,
        email_address=email_address
    )
    return JsonResponse(
        response,
        status=status
    )


@login_required
@ajax_required
@require_POST
def primary_email(request):
    response = {}
    email = request.POST["email"]
    email_address = EmailAddress.objects.filter(
        user=request.user,
        email=email,
        verified=True
    ).first()
    if not email_address:
        return JsonResponse({'msg': 'Cannot set primary email.'}, 404)
    from_email_address = EmailAddress.objects.filter(
        user=request.user,
        primary=True
    ).first()
    status = 200
    email_address.set_as_primary()
    response['msg'] = "Primary e-mail address set"
    signals.email_changed.send(
        sender=request.user.__class__,
        request=request, user=request.user,
        from_email_address=from_email_address,
        to_email_address=email_address
    )
    return JsonResponse(
        response,
        status=status
    )


@login_required
@ajax_required
@require_POST
def delete_socialaccount(request):
    account = SocialAccount.objects.filter(
        id=request.POST["socialaccount"],
        user=request.user
    ).first()
    if not account:
        return JsonResponse(
            {'msg': 'Unknown account'},
            status=404
        )
    account.delete()
    social_account_removed.send(
        sender=SocialAccount,
        request=request,
        socialaccount=account
    )
    return JsonResponse(
        {'msg': 'Deleted account'},
        status=200
    )


@login_required
@ajax_required
@require_POST
def upload_avatar(request):
    '''
    Upload avatar image
    '''
    response = {}
    status = 405

    avatar, avatars = avatarviews._get_avatars(request.user)
    upload_avatar_form = UploadAvatarForm(
        None,
        request.FILES,
        user=request.user
    )
    if upload_avatar_form.is_valid():
        avatar = Avatar(
            user=request.user,
            primary=True,
        )
        image_file = request.FILES['avatar']
        avatar.avatar.save(image_file.name, image_file)
        avatar.save()
        avatar_updated.send(
            sender=Avatar,
            user=request.user,
            avatar=avatar
        )
        response['avatar'] = userutil.get_user_avatar_url(
            request.user
        )['url']
        status = 200
    return JsonResponse(
        response,
        status=status
    )


@login_required
@ajax_required
@require_POST
def delete_avatar(request):
    '''
    Delete avatar image
    '''
    response = {}
    status = 405
    avatar, avatars = avatarviews._get_avatars(request.user)
    if avatar is None:
        response['error'] = 'User has no avatar'
    else:
        aid = avatar.id
        for a in avatars:
            if a.id == aid:
                a.primary = True
                a.save()
                avatar_updated.send(
                    sender=Avatar,
                    user=request.user,
                    avatar=avatar
                )
                break
        Avatar.objects.filter(pk=aid).delete()
        response['avatar'] = userutil.get_user_avatar_url(
            request.user
        )['url']
        status = 200
    return JsonResponse(
        response,
        status=status
    )


@login_required
@ajax_required
@require_POST
def delete_user(request):
    """
    Delete the user
    """
    response = {}
    user = request.user
    # Only remove users who are not marked as having staff status
    # to prevent administratoras from deleting themselves accidentally.
    if not user.check_password(request.POST['password']):
        status = 401
    elif user.is_staff:
        status = 403
    else:
        logout(request)
        user.delete()
        status = 204
    return JsonResponse(
        response,
        status=status
    )


@login_required
@ajax_required
@require_POST
def save_profile(request):
    """
    Save user profile information
    """
    response = {}
    form_data = json.loads(request.POST['form_data'])
    user_object = User.objects.get(pk=request.user.pk)
    user_form = UserForm(form_data['user'], instance=user_object)
    if user_form.is_valid():
        user_form.save()
        status = 200
    else:
        response['errors'] = user_form.errors
        status = 422
    '''
    currently not used
    profile_object = user_object.profile
    profile_form = UserProfileForm(
        form_data['profile'],
        instance=profile_object
    )
    if profile_form.is_valid():
        if status == 200:
            user_form.save()
            profile_form.save()
    else:
        if status == 200:
            response['errors']=profile_form.errors
            status = 422
        else:
            response['errors']+=profile_form.errors
    '''

    return JsonResponse(
        response,
        status=status
    )


@login_required
@ajax_required
@require_POST
def list_team_members(request):
    response = {}
    status = 200
    response['team_members'] = []

    for member in User.objects.filter(member__leader=request.user):
        team_member = {
            'id': member.id,
            'name': member.readable_name,
            'username': member.get_username(),
            'email': member.email,
            'avatar': userutil.get_user_avatar_url(member)
        }
        response['team_members'].append(team_member)
    return JsonResponse(
        response,
        status=status
    )


@login_required
@ajax_required
@require_POST
def add_team_member(request):
    """
    Add a user as a team member of the current user
    """
    response = {}
    new_member = False
    status = 202
    user_string = request.POST['user_string']
    if "@" in user_string and "." in user_string:
        email_address = EmailAddress.objects.filter(
            email=user_string
        ).first()
        if email_address:
            new_member = email_address.user
    else:
        user = User.objects.filter(username=user_string).first()
        if user:
            new_member = user
    if new_member:
        if new_member.pk is request.user.pk:
            # 'You cannot add yourself to your contacts!'
            response['error'] = 1
        else:
            form_data = {
                'leader': request.user.pk,
                'member': new_member.pk
            }
            team_member_form = TeamMemberForm(form_data)
            if team_member_form.is_valid():
                team_member_form.save()
                the_avatar = userutil.get_user_avatar_url(new_member)
                response['member'] = {
                    'id': new_member.pk,
                    'name': new_member.username,
                    'email': new_member.email,
                    'avatar': the_avatar
                }
                status = 201
            else:
                # 'This person is already in your contacts!'
                response['error'] = 2
    else:
        # 'User cannot be found'
        response['error'] = 3

    return JsonResponse(
        response,
        status=status
    )


@login_required
@ajax_required
@require_POST
def remove_team_member(request):
    """
    Remove a team member
    """
    response = {}
    former_members = request.POST.getlist('members[]')
    for former_member in former_members:
        former_member = int(former_member)
        # Revoke all permissions given to this person
        AccessRight.objects.filter(
            user_id=former_member,
            document__owner=request.user
        ).delete()
        # Now delete the user from the team
        team_member_object_instance = request.user.leader.filter(
            member_id=former_member
        ).first()
        team_member_object_instance.delete()
    status = 200
    return JsonResponse(
        response,
        status=status
    )


@ajax_required
@require_POST
def get_confirmkey_data(request):
    """
    Get data for an email confirmation key
    """
    response = {}
    key = request.POST['key']
    confirmation = EmailConfirmationHMAC.from_key(key)
    if not confirmation:
        qs = EmailConfirmation.objects.all_valid()
        qs = qs.select_related("email_address__user")
        confirmation = qs.filter(key=key.lower()).first()
    if confirmation:
        status = 200
        response['username'] = confirmation.email_address.user.username
        response['email'] = confirmation.email_address.email
        if request.user:
            if request.user != confirmation.email_address.user:
                response['logout'] = True
                logout(request)
        # We check if the user has another verified email already. If yes,
        # we don't need to display the terms and test server warning again.
        if confirmation.email_address.user.emailaddress_set.filter(
            verified=True
        ).first():
            response['verified'] = True
        else:
            response['verified'] = False
    else:
        status = 404
    return JsonResponse(
        response,
        status=status
    )


class FidusSignupView(SignupView):
    def form_valid(self, form):
        if not settings.REGISTRATION_OPEN:
            return HttpResponseRedirect('/')
        ret = super().form_valid(form)
        if ret.status_code > 399:
            return ret
        if 'invite_id' in self.request.POST:
            invite_id = int(self.request.POST['invite_id'])
            inv = AccessRightInvite.objects.filter(id=invite_id).first()
            if inv:
                apply_invite(inv, self.user)
        else:
            invites = AccessRightInvite.objects.filter(
                email=self.user.email
            )
            for inv in invites:
                apply_invite(inv, self.user)
        return ret


signup = FidusSignupView.as_view()

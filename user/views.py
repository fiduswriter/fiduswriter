import json

from django.http import JsonResponse, HttpResponseRedirect
from django.contrib.auth import logout, update_session_auth_hash
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User

from .forms import UserForm, TeamMemberForm
from . import util as userutil
from document.models import AccessRight

from allauth.account.models import EmailAddress
from allauth.account import signals
from django.contrib.auth.forms import PasswordChangeForm
from allauth.account.forms import AddEmailForm

from avatar.models import Avatar
from avatar import views as avatarviews
from avatar.forms import UploadAvatarForm
from avatar.signals import avatar_updated


def logout_page(request):
    """
    Log users out and re-direct them to the main page.
    """
    logout(request)
    return HttpResponseRedirect('/')


@login_required
def show_profile(request, username):
    """
    Show user profile page
    """
    response = {}
    if username == request.user.username:
        response['can_edit'] = True
    else:
        the_user = User.objects.filter(username=username)
        if len(the_user) > 0:
            response['the_user'] = the_user[0]
        response['can_edit'] = False
    return render(request, 'account/show_profile.html', response)


@login_required
def password_change_js(request):
    '''
    Change password
    '''
    response = {}
    status = 405
    if request.is_ajax() and request.method == 'POST':
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
def add_email_js(request):
    '''
    Add email address
    '''
    response = {}
    status = 405
    if request.is_ajax() and request.method == 'POST':
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
def delete_email_js(request):
    response = {}
    status = 405
    email = request.POST["email"]
    if request.is_ajax() and request.method == 'POST':
        response['msg'] = "Removed e-mail address " + email
        status = 200
        try:
            email_address = EmailAddress.objects.get(
                user=request.user,
                email=email
            )
            if email_address.primary:
                status = 201
                msg = "You cannot remove your primary e-mail address " + email
                response['msg'] = msg

            else:
                email_address.delete()
                signals.email_removed.send(
                    sender=request.user.__class__,
                    request=request,
                    user=request.user,
                    email_address=email_address
                )

        except EmailAddress.DoesNotExist:
            pass

    return JsonResponse(
        response,
        status=status
    )


@login_required
def primary_email_js(request):
    response = {}
    status = 405
    email = request.POST["email"]
    if request.is_ajax() and request.method == 'POST':
        try:
            email_address = EmailAddress.objects.get(
                user=request.user,
                email=email,
            )
            if not email_address.verified:
                status = 201
                msg = "Your primary e-mail address must be verified"
                response['msg'] = msg
            else:
                # Sending the old primary address to the signal
                # adds a db query.
                try:
                    from_email_address = EmailAddress.objects.get(
                        user=request.user,
                        primary=True
                    )
                except EmailAddress.DoesNotExist:
                    from_email_address = None

                status = 200
                email_address.set_as_primary()
                response['msg'] = "Primary e-mail address set"
                signals.email_changed.send(
                    sender=request.user.__class__,
                    request=request, user=request.user,
                    from_email_address=from_email_address,
                    to_email_address=email_address
                )
        except EmailAddress.DoesNotExist:
            status = 201
            response['msg'] = "e-mail address does not exist"

    return JsonResponse(
        response,
        status=status
    )


@login_required
def upload_avatar_js(request):
    '''
    Upload avatar image
    '''
    response = {}
    status = 405
    if request.is_ajax() and request.method == 'POST':

        avatar, avatars = avatarviews._get_avatars(request.user)
        upload_avatar_form = UploadAvatarForm(
            None,
            request.FILES,
            user=request.user
        )
        print upload_avatar_form
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
            response['avatar'] = userutil.get_user_avatar_url(request.user)
            status = 200
    return JsonResponse(
        response,
        status=status
    )


@login_required
def delete_avatar_js(request):
    '''
    Delete avatar image
    '''
    response = {}
    status = 405
    if request.is_ajax() and request.method == 'POST':
        avatar, avatars = avatarviews._get_avatars(request.user)
        if avatar is None:
            response = 'No avatar exists'
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
            response['avatar'] = userutil.get_user_avatar_url(request.user)
            status = 200
    return JsonResponse(
        response,
        status=status
    )


@login_required
def delete_user_js(request):
    """
    Mark the user as deleted
    """
    response = {}
    status = 405
    if request.is_ajax() and request.method == 'POST':
        user = request.user
        # Only remove users who are not marked as having staff status
        # to prevent administratoras from deleting themselves accidentally.
        if user.is_staff is False:
            user.is_active = False
        user.save()
        status = 200
    return JsonResponse(
        response,
        status=status
    )


@login_required
def save_profile_js(request):
    """
    Save user profile information
    """
    response = {}
    status = 405
    if request.is_ajax() and request.method == 'POST':
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
def list_team_members(request):
    """
    List all team members of the current user
    """
    response = {}
    return render(request, 'account/list_team_members.html', response)


@login_required
def list_team_members_js(request):
    response = {}
    status = 405
    if request.is_ajax() and request.method == 'POST':
        status = 200
        response['team_members'] = []

        for member in User.objects.filter(member__leader=request.user):
            team_member = {
                'id': member.id,
                'name': member.get_username(),
                'email': member.email,
                'avatar': userutil.get_user_avatar_url(member)
            }
            response['team_members'].append(team_member)
    return JsonResponse(
        response,
        status=status
    )


@login_required
def add_team_member_js(request):
    """
    Add a user as a team member of the current user
    """
    response = {}
    status = 405
    new_member = False
    if request.is_ajax() and request.method == 'POST':
        status = 202
        user_string = request.POST['user_string']
        if "@" in user_string and "." in user_string:
            email_address = EmailAddress.objects.filter(email=user_string)
            if len(email_address) > 0:
                email_address = email_address[0]
                new_member = email_address.user
        else:
            users = User.objects.filter(username=user_string)
            if len(users) > 0:
                new_member = users[0]
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
def change_team_member_roles_js(request):
    """
    Change the roles of a team member
    """
    response = {}
    status = 405
    if request.is_ajax() and request.method == 'POST':
        form_data = json.loads(request.POST['form_data'])
        form_data['leader'] = request.user.pk
        member = User.objects.get(pk=form_data['member'])
        team_member_object_instance = request.user.leader.filter(
            member=member
        )[0]
        team_member_form = TeamMemberForm(
            form_data,
            instance=team_member_object_instance
        )
        if team_member_form.is_valid():
            team_member_form.save()
            status = 200
    return JsonResponse(
        response,
        status=status
    )


@login_required
def remove_team_member_js(request):
    """
    Remove a team member
    """
    response = {}
    status = 405
    if request.is_ajax() and request.method == 'POST':
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
            )[0]
            team_member_object_instance.delete()
        status = 200
    return JsonResponse(
        response,
        status=status
    )

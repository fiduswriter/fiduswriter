from builtins import object
from django.forms import ModelForm

from django.contrib.auth.models import User
from .models import UserProfile, TeamMember


class UserForm(ModelForm):
    class Meta(object):
        model = User
        fields = ('username', 'first_name', 'last_name')


class UserProfileForm(ModelForm):
    class Meta(object):
        model = UserProfile
        fields = ('about',)


class TeamMemberForm(ModelForm):
    class Meta(object):
        model = TeamMember
        exclude = []

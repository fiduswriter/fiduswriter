from django.forms import ModelForm

from django.contrib.auth.models import User
from .models import UserProfile, TeamMember

class UserForm(ModelForm):
    class Meta:
        model = User
        fields = ('username','first_name','last_name')

class UserProfileForm(ModelForm):
    class Meta:
        model = UserProfile
        fields = ('about',)

class TeamMemberForm(ModelForm):
    class Meta:
        model = TeamMember

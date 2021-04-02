from builtins import object
from django.forms import ModelForm

from django.contrib.auth.models import User


class UserForm(ModelForm):
    class Meta(object):
        model = User
        fields = ('username', 'first_name', 'last_name')

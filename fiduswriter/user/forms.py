from builtins import object
from django.forms import ModelForm
from django.contrib.auth import get_user_model


class UserForm(ModelForm):
    class Meta(object):
        model = get_user_model()
        fields = ("username", "first_name", "last_name")

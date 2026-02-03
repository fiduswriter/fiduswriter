from django import forms
from django.contrib.auth import get_user_model
from allauth.account.forms import LoginForm
from django.core.validators import RegexValidator
from django.utils.translation import gettext as _


class UserForm(forms.ModelForm):
    class Meta:
        model = get_user_model()
        fields = ("username", "first_name", "last_name", "language")


class FidusLoginForm(LoginForm):
    twofactor = forms.CharField(
        required=False,
        validators=[
            RegexValidator(
                regex=r"^[0-9]{6}$",  # Strict ASCII digits only (no Unicode digits)
                message=_("Code must be exactly 6 digits (0-9)."),
                code="invalid_six_digit_code",
            )
        ],
        strip=True,  # nsures leading/trailing spaces don't bypass validation
    )

from django.contrib.admin.apps import AdminConfig
from django.contrib import admin


def _admin_template_for_django_version():
    """
    Returns the most appropriate Django login template available.
    """
    return "otp/admin111/login.html"


def get_otp_admin_authentication_form():
    """
    Lazily create the OTPAdminAuthenticationForm to avoid importing
    Django forms at module level (which causes AppRegistryNotReady).
    """
    from django import forms
    from django.contrib.admin.forms import AdminAuthenticationForm
    from django_otp.forms import OTPAuthenticationFormMixin

    class OTPAdminAuthenticationForm(
        AdminAuthenticationForm, OTPAuthenticationFormMixin
    ):
        """
        Custom admin authentication form that adds OTP token field.
        This is similar to django_otp's OTPAdminAuthenticationForm but adapted for Fidus Writer.
        """

        otp_device = forms.CharField(required=False, widget=forms.Select)
        otp_token = forms.CharField(
            required=False,
            widget=forms.TextInput(
                attrs={
                    "autocomplete": "off",
                    "autofocus": "autofocus",
                }
            ),
        )
        otp_challenge = forms.CharField(required=False)

        def clean(self):
            from django_otp import user_has_device

            # First do standard authentication
            self.cleaned_data = super().clean()

            # Only require OTP verification if user has a device
            user = self.get_user()
            if user and user_has_device(user):
                # User has a device, require OTP verification
                self.clean_otp(user)

            return self.cleaned_data

    return OTPAdminAuthenticationForm


class OTPAdminSite(admin.AdminSite):
    """
    Custom admin site that enforces two-factor authentication.
    Inherits from standard AdminSite but adds OTP verification.
    """

    site_title = "Fidus Writer Admin"
    site_header = "Fidus Writer Administration"
    index_title = "Welcome to Fidus Writer Administration Site"

    login_template = _admin_template_for_django_version()

    @property
    def login_form(self):
        """
        Lazily load the login form to avoid AppRegistryNotReady errors.
        """
        return get_otp_admin_authentication_form()

    def has_permission(self, request):
        """
        Override has_permission to check for 2FA verification.
        Users with TOTP devices must be verified.
        Users without TOTP devices can access without 2FA.
        """
        from django_otp import user_has_device

        # First check if user is logged in via standard Django auth
        if not super().has_permission(request):
            return False

        # If user has a TOTP device, they must be verified
        if user_has_device(request.user):
            return request.user.is_verified()

        # User doesn't have a device, allow access
        return True


class OTPAdminConfig(AdminConfig):
    """
    Custom admin configuration that uses OTPAdminSite for two-factor authentication.
    This replaces django.contrib.admin when django_otp is enabled.
    """

    default_site = "base.twofactor_admin.OTPAdminSite"

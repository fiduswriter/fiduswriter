from django.contrib import admin
from django.contrib.admin.apps import AdminConfig
from django_otp.admin import OTPAdminSite
from django_otp import user_has_device

from . import models


class OTPAdminConfig(AdminConfig):
    """
    Custom admin configuration that uses OTPAdminSite for two-factor authentication.
    """

    default_site = "base.admin.OTPAdminSiteSite"


class OTPAdminSiteSite(OTPAdminSite):
    """
    Custom admin site that enforces two-factor authentication.
    """

    site_title = "Fidus Writer OTP Admin"
    site_header = "Fidus Writer Administration"
    index_title = "Welcome to Fidus Writer OTP Administration Site"

    def has_permission(self, request):
        """
        Override has_permission to check for 2FA verification.
        """
        # First check if user is logged in via standard Django auth
        if not super().has_permission(request):
            return False

        # Then check if user has verified with OTP
        # If user has a TOTP device, they must be verified
        if user_has_device(request.user):
            return request.user.is_verified()

        # User doesn't have a TOTP device yet, allow access
        # They can add one through the admin interface
        return True


# Use the OTP admin site for admin interface
admin_site = OTPAdminSiteSite(name="otpadmin")

# Register Presence model with the OTP admin site
admin_site.register(models.Presence)

# Also register with default admin site (for backward compatibility)
admin.site.register(models.Presence)

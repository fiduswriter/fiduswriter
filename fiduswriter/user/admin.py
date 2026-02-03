from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DefaultUserAdmin
from django.utils.translation import gettext_lazy as _
from django.conf import settings

from . import models

from django_otp.admin import OTPAdminSite
from django_otp.plugins.otp_totp.admin import TOTPDeviceAdmin
from django_otp.plugins.otp_totp.models import TOTPDevice
from django_otp import user_has_device


class UserAdmin(DefaultUserAdmin):
    fieldsets = DefaultUserAdmin.fieldsets + (
        (_("Connections"), {"fields": ("contacts",)}),
    )


class UserInviteAdmin(admin.ModelAdmin):
    pass


# Check if django_otp is available and not in REMOVED_APPS

if "django_otp" in getattr(settings, "INSTALLED_APPS", []):
    # Create OTP admin site for two-factor authentication
    otp_admin_site = OTPAdminSite(name="otpadmin")
    otp_admin_site.site_title = "Fidus Writer OTP Admin"
    otp_admin_site.site_header = "Fidus Writer Administration"
    otp_admin_site.index_title = (
        "Welcome to Fidus Writer OTP Administration Site"
    )

    # Register models with OTP admin site
    otp_admin_site.register(models.User, UserAdmin)
    otp_admin_site.register(models.UserInvite, UserInviteAdmin)
    otp_admin_site.register(TOTPDevice, TOTPDeviceAdmin)

    # Override the default admin site's has_permission method to enforce 2FA
    original_has_permission = admin.site.has_permission

    def otp_has_permission(request):
        """
        Override has_permission to check for 2FA verification.
        """
        # First check if user is logged in via standard Django auth
        if not original_has_permission(request):
            return False

        # Then check if user has verified with OTP
        # If user has a TOTP device, they must be verified
        if user_has_device(request.user):
            return request.user.is_verified()

        # User doesn't have a TOTP device yet, allow access
        # They can add one through the admin interface
        return True

    # Override the default admin site's has_permission method
    admin.site.has_permission = otp_has_permission


# Register models with the default admin site
admin.site.register(models.User, UserAdmin)
admin.site.register(models.UserInvite, UserInviteAdmin)

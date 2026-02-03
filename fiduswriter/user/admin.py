from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DefaultUserAdmin
from django.utils.translation import gettext_lazy as _
from django.conf import settings

from . import models


class UserAdmin(DefaultUserAdmin):
    fieldsets = DefaultUserAdmin.fieldsets + (
        (_("Connections"), {"fields": ("contacts",)}),
    )


class UserInviteAdmin(admin.ModelAdmin):
    pass


# Register models with the default admin site
admin.site.register(models.User, UserAdmin)
admin.site.register(models.UserInvite, UserInviteAdmin)

# If django_otp is enabled, replace the default TOTPDevice admin with our custom one
if "django_otp" in getattr(settings, "INSTALLED_APPS", []):
    from django_otp.plugins.otp_totp.models import TOTPDevice
    from user.totp_admin import CustomTOTPDeviceAdmin

    # Unregister the default TOTPDevice admin first
    try:
        admin.site.unregister(TOTPDevice)
    except admin.sites.NotRegistered:
        pass

    # Register our custom admin
    admin.site.register(TOTPDevice, CustomTOTPDeviceAdmin)

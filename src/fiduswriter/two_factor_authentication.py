from django.contrib.admin.apps import AdminConfig


class FidusConfig(AdminConfig):
    default_site = "django_otp.admin.OTPAdminSite"

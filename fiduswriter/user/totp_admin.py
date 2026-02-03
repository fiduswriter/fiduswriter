from django.utils.html import format_html
from django_otp.plugins.otp_totp.admin import TOTPDeviceAdmin
from django_otp.conf import settings
import base64


class CustomTOTPDeviceAdmin(TOTPDeviceAdmin):
    """
    Custom TOTP Device Admin that:
    1. Enforces 6-digit codes only (disables 8-digit option)
    2. Displays secret key in base32 format instead of hex
    """

    # Remove the radio_fields to customize digits field behavior
    radio_fields = {}

    def get_fieldsets(self, request, obj=None):
        """
        Override to show key in base32 format and customize configuration fields.
        """
        # Show the key value only for adding new objects or when sensitive data
        # is not hidden.
        if settings.OTP_ADMIN_HIDE_SENSITIVE_DATA and obj:
            configuration_fields = ["step", "t0", "tolerance"]
        elif obj:
            # For existing objects, show key in base32 format (readonly)
            configuration_fields = ["key_base32", "step", "t0", "tolerance"]
        else:
            # For new objects, show the actual key field (editable)
            configuration_fields = ["key", "step", "t0", "tolerance"]

        fieldsets = [
            (
                "Identity",
                {
                    "fields": ["user", "name", "confirmed"],
                },
            ),
            (
                "Configuration",
                {
                    "fields": configuration_fields,
                },
            ),
            (
                "State",
                {
                    "fields": ["drift"],
                },
            ),
            (
                "Throttling",
                {
                    "fields": [
                        "throttling_failure_timestamp",
                        "throttling_failure_count",
                    ],
                },
            ),
        ]

        # Show the QR code link only for existing objects when sensitive data
        # is not hidden.
        if not settings.OTP_ADMIN_HIDE_SENSITIVE_DATA and obj:
            fieldsets.append(
                (
                    None,
                    {
                        "fields": ["qrcode_link"],
                    },
                ),
            )
        return fieldsets

    def get_readonly_fields(self, request, obj=None):
        """
        Add key_base32, qrcode_link, and confirmed as readonly fields.
        """
        readonly = list(super().get_readonly_fields(request, obj))
        if "qrcode_link" not in readonly:
            readonly.append("qrcode_link")
        if obj and "key_base32" not in readonly:
            # For existing objects, show base32 key as readonly
            readonly.append("key_base32")
        # Make confirmed readonly so admins can't accidentally confirm without testing
        if "confirmed" not in readonly:
            readonly.append("confirmed")
        return readonly

    def key_base32(self, obj):
        """
        Display the key in base32 format (standard for TOTP apps).
        """
        if obj and obj.key:
            # Convert hex key to base32
            try:
                # The key is stored as hex string, convert to bytes then to base32
                key_bytes = bytes.fromhex(obj.key)
                key_base32 = base64.b32encode(key_bytes).decode("utf-8")
                return format_html(
                    '<code style="font-size: 14px; letter-spacing: 2px;">{}</code>',
                    key_base32,
                )
            except Exception as e:
                return f"Error converting key: {e}"
        return "-"

    key_base32.short_description = "Secret Key (Base32)"

    def save_model(self, request, obj, form, change):
        """
        Override save to enforce 6-digit codes and set new devices as unconfirmed.
        """
        # Always enforce 6-digit codes
        obj.digits = 6

        # New devices should be unconfirmed by default
        if not change:
            obj.confirmed = False

        super().save_model(request, obj, form, change)

    def get_form(self, request, obj=None, **kwargs):
        """
        Customize the form to remove digits field.
        """
        form = super().get_form(request, obj, **kwargs)

        # Remove digits field from the form since we enforce 6 digits
        if "digits" in form.base_fields:
            del form.base_fields["digits"]

        return form

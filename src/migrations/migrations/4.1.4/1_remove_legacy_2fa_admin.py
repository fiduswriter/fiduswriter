#!/usr/bin/env python3
"""
Remove legacy two_factor_admin_config.FidusConfig from INSTALLED_APPS and
clean up REMOVED_APPS for Fidus Writer 4.1+.

In 4.1+, two-factor authentication admin is handled automatically by
base.twofactor_admin.OTPAdminConfig when django_otp is present.
Having the legacy two_factor_admin_config.FidusConfig causes a duplicate
"admin" app label error.
"""
import os
import re
import sys

SNAP_DATA = os.environ.get("SNAP_DATA")
CONFIGURE_PATH = f"{SNAP_DATA}/configuration.py"

if not os.path.isfile(CONFIGURE_PATH):
    sys.exit(0)

with open(CONFIGURE_PATH) as f:
    content = f.read()


def remove_list_item(content, item):
    """Remove a string item from Python list syntax in content."""
    # Try several patterns to handle different list positions and formats
    patterns = [
        # Item with comma after it (not last in list)
        rf"['\"]{re.escape(item)}['\"]\s*,\s*\n",
        # Item at end of list with comma before it
        rf",\s*['\"]{re.escape(item)}['\"]\s*\n?",
        # Item alone or without comma around it
        rf"['\"]{re.escape(item)}['\"]\s*\n?",
    ]
    for pattern in patterns:
        new_content, count = re.subn(pattern, "", content, count=1)
        if count > 0:
            return new_content
    return content


# Remove legacy 2FA admin config from INSTALLED_APPS lists
content = remove_list_item(content, "two_factor_admin_config.FidusConfig")

# Remove django.contrib.admin from REMOVED_APPS (no longer needed in 4.1+)
content = remove_list_item(content, "django.contrib.admin")

# Clean up leftover leading commas in lists (e.g. "[, 'foo']" -> "['foo']")
content = re.sub(r"\[\s*,\s*", "[", content)

# Clean up empty list assignments
content = re.sub(
    r"^INSTALLED_APPS\s*\+=\s*\[\s*\]\s*\n?",
    "",
    content,
    flags=re.MULTILINE,
)
content = re.sub(
    r"^REMOVED_APPS\s*=\s*\[\s*\]\s*\n?",
    "",
    content,
    flags=re.MULTILINE,
)

# Clean up excessive blank lines
content = re.sub(r"\n{3,}", "\n\n", content)

with open(CONFIGURE_PATH, "w") as f:
    f.write(content)

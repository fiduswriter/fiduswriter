#!/usr/bin/env python3
"""
Add new Fidus Writer 4.1 settings as commented-out defaults to existing configuration.

This migration appends new optional settings that were introduced in 4.1:
- PROSEMIRROR_BACKEND
- E2EE_MODE
- EDITOR_SAVE_MODE
- REMOVED_APPS
"""
import os
import ast
import sys

SNAP_DATA = os.environ.get("SNAP_DATA")
CONFIGURE_PATH = f"{SNAP_DATA}/configuration.py"

if not os.path.isfile(CONFIGURE_PATH):
    sys.exit(0)

with open(CONFIGURE_PATH) as f:
    content = f.read()


# Parse AST to safely find existing settings
class ConfigVisitor(ast.NodeVisitor):
    def __init__(self):
        self.settings = set()

    def visit_Assign(self, node):
        if isinstance(node.targets[0], ast.Name):
            self.settings.add(node.targets[0].id)


visitor = ConfigVisitor()
visitor.visit(ast.parse(content))

new_sections = []

if "PROSEMIRROR_BACKEND" not in visitor.settings:
    new_sections.append(
        """
# ProseMirror backend used by the document WebSocket consumer.
# "python" - pure-Python prosemirror package (default).
# "rust"   - prosemirror-rs Rust extension (requires `pip install prosemirror-rs`). EXPERIMENTAL
# PROSEMIRROR_BACKEND = "python"
"""
    )

if "REMOVED_APPS" not in visitor.settings:
    new_sections.append(
        """
# A list of apps to remove from the default installation
# REMOVED_APPS = [
#     # Example: Disable two-factor authentication entirely
#     # 'django_otp',
#     # Example: Disable brute-force protection (for development only)
#     # 'axes',
# ]
"""
    )

if "E2EE_MODE" not in visitor.settings:
    new_sections.append(
        """
# E2EE_MODE controls whether end-to-end encrypted documents are allowed.
# EXPERIMENTAL: E2EE_MODE is an experimental mode that is still subject to changes
# and that has not been independently reviewed by security experts yet.
#
# 'disabled'  - No E2EE support. All documents are unencrypted.
# 'enabled'   - Both E2EE and non-encrypted documents are supported. EXPERIMENTAL
# 'required'  - Only E2EE documents are allowed. EXPERIMENTAL
# E2EE_MODE = "disabled"
"""
    )

if "EDITOR_SAVE_MODE" not in visitor.settings:
    new_sections.append(
        """
# EDITOR_SAVE_MODE controls how the editor persists document changes.
#   "collaborative" - WebSocket-based real-time collaboration (default).
#   "direct"        - Periodic REST saves without real-time collaboration.
#   "external"      - No built-in saving; external plugins handle persistence.
# EDITOR_SAVE_MODE = "collaborative"
"""
    )

if new_sections:
    new_content = content + "\n".join(new_sections)
    with open(CONFIGURE_PATH, "w") as f:
        f.write(new_content)

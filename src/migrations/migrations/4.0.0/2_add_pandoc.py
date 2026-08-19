#!/usr/bin/env python3
import os
import ast
import sys

SNAP_DATA = os.environ.get("SNAP_DATA")
CONFIGURE_PATH = f"{SNAP_DATA}/configuration.py"

if not os.path.isfile(CONFIGURE_PATH):
    sys.exit(0)

with open(CONFIGURE_PATH) as f:
    content = f.read()


# Parse AST to safely find configuration
class ConfigVisitor(ast.NodeVisitor):
    def __init__(self):
        self.installed_apps = None

    def visit_Assign(self, node):
        if isinstance(node.targets[0], ast.Name):
            if node.targets[0].id == "INSTALLED_APPS":
                self.installed_apps = ast.literal_eval(node.value)


visitor = ConfigVisitor()
visitor.visit(ast.parse(content))

# Add pandoc to INSTALLED_APPS if not present
if visitor.installed_apps and "pandoc" not in visitor.installed_apps:
    apps_str = "INSTALLED_APPS = ["
    new_apps_str = 'INSTALLED_APPS = [\n    "pandoc",'
    new_content = content.replace(apps_str, new_apps_str)

    with open(CONFIGURE_PATH, "w") as f:
        f.write(new_content)

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
        self.ws_port = None
        self.port = None
        self.ports = None

    def visit_Assign(self, node):
        if isinstance(node.targets[0], ast.Name):
            if node.targets[0].id == "WS_PORT":
                self.ws_port = ast.literal_eval(node.value)
            if node.targets[0].id == "PORT":
                self.port = ast.literal_eval(node.value)
            elif node.targets[0].id == "PORTS":
                self.ports = True


visitor = ConfigVisitor()
visitor.visit(ast.parse(content))

# Migrate if needed
if not visitor.ports:
    if visitor.port:
        new_content = content.replace(
            "PORT =",
            f"PORTS = [{visitor.port}]  # Migrated from PORT\n# PORT =",
        )
    elif visitor.ws_port:
        new_content = content.replace(
            "WS_PORT =",
            f"PORTS = [{visitor.ws_port}]  # Migrated from WS_PORT\n# WS_PORT =",
        )
    else:
        new_content = content + "\nPORTS = [4386,]"

    with open(CONFIGURE_PATH, "w") as f:
        f.write(new_content)

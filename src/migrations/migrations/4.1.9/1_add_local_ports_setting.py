#!/usr/bin/env python3
"""
Add LOCAL_PORTS setting as a commented-out default to existing configuration.

This migration appends the new optional LOCAL_PORTS setting that was
introduced in 4.1.9 to support multi-server setups where each server
only binds to a subset of the global PORTS list.
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

if "LOCAL_PORTS" not in visitor.settings:
    new_section = """
# Ports this server instance actually binds to. Defaults to PORTS.
# For multi-server setups, set this to only the port(s) served locally
# while keeping PORTS as the full list across all servers.
# LOCAL_PORTS = [8000]
"""
    new_content = content + new_section
    with open(CONFIGURE_PATH, "w") as f:
        f.write(new_content)

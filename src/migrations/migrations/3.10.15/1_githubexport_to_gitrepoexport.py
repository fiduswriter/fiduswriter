#!/usr/bin/env python3
import sys
import os

SNAP_DATA = os.environ.get("SNAP_DATA")
CONFIGURE_PATH = f"{SNAP_DATA}/configuration.py"

if not os.path.isfile(CONFIGURE_PATH):
    sys.exit(0)

with open(CONFIGURE_PATH) as f:
    configuration = f.read()

configuration = configuration.replace("github_export", "gitrepo_export")

with open(CONFIGURE_PATH, "w") as f:
    f.write(configuration)

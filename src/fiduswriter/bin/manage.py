#!/usr/bin/env python3
import os
import sys
from subprocess import call

SNAP = os.environ.get("SNAP")
SNAP_DATA = os.environ.get("SNAP_DATA")

if __name__ == "__main__":
    if os.getuid() != 0:
        print("This script must be run by root")
        sys.exit()
    call(
        [f"{SNAP}/bin/fiduswriter"]
        + sys.argv[1:]
        + ["--pythonpath", SNAP_DATA]
    )

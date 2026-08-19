#!/usr/bin/env python3
import os
import sys
from subprocess import call
from pathlib import Path

SNAP_NAME = os.environ.get("SNAP_NAME")
SNAP = os.environ.get("SNAP")
SNAP_DATA = os.environ.get("SNAP_DATA")
sys.path.append(SNAP_DATA)
JAVA_BIN = os.environ.get("JAVA_BIN")
SNAP_INSTANCE_NAME = os.environ.get("SNAP_INSTANCE_NAME")
RUN_DIR = f"/run/snap.{SNAP_INSTANCE_NAME}/lt/"

if __name__ == "__main__":
    if os.getuid() != 0:
        print("This script must be run by root")
        sys.exit()
    LT_PORT = False
    try:
        import configuration

        if hasattr(configuration, "LT_PORT"):
            LT_PORT = configuration.LT_PORT
    except ModuleNotFoundError:
        LT_PORT = 4385
    if LT_PORT:
        Path(RUN_DIR).mkdir(parents=True, exist_ok=True)
        call(
            [
                JAVA_BIN,
                f"-Djava.io.tmpdir={RUN_DIR}",
                "-cp",
                f"{SNAP}/lt/languagetool-server.jar",
                "org.languagetool.server.HTTPServer",
                "--port",
                f"{LT_PORT}",
            ]
        )

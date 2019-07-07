#!/usr/bin/env python

import os
import sys

SRC_PATH = os.path.dirname(os.path.realpath(__file__))
os.environ.setdefault(
    "SRC_PATH",
    SRC_PATH
)

def inner():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
    from django.core.management import execute_from_command_line
    execute_from_command_line(sys.argv)

def entry():
    sys.path.append(SRC_PATH)
    os.environ.setdefault(
        "PROJECT_PATH",
        os.getcwd()
    )
    inner()

if __name__ == "__main__":
    os.environ.setdefault(
        "PROJECT_PATH",
        SRC_PATH
    )
    inner()

#!/usr/bin/env python3
import os
import sys
from subprocess import check_output, CalledProcessError
from time import sleep

SNAP = os.environ.get("SNAP")
SNAP_DATA = os.environ.get("SNAP_DATA")
CONFIGURE_PATH = f"{SNAP_DATA}/configuration.py"
PASSWORD_PATH = f"{SNAP_DATA}/mysql/fiduswriter_password"
PRE_MIGRATE_SQL_DIR = f"{SNAP_DATA}/pre-migrate-sql"


if __name__ == "__main__":
    if os.getuid() != 0:
        print("This script must be run by root")
        sys.exit(1)
    if not os.path.isfile(CONFIGURE_PATH):
        try:
            check_output(
                [
                    f"{SNAP}/bin/fiduswriter",
                    "startproject",
                    "--pythonpath",
                    SNAP_DATA,
                ]
            )
        except CalledProcessError:
            sys.exit(1)
    # We wait for the mysql server to start
    try:
        check_output(
            [
                f"{SNAP}/bin/wait_for_mysql.sh",
            ]
        )
    except CalledProcessError:
        sys.exit(1)
    # We wait for the password file to be created
    timer = 0
    while timer < 15 and not os.path.isfile(PASSWORD_PATH):
        timer += 0.1
        sleep(0.1)
    if not os.path.isfile(PASSWORD_PATH):
        print("Password file missing")
        # Something went wrong. This should have been caught by setup.
        sys.exit(1)
    # Snap migrations run while MySQL is stopped, so they cannot execute raw SQL.
    # Any migration that needs pre-migration SQL can drop a file into
    # pre-migrate-sql/; we execute them here after MySQL is up but before
    # Django's own migrations run.
    if os.path.isdir(PRE_MIGRATE_SQL_DIR):
        sys.path.append(SNAP_DATA)
        os.environ.setdefault("DJANGO_SETTINGS_MODULE", "configuration")
        import django

        django.setup()
        from django.db import connection

        for filename in sorted(os.listdir(PRE_MIGRATE_SQL_DIR)):
            filepath = os.path.join(PRE_MIGRATE_SQL_DIR, filename)
            if not os.path.isfile(filepath):
                continue
            with open(filepath) as f:
                sql = f.read()
            if sql.strip():
                with connection.cursor() as cursor:
                    cursor.execute(sql)
            os.remove(filepath)

    try:
        check_output(
            [f"{SNAP}/bin/fiduswriter", "runserver", "--pythonpath", SNAP_DATA]
        )
    except CalledProcessError:
        sys.exit(1)

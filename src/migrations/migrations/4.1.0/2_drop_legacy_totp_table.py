#!/usr/bin/env python3
"""
Schedule a pre-migration SQL statement to drop the legacy TOTP table.

Snap migrations run while MySQL is still stopped, so they cannot execute SQL
directly. Instead, this migration writes an SQL file into a directory that
run-fiduswriter.py executes after MySQL is up but before Django migrations run.
"""
import os
import sys

SNAP_DATA = os.environ.get("SNAP_DATA")
if not SNAP_DATA:
    sys.exit(0)

# Only act on existing installations. Fresh installs of 4.1.0+ do not run
# through this migration, so no SQL file is created for them.
CONFIGURE_PATH = f"{SNAP_DATA}/configuration.py"
if not os.path.isfile(CONFIGURE_PATH):
    sys.exit(0)

PRE_MIGRATE_SQL_DIR = f"{SNAP_DATA}/pre-migrate-sql"
os.makedirs(PRE_MIGRATE_SQL_DIR, exist_ok=True)

SQL_PATH = f"{PRE_MIGRATE_SQL_DIR}/0001_drop_legacy_otp_totp_totpdevice.sql"
with open(SQL_PATH, "w") as f:
    f.write("DROP TABLE IF EXISTS otp_totp_totpdevice;\n")

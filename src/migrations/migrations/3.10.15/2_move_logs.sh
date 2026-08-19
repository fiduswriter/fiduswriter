#!/bin/sh -e
#
# Version 3.10.15 introduced log rotation, and it also reorganized the log
# layout. Let's move any existing mysql log into place so we don't lose them.

mkdir -p "${SNAP_DATA}/logs"
chmod 750 "${SNAP_DATA}/logs"

mysql_errors_log="$SNAP_DATA/mysql/error.log"
if [ -f "$mysql_errors_log" ]; then
	mv "$mysql_errors_log" "$SNAP_DATA/logs/mysql_errors.log"
fi

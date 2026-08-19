#!/bin/sh

# This file has been added to the Fidus Writer snap to easily execute the wait
# function from python code (in run-fiduswriter.py).
. "$SNAP/utilities/mysql-utilities"

wait_for_mysql

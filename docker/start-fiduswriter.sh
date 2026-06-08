#!/bin/sh -e
#
# Script to run fiduswriter and/or perform the initial setup

echo "*** Running as user $(whoami) ..."

# Activate the virtual environment properly
export PATH="/fiduswriter/venv/bin:$PATH"

if [ -f /data/configuration.py ]; then
    echo '*** Fiduswriter will use the settings found in /data/configuration.py ...'
else
    echo '*** /data/configuration.py was not found. A new file with default settings will now be created ...'

    fiduswriter startproject
fi

# If setup-performed.info does not yet exist, we assume that this is a "fresh" container and perform the setup.
if ! [ -f /fiduswriter/setup-performed.info ]; then
    echo '*** Executing fiduswriter setup as this is the first time that this container is launched ...'
    fiduswriter setup
    touch /fiduswriter/setup-performed.info
fi

# Handle media directory
if [ -d /fiduswriter/media ] ; then
  if ! [ -L /fiduswriter/media ] ; then
    if [ -d /data/media ] ; then
        rm -rf /fiduswriter/media
    else
        mv /fiduswriter/media /data/media
    fi
  fi
fi
if ! [ -L /fiduswriter/media ] ; then
  ln -sf /data/media /fiduswriter
fi

# Handle configuration file
if [ -f /fiduswriter/configuration.py ] ; then
  if ! [ -L /fiduswriter/configuration.py ] ; then
    if [ -f /data/configuration.py ] ; then
        rm /fiduswriter/configuration.py
    else
        mv /fiduswriter/configuration.py /data/configuration.py
    fi
  fi
fi
if ! [ -L /fiduswriter/configuration.py ] ; then
  ln -sf /data/configuration.py /fiduswriter/configuration.py
fi

# Handle database file
if [ -f /fiduswriter/fiduswriter.sql ] ; then
  if ! [ -L /fiduswriter/fiduswriter.sql ] ; then
    if [ -f /data/fiduswriter.sql ] ; then
        rm /fiduswriter/fiduswriter.sql
    else
        mv /fiduswriter/fiduswriter.sql /data/fiduswriter.sql
    fi
  fi
fi
if ! [ -L /fiduswriter/fiduswriter.sql ] ; then
  ln -sf /data/fiduswriter.sql /fiduswriter/fiduswriter.sql
fi

# Ensure database file is writable
if [ -f /data/fiduswriter.sql ]; then
    chmod 664 /data/fiduswriter.sql
fi

# Run the fiduswriter-server
echo '*** Executing fiduswriter ...'
fiduswriter runserver 0.0.0.0:8000

exit 0

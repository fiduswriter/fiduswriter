#!/bin/bash
set -e

if [ "$1" = 'runserver' ]; then
    shift
    exec python manage.py runserver "$@"
elif [ "$1" = 'shell' ]; then
    shift
    exec python manage.py shell "$@"
else
    exec "$@"
fi

from time import time
from django.utils import six
from django.utils.http import int_to_base36, base36_to_int
from django.utils.crypto import constant_time_compare, salted_hmac

# Tokens are used for login from OJS. This is to avoid exposing the api_key to
# the client.
# Partially originating in https://github.com/jpulgarin/django-tokenapi/
# Copyright 2011 Julian Pulgarin, Apache License


def create_token(user, journal_key):
    timestamp = int(time())
    return calculate_token(user, journal_key, timestamp)


def calculate_token(user, journal_key, timestamp):
    ts_b36 = int_to_base36(timestamp)
    value = (six.text_type(user.pk) + user.password + six.text_type(timestamp))
    hash = salted_hmac(journal_key, value).hexdigest()[::2]
    return "%s-%s-%s" % (user.id, ts_b36, hash)


def check_token(user, journal_key, token):
    # Check whether token is valid
    try:
        ts_b36 = token.split("-")[1]
    except ValueError:
        return False
    try:
        timestamp = base36_to_int(ts_b36)
    except ValueError:
        return False

    # Check that the timestamp/uid has not been tampered with
    if not constant_time_compare(
        calculate_token(user, journal_key, timestamp),
        token
    ):
        return False

    # Check timestamp is not older than 2 minutes
    new_timestamp = int(time())
    if new_timestamp - timestamp > 120:
        return False

    return True

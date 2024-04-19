import os
import shelve
import time

from django.core.mail.backends.base import BaseEmailBackend
from django.conf import settings

# Source: https://github.com/jricardo27/channels_example/commit/637b689870c2f879286f30eeb0c3e1d65283d557#diff-180eb8ba4002fc012b871a9b0c0ba23b31727c34a20d8470421841e9e3bb637b

MAIL_STORAGE_BASE = ".test_mail_storage_"
OUTBOX = "outbox"


class EmailBackend(BaseEmailBackend):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        if hasattr(settings, "MAIL_STORAGE_NAME"):
            mail_storage = MAIL_STORAGE_BASE + settings.MAIL_STORAGE_NAME
        else:
            mail_storage = MAIL_STORAGE_BASE
        # Clean outbox.
        try:
            os.remove(mail_storage)
        except OSError:
            pass

    def send_messages(self, messages):
        """Redirect messages to the dummy outbox"""
        if hasattr(settings, "MAIL_STORAGE_NAME"):
            mail_storage = MAIL_STORAGE_BASE + settings.MAIL_STORAGE_NAME
        else:
            mail_storage = MAIL_STORAGE_BASE

        msg_count = 0
        for message in messages:  # .message() triggers header validation
            message.message()

            storage = shelve.open(mail_storage)
            outbox = storage.get(OUTBOX, [])
            outbox.append(message)
            storage[OUTBOX] = outbox
            storage.close()

            msg_count += 1

        return msg_count


def get_outbox(mail_storage_name=None):
    time.sleep(1)
    if mail_storage_name:
        mail_storage = MAIL_STORAGE_BASE + mail_storage_name
    else:
        mail_storage = MAIL_STORAGE_BASE
    storage = shelve.open(mail_storage)
    outbox = storage[OUTBOX]
    storage.close()
    print(f"Mailbox length: {len(outbox)}")
    for mail in outbox:
        print(f"{mail.subject}, {mail.to}")
    print("-----")
    return outbox


def empty_outbox(mail_storage_name=None):
    if mail_storage_name:
        mail_storage = MAIL_STORAGE_BASE + mail_storage_name
    else:
        mail_storage = MAIL_STORAGE_BASE
    storage = shelve.open(mail_storage)
    storage[OUTBOX] = []
    storage.close()

import os
import shelve

from django.core.mail.backends.base import BaseEmailBackend

# Source: https://github.com/jricardo27/channels_example/commit/637b689870c2f879286f30eeb0c3e1d65283d557#diff-180eb8ba4002fc012b871a9b0c0ba23b31727c34a20d8470421841e9e3bb637b

MAIL_STORAGE = ".test_mail_storage"
OUTBOX = "outbox"


class EmailBackend(BaseEmailBackend):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # Clean outbox.
        try:
            os.remove(MAIL_STORAGE)
        except OSError:
            pass

    def send_messages(self, messages):
        """Redirect messages to the dummy outbox"""
        msg_count = 0

        for message in messages:  # .message() triggers header validation
            message.message()

            storage = shelve.open(MAIL_STORAGE)
            outbox = storage.get(OUTBOX, [])
            outbox.append(message)
            storage[OUTBOX] = outbox
            storage.close()

            msg_count += 1

        return msg_count


def get_outbox():
    storage = shelve.open(MAIL_STORAGE)
    outbox = storage[OUTBOX]
    storage.close()
    return outbox


def empty_outbox():
    storage = shelve.open(MAIL_STORAGE)
    storage[OUTBOX] = []
    storage.close()

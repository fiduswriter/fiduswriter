import logging

from django.core.mail.backends.base import BaseEmailBackend

logger = logging.getLogger("fiduswriter.outgoing_email")


class LoggingEmailBackend(BaseEmailBackend):
    """Email backend that only logs metadata about outgoing emails
    .

    Used as the packaged fallback when no SMTP backend has been
    configured on a production (``DEBUG = False``) instance, so user
    supplied content (e.g. anonymous feedback) never lands in the
    process' stdout.
    """

    def send_messages(self, messages):
        for message in messages:
            logger.warning(
                "Outgoing email was not sent: no email backend is "
                "configured. subject=%r recipients=%d",
                str(getattr(message, "subject", ""))[:200],
                len(getattr(message, "to", []) or []),
            )
        return len(messages)

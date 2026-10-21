import re

from django.db import models
from django.conf import settings

from . import emails

FEEDBACK_MAX_LENGTH = getattr(settings, "FEEDBACK_MAX_LENGTH", 5000)

_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def clean_feedback_message(message):
    """Cap length and strip control characters before the
    message reaches the process log or an email."""
    text = str(message or "")[:FEEDBACK_MAX_LENGTH]
    return _CONTROL_CHARS.sub("", text)


class Feedback(models.Model):
    message = models.TextField()
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        blank=True,
        null=True,
        on_delete=models.deletion.CASCADE,
    )

    def __str__(self):
        if self.owner:
            return f"{self.owner.username}: f{self.message}"
        else:
            return f"Anonymous: {self.message}"

    def save(self, *args, **kwargs):
        self.message = clean_feedback_message(self.message)
        reply_to = ""
        if self.owner:
            from_sender = self.owner.username
            if self.owner.email:
                reply_to = f" ({self.owner.email})"
        else:
            from_sender = "Anonymous"
        emails.send_feedback(from_sender, reply_to, self.message)
        super().save(*args, **kwargs)

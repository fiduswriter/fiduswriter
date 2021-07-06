from django.db import models
from django.conf import settings

from . import emails


class Feedback(models.Model):
    message = models.TextField()
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        blank=True,
        null=True,
        on_delete=models.deletion.CASCADE
    )

    def __str__(self):
        if self.owner:
            return self.owner.username + ': ' + self.message
        else:
            return 'Anonymous: ' + self.message

    def save(self, *args, **kwargs):
        reply_to = ''
        if self.owner:
            from_sender = self.owner.username
            if self.owner.email:
                reply_to = ' (' + self.owner.email + ')'
        else:
            from_sender = 'Anonymous'
        emails.send_feedback(from_sender, reply_to, self.message)
        super().save(*args, **kwargs)

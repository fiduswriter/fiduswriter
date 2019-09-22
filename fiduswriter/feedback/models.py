from django.db import models
from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.conf import settings


class Feedback(models.Model):
    message = models.TextField()
    owner = models.ForeignKey(
        User,
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
            if self.owner.email and self.owner.email:
                reply_to = ' (' + self.owner.email + ')'
        else:
            from_sender = 'Anonymous'
        send_mail('Feedback from ' + from_sender + reply_to,
                  self.message,
                  settings.DEFAULT_FROM_EMAIL,
                  [settings.CONTACT_EMAIL],
                  fail_silently=True)
        super(Feedback, self).save(*args, **kwargs)

from __future__ import unicode_literals
from django.db import models
from django.contrib.auth.models import User

from document.models import Document, RIGHTS_CHOICES


# A submission registered with OJS
class Submission(models.Model):
    document = models.ForeignKey(Document)
    user = models.ForeignKey(User)
    journal_id = models.PositiveIntegerField(default=0)
    submission_id = models.PositiveIntegerField(default=0)
    version_id = models.PositiveIntegerField(default=0)


# Access rights at the time of submission. To be restored after review is over.
class SubmittedAccessRight(models.Model):
    document = models.ForeignKey(Document)
    user = models.ForeignKey(User)
    submission_id = models.PositiveIntegerField(default=0)
    rights = models.CharField(
        max_length=21,
        choices=RIGHTS_CHOICES,
        blank=False)

    class Meta:
        unique_together = (("document", "user", "submission_id"),)

    def __unicode__(self):
        return (
            '%(name)s %(rights)s on %(doc_id)d' %
            {
                'name': self.user.readable_name,
                'rights': self.rights,
                'doc_id': self.document.id
            }
        )

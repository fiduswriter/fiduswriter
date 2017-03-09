from __future__ import unicode_literals
from django.db import models
from django.contrib.auth.models import User

from document.models import Document, RIGHTS_CHOICES


# A Journal registered with a particular OJS installation
class Journal(models.Model):
    ojs_url = models.CharField(max_length=512)
    ojs_key = models.CharField(max_length=512)
    ojs_jid = models.PositiveIntegerField()  # _jid as _id is foreign key
    name = models.CharField(max_length=512)
    editor = models.ForeignKey(User)

    class Meta:
        unique_together = (("ojs_url", "ojs_jid"),)

    def __unicode__(self):
        return self.name

def submission_filename(instance, filename):
    return '/'.join([
        'submission',
        str(instance.journal.id),
        str(instance.submitter.id),
        filename
    ])


# A submission registered with OJS
class Submission(models.Model):
    submitter = models.ForeignKey(User)
    journal = models.ForeignKey(Journal)
    ojs_jid = models.PositiveIntegerField(default=0) # ID in OJS

    def __unicode__(self):
        return u'{ojs_jid} in {journal} by {submitter}'.format(
            ojs_jid=self.ojs_jid,
            journal=self.journal.name,
            submitter=self.submitter.username
        )

# Within each submission, there is a new file upload for each revision
class SubmissionRevision(models.Model):
    submission = models.ForeignKey(Submission)
    version = models.PositiveIntegerField(default=0)
    file_object = models.FileField(upload_to=submission_filename)
    # The document is the opened file_object. Until it is opened for the first
    # time, there is no document.
    document = models.ForeignKey(Document, null=True, blank=True)

    class Meta:
        unique_together = (("version", "submission"))

    def __unicode__(self):
        return u'{ojs_jid} (v{version}) in {journal} by {submitter}'.format(
            ojs_jid=self.submission.ojs_jid,
            version=self.version,
            journal=self.submission.journal.name,
            submitter=self.submission.submitter.username
        )

# Access rights at the time of submission. To be restored after review is over.
class SubmittedAccessRight(models.Model):
    document = models.ForeignKey(Document)
    user = models.ForeignKey(User)
    submission_id = models.PositiveIntegerField()
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

from __future__ import unicode_literals
from django.db import models
from django.contrib.auth.models import User

from document.models import Document


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
    ojs_jid = models.PositiveIntegerField(default=0)  # ID in OJS
    # The submission is uploaded from FW client to server as a zip file. This
    # zip file is imported into the editor's account the first time an editor
    # or reviewer is opening a document of a revision with version==0.
    # We do this, as the submitter won't have access rights to the media
    # library of the editor.
    file_object = models.FileField(upload_to=submission_filename)

    def __unicode__(self):
        return u'{ojs_jid} in {journal} by {submitter}'.format(
            ojs_jid=self.ojs_jid,
            journal=self.journal.name,
            submitter=self.submitter.username
        )


# An author registered with OJS and also registered here
# Authors are the same for an entire submission.
class Author(models.Model):
    user = models.ForeignKey(User)
    submission = models.ForeignKey(Submission)
    ojs_jid = models.PositiveIntegerField(default=0)  # ID in OJS

    class Meta:
        unique_together = (("submission", "ojs_jid"))

    def __unicode__(self):
        return u'{username} ({ojs_jid})'.format(
            username=self.user.username,
            ojs_jid=self.ojs_jid
        )


# Within each submission, there is a new file upload for each revision
class SubmissionRevision(models.Model):
    submission = models.ForeignKey(Submission)
    # version = stage ID + "." + round + "." + (0 for reviewer or 5 for author)
    # version)
    # For example:
    # submission version: "1.0.0"
    # Author version of 5th external review (stage ID=3): "3.5.5"
    # The version should increase like a computer version number. Not all
    # numbers are included.
    version = models.CharField(max_length=8, default='1.0.0')
    document = models.ForeignKey(Document)

    def __unicode__(self):
        return u'{ojs_jid} (v{version}) in {journal} by {submitter}'.format(
            ojs_jid=self.submission.ojs_jid,
            version=self.version,
            journal=self.submission.journal.name,
            submitter=self.submission.submitter.username
        )


# A reviewer registered with OJS and also registered here
# Reviewers can differ from revision to revision.
class Reviewer(models.Model):
    user = models.ForeignKey(User)
    revision = models.ForeignKey(SubmissionRevision)
    ojs_jid = models.PositiveIntegerField(default=0)  # ID in OJS

    class Meta:
        unique_together = (("revision", "ojs_jid"))

    def __unicode__(self):
        return u'{username} ({ojs_jid})'.format(
            username=self.user.username,
            ojs_jid=self.ojs_jid
        )

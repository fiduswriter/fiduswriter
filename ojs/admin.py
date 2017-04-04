from django.contrib import admin
from django.shortcuts import render

from . import models


class SubmissionAdmin(admin.ModelAdmin):
    pass

admin.site.register(models.Submission, SubmissionAdmin)


class SubmissionRevisionAdmin(admin.ModelAdmin):
    pass

admin.site.register(models.SubmissionRevision, SubmissionRevisionAdmin)


class AuthorAdmin(admin.ModelAdmin):
    pass

admin.site.register(models.Author, AuthorAdmin)


class ReviewerAdmin(admin.ModelAdmin):
    pass

admin.site.register(models.Reviewer, ReviewerAdmin)


class JournalAdmin(admin.ModelAdmin):
    pass

admin.site.register(models.Journal, JournalAdmin)


def register_journal_view(request, *args, **kwargs):
    response = {}
    return render(request, 'ojs/register_journals.html', response)

admin.site.register_view(
    'register_journal/',
    'Register journal',
    view=register_journal_view
)

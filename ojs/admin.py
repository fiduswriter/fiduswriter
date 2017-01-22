from django.contrib import admin

from . import models


class SubmissionAdmin(admin.ModelAdmin):
    pass

admin.site.register(models.Submission, SubmissionAdmin)

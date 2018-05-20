from __future__ import unicode_literals
from django.contrib import admin
from django.shortcuts import render
from . import models


class DocumentAdmin(admin.ModelAdmin):
    pass


admin.site.register(models.Document, DocumentAdmin)


class AccessRightAdmin(admin.ModelAdmin):
    pass


admin.site.register(models.AccessRight, AccessRightAdmin)


class DocumentRevisionAdmin(admin.ModelAdmin):
    pass


admin.site.register(models.DocumentRevision, DocumentRevisionAdmin)


class ExportTemplateAdmin(admin.ModelAdmin):
    pass


admin.site.register(models.ExportTemplate, ExportTemplateAdmin)


def maintenance_view(request, *args, **kwargs):
    response = {}
    return render(request, 'maintenance/index.html', response)


admin.site.register_view('maintenance/', 'Maintenance', view=maintenance_view)

from django.contrib import admin
from django.shortcuts import render
from django.urls import path
from . import models


class DocumentAdmin(admin.ModelAdmin):
    def get_urls(self):
        urls = super().get_urls()
        extra_urls = [
            path(
                'maintenance/',
                self.admin_site.admin_view(self.maintenance_view)
            )
        ]
        urls = extra_urls + urls
        return urls

    def maintenance_view(self, request):
        response = {}
        return render(request, 'maintenance/index.html', response)


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

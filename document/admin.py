from django.contrib import admin
from django.shortcuts import render
from django.urls import path
from django.utils.translation import ugettext as _
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
        return render(request, 'admin/document/maintenance.html', response)


admin.site.register(models.Document, DocumentAdmin)


class DocumentTemplateAdmin(admin.ModelAdmin):
    actions = ['duplicate']
    list_display = ('title', 'user',)

    def duplicate(self, request, queryset):
        for template in queryset:
            document_styles = list(template.document_styles.all())
            citation_styles = list(template.citation_styles.all())
            export_templates = list(template.export_templates.all())
            template.pk = None
            template.save()
            for ds in document_styles:
                template.document_styles.add(ds)
            for cs in citation_styles:
                template.citation_styles.add(cs)
            for et in export_templates:
                template.export_templates.add(et)
    duplicate.short_description = _("Duplicate selected document templates")


admin.site.register(models.DocumentTemplate, DocumentTemplateAdmin)


class AccessRightAdmin(admin.ModelAdmin):
    pass


admin.site.register(models.AccessRight, AccessRightAdmin)


class AccessRightInviteAdmin(admin.ModelAdmin):
    pass


admin.site.register(models.AccessRightInvite, AccessRightInviteAdmin)


class DocumentRevisionAdmin(admin.ModelAdmin):
    pass


admin.site.register(models.DocumentRevision, DocumentRevisionAdmin)


class ExportTemplateAdmin(admin.ModelAdmin):
    pass


admin.site.register(models.ExportTemplate, ExportTemplateAdmin)

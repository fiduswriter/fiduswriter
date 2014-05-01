from django.contrib import admin
from django.core.management import call_command

from . import models


def delete_document_style(modeladmin, request, queryset):
    for obj in queryset:
        obj.delete()
        call_command("create_document_styles")
        try:
            call_command("compress")
        except:
            pass
        call_command("collectstatic", interactive=False)        

delete_document_style.short_description = "Delete selected document styles"

class DocumentStyleAdmin(admin.ModelAdmin):
    actions = [delete_document_style]
    
    def save_model(self, request, obj, form, change):
        obj.save()
        call_command("create_document_styles")
        try:
            call_command("compress")
        except:
            pass
        call_command("collectstatic", interactive=False)

    def delete_model(self, request, obj):
        obj.delete()
        call_command("create_document_styles")
        try:
            call_command("compress")
        except:
            pass
        call_command("collectstatic", interactive=False)
        
    def get_actions(self, request):
        actions = super(DocumentStyleAdmin, self).get_actions(request)
        del actions['delete_selected']
        return actions


admin.site.register(models.DocumentStyle, DocumentStyleAdmin)

class DocumentFontAdmin(admin.ModelAdmin):
    pass

admin.site.register(models.DocumentFont, DocumentFontAdmin)


class CitationStyleAdmin(admin.ModelAdmin):
    pass

admin.site.register(models.CitationStyle, CitationStyleAdmin)

class CitationLocaleAdmin(admin.ModelAdmin):
    pass

admin.site.register(models.CitationLocale, CitationLocaleAdmin)
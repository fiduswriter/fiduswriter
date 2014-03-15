from django.contrib import admin
from django.core.management import call_command

from . import models


class DocumentStyleAdmin(admin.ModelAdmin):
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


admin.site.register(models.DocumentStyle, DocumentStyleAdmin)

class DocumentFontAdmin(admin.ModelAdmin):
    pass

admin.site.register(models.DocumentFont, DocumentFontAdmin)
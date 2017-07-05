from django.contrib import admin
from django.core.management import call_command

from . import models


class DocumentStyleAdmin(admin.ModelAdmin):
    pass

admin.site.register(models.DocumentStyle, DocumentStyleAdmin)


class DocumentFontAdmin(admin.ModelAdmin):
    pass

admin.site.register(models.DocumentFont, DocumentFontAdmin)


def delete_citation_style(modeladmin, request, queryset):
    for obj in queryset:
        obj.delete()
        call_command("create_citation_styles")
        try:
            call_command("compress")
        except:
            pass
        call_command("collectstatic", interactive=False)

delete_citation_style.short_description = "Delete selected citation styles"


def delete_citation_locale(modeladmin, request, queryset):
    for obj in queryset:
        obj.delete()
        call_command("create_citation_styles")
        try:
            call_command("compress")
        except:
            pass
        call_command("collectstatic", interactive=False)

delete_citation_locale.short_description = "Delete selected citation locales"


class CitationStyleAdmin(admin.ModelAdmin):
    actions = [delete_citation_style]

    def save_model(self, request, obj, form, change):
        obj.save()
        call_command("create_citation_styles")
        try:
            call_command("compress")
        except:
            pass
        call_command("collectstatic", interactive=False)

    def delete_model(self, request, obj):
        obj.delete()
        call_command("create_citation_styles")
        try:
            call_command("compress")
        except:
            pass
        call_command("collectstatic", interactive=False)

    def get_actions(self, request):
        actions = super(CitationStyleAdmin, self).get_actions(request)
        del actions['delete_selected']
        return actions

admin.site.register(models.CitationStyle, CitationStyleAdmin)


class CitationLocaleAdmin(admin.ModelAdmin):
    actions = [delete_citation_locale]

    def save_model(self, request, obj, form, change):
        obj.save()
        call_command("create_citation_styles")
        try:
            call_command("compress")
        except:
            pass
        call_command("collectstatic", interactive=False)

    def delete_model(self, request, obj):
        obj.delete()
        call_command("create_citation_styles")
        try:
            call_command("compress")
        except:
            pass
        call_command("collectstatic", interactive=False)

    def get_actions(self, request):
        actions = super(CitationLocaleAdmin, self).get_actions(request)
        del actions['delete_selected']
        return actions

admin.site.register(models.CitationLocale, CitationLocaleAdmin)

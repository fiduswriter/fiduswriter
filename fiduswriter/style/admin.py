from django.contrib import admin

from . import models


class DocumentStyleFileAdmin(admin.ModelAdmin):
    pass


admin.site.register(models.DocumentStyleFile, DocumentStyleFileAdmin)


class DocumentStyleFileInline(admin.TabularInline):
    model = models.DocumentStyleFile
    extra = 1


class DocumentStyleAdmin(admin.ModelAdmin):
    inlines = [DocumentStyleFileInline, ]


admin.site.register(models.DocumentStyle, DocumentStyleAdmin)


class DocumentStyleInline(admin.TabularInline):
    model = models.DocumentStyle
    extra = 1
    show_change_link = True


class CitationStyleAdmin(admin.ModelAdmin):
    pass


admin.site.register(models.CitationStyle, CitationStyleAdmin)


class CitationLocaleAdmin(admin.ModelAdmin):
    pass


admin.site.register(models.CitationLocale, CitationLocaleAdmin)


class ExportTemplateAdmin(admin.ModelAdmin):
    pass


admin.site.register(models.ExportTemplate, ExportTemplateAdmin)


class ExportTemplateInline(admin.TabularInline):
    model = models.ExportTemplate
    extra = 1

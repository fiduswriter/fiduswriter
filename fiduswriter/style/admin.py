from django.contrib import admin

from . import models


class DocumentStyleAdmin(admin.ModelAdmin):
    pass


admin.site.register(models.DocumentStyle, DocumentStyleAdmin)


class DocumentStyleFileAdmin(admin.ModelAdmin):
    pass


admin.site.register(models.DocumentStyleFile, DocumentStyleFileAdmin)


class CitationStyleAdmin(admin.ModelAdmin):
    pass


admin.site.register(models.CitationStyle, CitationStyleAdmin)


class CitationLocaleAdmin(admin.ModelAdmin):
    pass


admin.site.register(models.CitationLocale, CitationLocaleAdmin)


class ExportTemplateAdmin(admin.ModelAdmin):
    pass


admin.site.register(models.ExportTemplate, ExportTemplateAdmin)

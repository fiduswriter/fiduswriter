from django.contrib import admin

from . import models


class DocumentStyleAdmin(admin.ModelAdmin):
    pass


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

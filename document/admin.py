from django.contrib import admin

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

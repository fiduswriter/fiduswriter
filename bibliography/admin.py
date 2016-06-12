from django.contrib import admin
from bibliography.models import (
    Entry,
    EntryType,
    EntryField,
    EntryCategory,
    TexSpecialChar,
    EntryTypeAlias,
    EntryFieldAlias
)


class TexSpecialCharAdmin(admin.ModelAdmin):
    pass
admin.site.register(TexSpecialChar, TexSpecialCharAdmin)


class EntryCategoryAdmin(admin.ModelAdmin):
    pass
admin.site.register(EntryCategory, EntryCategoryAdmin)


class EntryAdmin(admin.ModelAdmin):
    pass
admin.site.register(Entry, EntryAdmin)


class EntryTypeAdmin(admin.ModelAdmin):
    pass
admin.site.register(EntryType, EntryTypeAdmin)


class EntryTypeAliasAdmin(admin.ModelAdmin):
    pass
admin.site.register(EntryTypeAlias, EntryTypeAliasAdmin)


class EntryFieldAdmin(admin.ModelAdmin):
    pass
admin.site.register(EntryField, EntryFieldAdmin)


class EntryFieldAliasAdmin(admin.ModelAdmin):
    pass
admin.site.register(EntryFieldAlias, EntryFieldAliasAdmin)

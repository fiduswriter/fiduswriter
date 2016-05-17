from django.contrib import admin

from . import models


class BookAdmin(admin.ModelAdmin):
    pass

admin.site.register(models.Book, BookAdmin)


class BookAccessRightAdmin(admin.ModelAdmin):
    pass

admin.site.register(models.BookAccessRight, BookAccessRightAdmin)


class ChapterAdmin(admin.ModelAdmin):
    pass

admin.site.register(models.Chapter, ChapterAdmin)

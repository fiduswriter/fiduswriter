from django.contrib import admin
from usermedia.models import Image, ImageCategory


class ImageAdmin(admin.ModelAdmin):
    pass
admin.site.register(Image, ImageAdmin)


class ImageCategoryAdmin(admin.ModelAdmin):
    pass
admin.site.register(ImageCategory, ImageCategoryAdmin)

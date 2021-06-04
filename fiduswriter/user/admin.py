from django.contrib import admin

from . import models


class UserAdmin(admin.ModelAdmin):
    pass


admin.site.register(models.User, UserAdmin)


class UserInviteAdmin(admin.ModelAdmin):
    pass


admin.site.register(models.UserInvite, UserInviteAdmin)

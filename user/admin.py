from django.contrib import admin

from .models import UserProfile, TeamMember


class UserProfileAdmin(admin.ModelAdmin):
    pass


admin.site.register(UserProfile, UserProfileAdmin)


class TeamMemberAdmin(admin.ModelAdmin):
    pass


admin.site.register(TeamMember, TeamMemberAdmin)

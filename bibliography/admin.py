#
# This file is part of Fidus Writer <http://www.fiduswriter.org>
#
# Copyright (C) 2013 Takuto Kojima, Johannes Wilm
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as
# published by the Free Software Foundation, either version 3 of the
# License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.

from django.contrib import admin
from bibliography.models import Entry, EntryType, EntryField, EntryCategory, TexSpecialChar, EntryTypeAlias, EntryFieldAlias

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

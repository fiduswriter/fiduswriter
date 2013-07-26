#
# This file is part of Fidus Writer <http://www.fiduswriter.com>
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

from bibliography.models import TexSpecialChar, EntryField, EntryType, EntryFieldAlias, EntryTypeAlias, LocalizationKey

from django.core.management.base import BaseCommand
from django.core.management import call_command
    
class Command(BaseCommand):
    args = ''
    help = 'Load bibliography fixtures into DB.'

    def handle(self, *args, **options):

        # delete all previous entries
        
        TexSpecialChar.objects.all().delete()
        EntryField.objects.all().delete()
        EntryType.objects.all().delete()
        EntryFieldAlias.objects.all().delete()
        EntryTypeAlias.objects.all().delete()
        LocalizationKey.objects.all().delete()
        
        #call_command("loaddata", "initial_bib_rules.json")
        call_command("loaddata", "initial_tex_chars.json")

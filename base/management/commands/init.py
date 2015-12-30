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

from django.core.management.base import BaseCommand
from django.core.management import call_command

from optparse import make_option

class Command(BaseCommand):
    args = '[restart]'
    help = 'Initialize Fidus Writer installation. If the argument "reset" is given, the database is flushed before initializing.'


    def handle(self, *args, **options):
        if "restart" in args:
            call_command("flush")
            call_command("migrate", fake=True)
        else:
            call_command("migrate")
        call_command("loaddata", "bibliography/fixtures/initial_bib_rules.json")
        call_command("create_bibliography_js")
        call_command("loaddata", "style/fixtures/initial_styles.json")
        call_command("create_document_styles")
        call_command("create_citation_styles")
        call_command("loaddata", "base/fixtures/initial_terms.json")
        call_command("compilemessages")
        try:
            call_command("compress")
        except:
            pass
        call_command("collectstatic", interactive=False)

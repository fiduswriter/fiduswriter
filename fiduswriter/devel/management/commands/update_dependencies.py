"""
Management command to update Python and JavaScript dependencies to their latest versions.
"""

from django.core.management.base import BaseCommand
from django.conf import settings
import os

from devel.dependency_utils import (
    update_requirements_txt,
    update_package_json5,
    find_package_json5_files,
    find_requirements_files,
)


class Command(BaseCommand):
    help = "Update Python and JavaScript dependencies to their latest versions"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            dest="dry_run",
            default=False,
            help="Show what would be updated without actually updating",
        )
        parser.add_argument(
            "--python-only",
            action="store_true",
            dest="python_only",
            default=False,
            help="Only update Python dependencies",
        )
        parser.add_argument(
            "--js-only",
            action="store_true",
            dest="js_only",
            default=False,
            help="Only update JavaScript dependencies",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        python_only = options["python_only"]
        js_only = options["js_only"]

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    "Running in DRY RUN mode - no files will be modified\n"
                )
            )

        project_path = settings.PROJECT_PATH

        # Update Python dependencies
        if not js_only:
            self.stdout.write(
                self.style.SUCCESS("\n=== Updating Python Dependencies ===\n")
            )

            requirements_files = find_requirements_files(project_path)

            if not requirements_files:
                self.stdout.write(
                    self.style.WARNING("No requirements.txt files found")
                )

            for req_file in requirements_files:
                self.stdout.write(
                    f"\nProcessing {os.path.basename(req_file)}:"
                )
                updates = update_requirements_txt(req_file, dry_run=dry_run)

                if updates:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"  Updated {len(updates)} package(s)"
                        )
                    )
                else:
                    self.stdout.write("  No updates available")

        # Update JavaScript dependencies
        if not python_only:
            self.stdout.write(
                self.style.SUCCESS(
                    "\n=== Updating JavaScript Dependencies ===\n"
                )
            )

            package_json5_files = find_package_json5_files(project_path)

            if not package_json5_files:
                self.stdout.write(
                    self.style.WARNING(
                        "No package.json5 or package.json files found"
                    )
                )

            for package_file in package_json5_files:
                app_name = os.path.basename(os.path.dirname(package_file))
                package_filename = os.path.basename(package_file)
                self.stdout.write(
                    f"\nProcessing {app_name}/{package_filename}:"
                )
                updates = update_package_json5(package_file, dry_run=dry_run)

                if updates:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"  Updated {len(updates)} package(s)"
                        )
                    )
                else:
                    self.stdout.write("  No updates available")

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    "\n\nDRY RUN completed - no files were modified"
                )
            )
            self.stdout.write("Run without --dry-run to apply these updates")
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    "\n\nAll dependencies updated successfully!"
                )
            )
            self.stdout.write("\nNext steps:")
            self.stdout.write("  1. Review the changes")
            self.stdout.write(
                "  2. Run: pip install -r requirements.txt (to update Python packages)"
            )
            self.stdout.write(
                "  3. Run: python manage.py transpile (to update JavaScript packages)"
            )
            self.stdout.write("  4. Test your application")

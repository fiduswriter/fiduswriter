"""
Management command to check for outdated Python and JavaScript dependencies.
"""

from django.core.management.base import BaseCommand
from django.conf import settings
import os

from devel.dependency_utils import (
    parse_requirements_txt,
    get_latest_pypi_version,
    parse_package_json5,
    get_latest_npm_version,
    find_package_json5_files,
    find_requirements_files,
)
import re


class Command(BaseCommand):
    help = "Check for outdated Python and JavaScript dependencies"

    def add_arguments(self, parser):
        parser.add_argument(
            "--python-only",
            action="store_true",
            dest="python_only",
            default=False,
            help="Only check Python dependencies",
        )
        parser.add_argument(
            "--js-only",
            action="store_true",
            dest="js_only",
            default=False,
            help="Only check JavaScript dependencies",
        )

    def handle(self, *args, **options):
        python_only = options["python_only"]
        js_only = options["js_only"]

        project_path = settings.PROJECT_PATH

        total_outdated = 0

        # Check Python dependencies
        if not js_only:
            self.stdout.write(
                self.style.SUCCESS("\n=== Python Dependencies ===\n")
            )

            requirements_files = find_requirements_files(project_path)

            if not requirements_files:
                self.stdout.write(
                    self.style.WARNING("No requirements.txt files found")
                )

            for req_file in requirements_files:
                self.stdout.write(f"\n{os.path.basename(req_file)}:")
                packages = parse_requirements_txt(req_file)
                outdated_count = 0

                for package_name, version_spec, original_line in packages:
                    if package_name is None or not version_spec:
                        continue

                    # Skip packages with comment-only versions
                    if version_spec.startswith("#"):
                        continue

                    # Get current version
                    current_match = re.search(
                        r"([0-9]+\.[0-9]+(?:\.[0-9]+)?(?:\.[0-9]+)?)",
                        version_spec,
                    )
                    current_version = (
                        current_match.group(1) if current_match else "unknown"
                    )

                    # Get latest version
                    latest_version = get_latest_pypi_version(package_name)

                    if latest_version and latest_version != current_version:
                        self.stdout.write(
                            f'  {self.style.WARNING("⬆")} {package_name}: '
                            f"{current_version} → {self.style.SUCCESS(latest_version)}"
                        )
                        outdated_count += 1
                        total_outdated += 1

                if outdated_count == 0:
                    self.stdout.write(
                        self.style.SUCCESS("  ✓ All packages up to date")
                    )

        # Check JavaScript dependencies
        if not python_only:
            self.stdout.write(
                self.style.SUCCESS("\n=== JavaScript Dependencies ===\n")
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
                self.stdout.write(f"\n{app_name}/{package_filename}:")

                data = parse_package_json5(package_file)
                outdated_count = 0

                if "dependencies" in data:
                    for package_name, version in data["dependencies"].items():
                        # Remove version prefixes like ^, ~, >=, etc.
                        clean_version = re.sub(r"^[\^~>=<]+", "", str(version))

                        # Get latest version
                        latest_version = get_latest_npm_version(package_name)

                        if latest_version and latest_version != clean_version:
                            # Preserve the version prefix for display
                            prefix_match = re.match(
                                r"^([\^~>=<]+)", str(version)
                            )
                            prefix = (
                                prefix_match.group(1) if prefix_match else ""
                            )

                            self.stdout.write(
                                f'  {self.style.WARNING("⬆")} {package_name}: '
                                f"{version} → {self.style.SUCCESS(prefix + latest_version)}"
                            )
                            outdated_count += 1
                            total_outdated += 1

                if outdated_count == 0:
                    self.stdout.write(
                        self.style.SUCCESS("  ✓ All packages up to date")
                    )

        # Summary
        self.stdout.write("\n" + "=" * 50)
        if total_outdated > 0:
            self.stdout.write(
                self.style.WARNING(
                    f"\n{total_outdated} package(s) can be updated"
                )
            )
            self.stdout.write("\nRun: python manage.py update_dependencies")
            self.stdout.write(
                "Or:  python manage.py update_dependencies --dry-run (to preview changes)"
            )
        else:
            self.stdout.write(
                self.style.SUCCESS("\n✓ All dependencies are up to date!")
            )

"""
Management command to run JavaScript import/export tests.

Invokes Jest on the __tests__ directories within the exporter and importer
modules. These tests verify that all import and export filters work correctly
and maintain feature parity between formats.

Usage:
    python manage.py test_import_export
    python manage.py test_import_export --exporter-only
    python manage.py test_import_export --importer-only
    python manage.py test_import_export --update-snapshots
    python manage.py test_import_export --coverage
"""

import os
import subprocess
from pathlib import Path
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Run JavaScript import/export filter tests via Jest"

    def add_arguments(self, parser):
        parser.add_argument(
            "--exporter-only",
            action="store_true",
            help="Run only exporter tests",
        )
        parser.add_argument(
            "--importer-only",
            action="store_true",
            help="Run only importer tests",
        )
        parser.add_argument(
            "--update-snapshots",
            action="store_true",
            help="Update Jest snapshots",
        )
        parser.add_argument(
            "--coverage",
            action="store_true",
            help="Generate coverage report",
        )
        parser.add_argument(
            "--watch",
            action="store_true",
            help="Run tests in watch mode",
        )
        parser.add_argument(
            "--verbose",
            action="store_true",
            help="Verbose output",
        )

    def handle(self, *args, **options):
        # Check Node.js availability
        try:
            subprocess.run(
                ["node", "--version"],
                capture_output=True,
                check=True,
            )
        except (FileNotFoundError, subprocess.CalledProcessError):
            raise CommandError("Node.js is required but not found.")

        # Check npx/jest availability
        try:
            subprocess.run(
                ["npx", "--yes", "jest", "--version"],
                capture_output=True,
                check=True,
                timeout=30,
            )
        except (FileNotFoundError, subprocess.CalledProcessError):
            self.stdout.write(
                self.style.WARNING("Jest not found. Installing jest...")
            )
        except subprocess.TimeoutExpired:
            self.stdout.write(
                self.style.WARNING("Jest check timed out, proceeding...")
            )

        base_dir = Path(settings.PROJECT_PATH)
        module_dir = base_dir / "document" / "static" / "js" / "modules"

        exporter_test_dir = module_dir / "exporter" / "__tests__"
        importer_test_dir = module_dir / "importer" / "__tests__"

        # Verify test directories exist
        if not exporter_test_dir.exists():
            self.stdout.write(
                self.style.WARNING(
                    f"Exporter test directory not found: {exporter_test_dir}"
                )
            )
        if not importer_test_dir.exists():
            self.stdout.write(
                self.style.WARNING(
                    f"Importer test directory not found: {importer_test_dir}"
                )
            )

        if not exporter_test_dir.exists() and not importer_test_dir.exists():
            raise CommandError(
                "No test directories found. Run 'pip install -e .' and ensure "
                "the project is properly set up."
            )

        # Build jest command
        jest_args = ["npx", "--yes", "jest"]

        if options.get("verbose"):
            jest_args.append("--verbose")
        if options.get("update_snapshots"):
            jest_args.append("--updateSnapshot")
        if options.get("coverage"):
            jest_args.append("--coverage")
        if options.get("watch"):
            jest_args.append("--watchAll")

        run_exporter = not options.get("importer_only")
        run_importer = not options.get("exporter_only")

        all_passed = True

        if run_exporter and exporter_test_dir.exists():
            self.stdout.write(
                self.style.MIGRATE_HEADING("Running exporter tests...")
            )
            result = self._run_jest(jest_args, exporter_test_dir, options)
            if result != 0:
                all_passed = False

        if run_importer and importer_test_dir.exists():
            self.stdout.write(
                self.style.MIGRATE_HEADING("Running importer tests...")
            )
            result = self._run_jest(jest_args, importer_test_dir, options)
            if result != 0:
                all_passed = False

        # Generate test files if they don't exist
        self._ensure_test_files(base_dir)

        if all_passed:
            self.stdout.write(
                self.style.SUCCESS("\n✓ All import/export tests passed!")
            )
        else:
            raise CommandError(
                "\n✗ Some import/export tests failed. See above for details."
            )

    def _run_jest(self, base_args, test_dir, options):
        """Run jest in a specific test directory."""
        args = base_args + [
            "--config",
            str(test_dir / "jest.config.js"),
            "--no-cache",
        ]

        self.stdout.write(f"  Directory: {test_dir}")
        self.stdout.write(f"  Command: {' '.join(args)}")

        env = os.environ.copy()
        env["NODE_OPTIONS"] = "--experimental-vm-modules"

        result = subprocess.run(
            args,
            cwd=str(test_dir),
            capture_output=False,
            text=True,
            env=env,
            timeout=120,
        )

        return result.returncode

    def _ensure_test_files(self, base_dir):
        """Generate test DOCX/ODT files if they don't exist."""
        output_dir = (
            base_dir
            / "document"
            / "static"
            / "js"
            / "modules"
            / "importer"
            / "__tests__"
            / "fixtures"
        )
        docx_path = output_dir / "comprehensive-test.docx"
        odt_path = output_dir / "comprehensive-test.odt"

        if not docx_path.exists() or not odt_path.exists():
            self.stdout.write(
                self.style.WARNING(
                    "Test DOCX/ODT files not found. Generating..."
                )
            )
            try:
                from devel.management.commands.generate_import_testfiles import (
                    Command as GenCommand,
                )

                gen_cmd = GenCommand()
                gen_cmd.handle(output_dir=str(output_dir))
                self.stdout.write(
                    self.style.SUCCESS("  ✓ Test files generated successfully")
                )
            except (ImportError, Exception) as e:
                self.stdout.write(
                    self.style.WARNING(f"  Could not generate test files: {e}")
                )

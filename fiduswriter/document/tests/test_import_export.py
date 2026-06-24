"""
Tests for JavaScript import/export filters.

Runs the Jest test suite inside the @fiduswriter/document npm package. These
verify that all import and export filters work correctly and maintain feature
parity between formats.

Usage:
    python manage.py test document.tests.test_import_export
"""

import os
import subprocess
from pathlib import Path

from django.conf import settings
from django.test import SimpleTestCase, tag


@tag("import_export")
class ImportExportJestTest(SimpleTestCase):
    """Run the JavaScript Jest tests for import/export filters."""

    # No database needed — these tests run Jest externally

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.base_dir = Path(settings.PROJECT_PATH)
        cls.package_dir = cls.base_dir.parent.parent / "fiduswriter-document"
        cls.fixture_dir = cls.package_dir / "test" / "importer" / "fixtures"

        # Ensure test fixture files exist
        cls._ensure_test_files()

    @classmethod
    def _ensure_test_files(cls):
        """Generate test DOCX/ODT files if they don't exist."""
        docx_path = cls.fixture_dir / "comprehensive-test.docx"
        odt_path = cls.fixture_dir / "comprehensive-test.odt"

        if not docx_path.exists() or not odt_path.exists():
            try:
                from devel.management.commands.generate_import_testfiles import (
                    Command as GenCommand,
                )

                gen_cmd = GenCommand()
                gen_cmd.handle(output_dir=str(cls.fixture_dir))
            except Exception as e:
                raise RuntimeError(
                    f"Could not generate test fixture files: {e}"
                )

    def _check_node_available(self):
        """Verify Node.js is available and return the node binary path."""
        try:
            subprocess.run(
                ["node", "--version"],
                capture_output=True,
                check=True,
                timeout=15,
            )
        except (FileNotFoundError, subprocess.CalledProcessError):
            self.skipTest("Node.js is required but not found.")
        except subprocess.TimeoutExpired:
            self.skipTest("Node.js check timed out.")

    def _run_npm_test(self):
        """Run npm test in the package directory."""
        self._check_node_available()

        if not self.package_dir.exists():
            self.skipTest(
                f"@fiduswriter/document package not found: {self.package_dir}"
            )

        args = ["npm", "test"]

        env = os.environ.copy()
        env["NODE_OPTIONS"] = "--experimental-vm-modules"

        try:
            result = subprocess.run(
                args,
                cwd=str(self.package_dir),
                capture_output=True,
                text=True,
                env=env,
                timeout=120,
            )
        except subprocess.TimeoutExpired:
            self.fail("Import/export Jest tests timed out after 120 seconds.")
        except FileNotFoundError:
            self.skipTest("npm not found. Ensure Node.js/npm is installed.")

        # Print output for debugging
        if result.stdout:
            print(f"\n--- npm test stdout ---\n{result.stdout}")
        if result.stderr:
            print(f"\n--- npm test stderr ---\n{result.stderr}")

        self.assertEqual(
            result.returncode,
            0,
            f"Import/export Jest tests failed (exit code {result.returncode}).",
        )

    def test_import_export_jest(self):
        """Run Jest tests for the importer and exporter modules."""
        self._run_npm_test()

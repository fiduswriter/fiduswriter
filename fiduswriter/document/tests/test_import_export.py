"""
Tests for JavaScript import/export filters.

Runs Jest on the __tests__ directories within the exporter and importer
modules. These tests verify that all import and export filters work correctly
and maintain feature parity between formats.

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
        cls.module_dir = (
            cls.base_dir / "document" / "static" / "js" / "modules"
        )
        cls.exporter_test_dir = cls.module_dir / "exporter" / "__tests__"
        cls.importer_test_dir = cls.module_dir / "importer" / "__tests__"

        # Ensure test fixture files exist
        cls._ensure_test_files()

    @classmethod
    def _ensure_test_files(cls):
        """Generate test DOCX/ODT files if they don't exist."""
        output_dir = (
            cls.base_dir
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
            try:
                from devel.management.commands.generate_import_testfiles import (
                    Command as GenCommand,
                )

                gen_cmd = GenCommand()
                gen_cmd.handle(output_dir=str(output_dir))
            except (ImportError, Exception) as e:
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

    def _run_jest(self, test_dir, test_label):
        """Run Jest in a specific test directory and return success bool."""
        self._check_node_available()

        if not test_dir.exists():
            self.skipTest(f"Test directory not found: {test_dir}")

        jest_config = test_dir / "jest.config.js"
        if not jest_config.exists():
            self.skipTest(f"Jest config not found: {jest_config}")

        args = [
            "npx",
            "--yes",
            "jest",
            "--config",
            str(jest_config),
            "--no-cache",
            "--verbose",
        ]

        env = os.environ.copy()
        env["NODE_OPTIONS"] = "--experimental-vm-modules"

        try:
            result = subprocess.run(
                args,
                cwd=str(test_dir),
                capture_output=True,
                text=True,
                env=env,
                timeout=120,
            )
        except subprocess.TimeoutExpired:
            self.fail(f"{test_label} Jest tests timed out after 120 seconds.")
        except FileNotFoundError:
            self.skipTest(
                "npx/jest not found. Ensure npm dependencies are installed."
            )

        # Print output for debugging
        if result.stdout:
            print(f"\n--- {test_label} stdout ---\n{result.stdout}")
        if result.stderr:
            print(f"\n--- {test_label} stderr ---\n{result.stderr}")

        self.assertEqual(
            result.returncode,
            0,
            f"{test_label} Jest tests failed (exit code {result.returncode}).",
        )

    def test_exporter_jest(self):
        """Run Jest tests for the exporter modules."""
        self._run_jest(self.exporter_test_dir, "Exporter")

    def test_importer_jest(self):
        """Run Jest tests for the importer modules."""
        self._run_jest(self.importer_test_dir, "Importer")

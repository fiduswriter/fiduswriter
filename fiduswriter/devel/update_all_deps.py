#!/usr/bin/env python3
"""
Standalone script to update all Python and JavaScript dependencies.
This can be run directly without Django if needed.
"""
import os
import re
import json
import subprocess
from pathlib import Path
from typing import Dict, List, Tuple, Optional


def parse_requirements_txt(
    file_path: str,
) -> List[Tuple[str, Optional[str], str]]:
    """Parse a requirements.txt file."""
    packages = []

    if not os.path.exists(file_path):
        return packages

    with open(file_path, "r") as f:
        for line in f:
            line = line.strip()

            # Skip empty lines and comments
            if not line or line.startswith("#"):
                packages.append((None, None, line))
                continue

            # Handle extras notation like package[extra]==version
            match = re.match(
                r"^([a-zA-Z0-9_-]+(?:\[[a-zA-Z0-9_,]+\])?)\s*([=<>!~]+.*)?(?:\s*#.*)?$",
                line,
            )
            if match:
                package_name = match.group(1)
                version_spec = (
                    match.group(2).strip() if match.group(2) else None
                )
                packages.append((package_name, version_spec, line))
            else:
                # Line doesn't match expected format, keep as-is
                packages.append((None, None, line))

    return packages


def get_latest_pypi_version(package_name: str) -> Optional[str]:
    """Get the latest version of a package from PyPI."""
    # Remove extras notation for API call
    clean_name = re.sub(r"\[.*\]", "", package_name)

    try:
        import urllib.request

        url = f"https://pypi.org/pypi/{clean_name}/json"
        with urllib.request.urlopen(url, timeout=10) as response:
            data = json.loads(response.read().decode())
            return data["info"]["version"]
    except Exception as e:
        print(f"Warning: Could not fetch version for {clean_name}: {e}")
        return None


def update_requirements_txt(file_path: str) -> Dict[str, Tuple[str, str]]:
    """Update all packages in a requirements.txt file."""
    packages = parse_requirements_txt(file_path)
    updates = {}
    new_lines = []

    for package_name, version_spec, original_line in packages:
        if package_name is None:
            # Comment or empty line
            new_lines.append(original_line)
            continue

        # Skip packages without version constraints or with comment-only versions
        if not version_spec or version_spec.startswith("#"):
            new_lines.append(original_line)
            continue

        # Get current version
        current_match = re.search(
            r"([0-9]+\.[0-9]+(?:\.[0-9]+)?(?:\.[0-9]+)?)", version_spec
        )
        current_version = (
            current_match.group(1) if current_match else "unknown"
        )

        # Get latest version
        latest_version = get_latest_pypi_version(package_name)

        if latest_version and latest_version != current_version:
            updates[package_name] = (current_version, latest_version)
            # Update the line with new version
            new_line = f"{package_name}=={latest_version}"
            new_lines.append(new_line)
            print(f"  {package_name}: {current_version} -> {latest_version}")
        else:
            new_lines.append(original_line)

    if updates:
        with open(file_path, "w") as f:
            f.write("\n".join(new_lines) + "\n")

    return updates


def parse_package_json5(file_path: str) -> Dict:
    """Parse a package.json5 or package.json file."""
    if not os.path.exists(file_path):
        return {}

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # If it's a regular .json file, try parsing as JSON first
    if file_path.endswith(".json"):
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            # Fall through to JSON5 parsing
            pass

    # Remove comments (both // and /* */ style)
    # But preserve URLs like http:// and https://
    content = re.sub(r"(?<!:)//.*?$", "", content, flags=re.MULTILINE)
    content = re.sub(r"/\*.*?\*/", "", content, flags=re.DOTALL)

    # Convert unquoted keys to quoted keys
    content = re.sub(
        r"(\n\s*)([a-zA-Z_][a-zA-Z0-9_-]*)\s*:", r'\1"\2":', content
    )

    # Handle trailing commas
    content = re.sub(r",(\s*[}\]])", r"\1", content)

    try:
        return json.loads(content)
    except json.JSONDecodeError as e:
        print(f"Warning: Could not parse {file_path}: {e}")
        return {}


def write_package_json5(file_path: str, data: Dict):
    """Write data to a package.json5 or package.json file."""
    with open(file_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    new_lines = []
    dependencies_section = False

    for line in lines:
        # Check if we're in a dependencies section
        if re.search(r"dependencies\s*:", line):
            dependencies_section = True
            new_lines.append(line)
            continue

        # Check if we're leaving the dependencies section
        if dependencies_section and (
            line.strip().startswith("}") or re.search(r"^\s*[a-zA-Z_]", line)
        ):
            if not line.strip().startswith(
                '"'
            ) and not line.strip().startswith("'"):
                if re.search(r"[a-zA-Z_][a-zA-Z0-9_-]*\s*:", line):
                    dependencies_section = False

        if dependencies_section:
            # Try to update the version in this line
            match = re.match(
                r"(\s*)([\"\']?)([^:\"\']+)\2\s*:\s*([\"\']?)([^\"\',]+)\4(.*)$",
                line,
            )
            if match:
                indent, quote1, pkg_name, quote2, version, rest = (
                    match.groups()
                )

                # Check if this package is in our data
                if "dependencies" in data and pkg_name in data["dependencies"]:
                    new_version = data["dependencies"][pkg_name]
                    new_line = f'{indent}{quote1}{pkg_name}{quote1 or ""}: {quote2}{new_version}{quote2 or ""}{rest}\n'
                    new_lines.append(new_line)
                    continue

        new_lines.append(line)

    with open(file_path, "w", encoding="utf-8") as f:
        f.writelines(new_lines)


def get_latest_npm_version(package_name: str) -> Optional[str]:
    """Get the latest version of an npm package."""
    try:
        result = subprocess.run(
            ["npm", "view", package_name, "version"],
            capture_output=True,
            text=True,
            timeout=10,
        )

        if result.returncode == 0:
            return result.stdout.strip()
        else:
            print(f"Warning: Could not fetch version for {package_name}")
            return None
    except Exception as e:
        print(f"Warning: Could not fetch version for {package_name}: {e}")
        return None


def update_package_json5(file_path: str) -> Dict[str, Tuple[str, str]]:
    """Update all packages in a package.json5 or package.json file."""
    data = parse_package_json5(file_path)
    updates = {}

    if "dependencies" not in data:
        return updates

    for package_name, version in data["dependencies"].items():
        # Remove version prefixes like ^, ~, >=, etc.
        clean_version = re.sub(r"^[\^~>=<]+", "", str(version))

        # Get latest version
        latest_version = get_latest_npm_version(package_name)

        if latest_version and latest_version != clean_version:
            updates[package_name] = (clean_version, latest_version)

            # Preserve the version prefix if it exists
            prefix_match = re.match(r"^([\^~>=<]+)", str(version))
            prefix = prefix_match.group(1) if prefix_match else ""

            data["dependencies"][package_name] = f"{prefix}{latest_version}"
            print(f"  {package_name}: {version} -> {prefix}{latest_version}")

    if updates:
        write_package_json5(file_path, data)

    return updates


def main():
    """Main function to update all dependencies."""
    # Determine project root
    script_dir = Path(__file__).parent.parent

    print("=" * 60)
    print("Fidus Writer Dependency Updater")
    print("=" * 60)

    # Update Python dependencies
    print("\n=== Updating Python Dependencies ===\n")

    requirements_files = sorted(script_dir.glob("*requirements*.txt"))

    if not requirements_files:
        print("No requirements.txt files found")

    total_python_updates = 0
    for req_file in requirements_files:
        print(f"\nProcessing {req_file.name}:")
        updates = update_requirements_txt(str(req_file))
        total_python_updates += len(updates)

        if not updates:
            print("  No updates available")

    print(f"\nTotal Python packages updated: {total_python_updates}")

    # Update JavaScript dependencies
    print("\n=== Updating JavaScript Dependencies ===\n")

    package_json5_files = []
    for item in script_dir.iterdir():
        if item.is_dir():
            # Prefer package.json5 over package.json if both exist
            package_file_json5 = item / "package.json5"
            package_file_json = item / "package.json"
            if package_file_json5.exists():
                package_json5_files.append(package_file_json5)
            elif package_file_json.exists():
                package_json5_files.append(package_file_json)

    package_json5_files.sort()

    if not package_json5_files:
        print("No package.json5 or package.json files found")

    total_js_updates = 0
    for package_file in package_json5_files:
        app_name = package_file.parent.name
        package_filename = package_file.name
        print(f"\nProcessing {app_name}/{package_filename}:")
        updates = update_package_json5(str(package_file))
        total_js_updates += len(updates)

        if not updates:
            print("  No updates available")

    print(f"\nTotal JavaScript packages updated: {total_js_updates}")

    # Summary
    print("\n" + "=" * 60)
    print("Update Summary")
    print("=" * 60)
    print(f"Python packages updated: {total_python_updates}")
    print(f"JavaScript packages updated: {total_js_updates}")
    print(f"Total packages updated: {total_python_updates + total_js_updates}")

    if total_python_updates + total_js_updates > 0:
        print("\nNext steps:")
        print("  1. Review the changes")
        print("  2. Test your application")
        print("  3. Run: pip install -r requirements.txt")
        print("  4. Run: npm install (handled by django-npm-mjs)")
    else:
        print("\n✓ All dependencies are already up to date!")


if __name__ == "__main__":
    main()

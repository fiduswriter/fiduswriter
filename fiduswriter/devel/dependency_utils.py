"""
Utility functions for managing Python and JavaScript dependencies.
"""

import os
import re
import json
import subprocess
from pathlib import Path
from typing import Dict, List, Tuple, Optional

# Try to import the shared JSON5 parser from npm_mjs
try:
    from npm_mjs.json5_parser import parse_json5

    HAS_JSON5_PARSER = True
except ImportError:
    HAS_JSON5_PARSER = False


def parse_requirements_txt(
    file_path: str,
) -> List[Tuple[str, Optional[str], str]]:
    """
    Parse a requirements.txt file and return a list of (package_name, version_spec, original_line).

    Args:
        file_path: Path to requirements.txt file

    Returns:
        List of tuples containing (package_name, version_spec, original_line)
    """
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
    """
    Get the latest version of a package from PyPI.

    Args:
        package_name: Name of the package (may include extras like 'package[extra]')

    Returns:
        Latest version string or None if not found
    """
    # Remove extras notation for API call
    clean_name = re.sub(r"\[.*\]", "", package_name)

    try:
        import urllib.request
        import json

        url = f"https://pypi.org/pypi/{clean_name}/json"
        with urllib.request.urlopen(url, timeout=10) as response:
            data = json.loads(response.read().decode())
            return data["info"]["version"]
    except Exception as e:
        print(f"Warning: Could not fetch version for {clean_name}: {e}")
        return None


def update_requirements_txt(
    file_path: str, dry_run: bool = False
) -> Dict[str, Tuple[str, str]]:
    """
    Update all packages in a requirements.txt file to their latest versions.

    Args:
        file_path: Path to requirements.txt file
        dry_run: If True, don't actually update the file

    Returns:
        Dictionary mapping package names to (old_version, new_version) tuples
    """
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

    if not dry_run and updates:
        with open(file_path, "w") as f:
            f.write("\n".join(new_lines) + "\n")

    return updates


def parse_package_json5(file_path: str) -> Dict:
    """
    Parse a package.json5 or package.json file (JSON5 format with comments).

    Args:
        file_path: Path to package.json5 or package.json file

    Returns:
        Dictionary representation of the package.json5 content
    """
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

    # Use shared JSON5 parser if available
    if HAS_JSON5_PARSER:
        try:
            return parse_json5(content)
        except Exception as e:
            print(
                f"Warning: Could not parse {file_path} with shared parser: {e}"
            )
            # Fall through to fallback parser

    # Fallback: regex-based JSON5 parsing
    # Remove comments (both // and /* */ style)
    content = re.sub(r"(?<!:)//.*?$", "", content, flags=re.MULTILINE)
    content = re.sub(r"/\*.*?\*/", "", content, flags=re.DOTALL)

    # Convert unquoted keys to quoted keys for JSON compatibility
    # Match: word followed by colon (but not already quoted)
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


def write_package_json5(file_path: str, data: Dict, original_content: str):
    """
    Write data to a package.json5 or package.json file, preserving the original format as much as possible.

    Args:
        file_path: Path to package.json5 or package.json file
        data: Dictionary to write
        original_content: Original file content for format reference
    """
    # Read the original file to preserve formatting
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
    """
    Get the latest version of an npm package.

    Args:
        package_name: Name of the npm package

    Returns:
        Latest version string or None if not found
    """
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


def update_package_json5(
    file_path: str, dry_run: bool = False
) -> Dict[str, Tuple[str, str]]:
    """
    Update all packages in a package.json5 or package.json file to their latest versions.

    Args:
        file_path: Path to package.json5 or package.json file
        dry_run: If True, don't actually update the file

    Returns:
        Dictionary mapping package names to (old_version, new_version) tuples
    """
    with open(file_path, "r", encoding="utf-8") as f:
        original_content = f.read()

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

    if not dry_run and updates:
        write_package_json5(file_path, data, original_content)

    return updates


def find_package_json_files(root_path: str) -> List[str]:
    """
    Find all package.json5 and package.json files in Django app directories.

    Args:
        root_path: Root path to search from

    Returns:
        List of paths to package.json5/package.json files
    """
    package_files = []

    root = Path(root_path)

    # Look for package.json5 or package.json files in immediate subdirectories (Django apps)
    for item in root.iterdir():
        if item.is_dir():
            # Prefer package.json5 over package.json if both exist
            package_file_json5 = item / "package.json5"
            package_file_json = item / "package.json"
            if package_file_json5.exists():
                package_files.append(str(package_file_json5))
            elif package_file_json.exists():
                package_files.append(str(package_file_json))

    return sorted(package_files)


# Keep old name for backwards compatibility
find_package_json5_files = find_package_json_files


def find_requirements_files(root_path: str) -> List[str]:
    """
    Find all requirements*.txt files in the project.

    Args:
        root_path: Root path to search from

    Returns:
        List of paths to requirements files
    """
    requirements_files = []

    root = Path(root_path)

    # Look for requirements files in the root directory
    for item in root.glob("*requirements*.txt"):
        if item.is_file():
            requirements_files.append(str(item))

    return sorted(requirements_files)

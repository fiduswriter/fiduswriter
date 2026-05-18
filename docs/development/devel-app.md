# Devel App - Development Tools for Fidus Writer

This Django app provides development tools for managing dependencies in the Fidus Writer project.

## Features

### 1. Dependency Management

The `devel` app automatically manages both Python and JavaScript dependencies:

- **Python dependencies**: Updates `requirements.txt` and related files (e.g., `dev-requirements.txt`, `test-requirements.txt`)
- **JavaScript dependencies**: Updates `package.json5` and `package.json` files across all Django apps

## Management Commands

### check_dependencies

Check for outdated dependencies without making any changes.

```bash
python manage.py check_dependencies
```

**Options:**
- `--python-only`: Only check Python dependencies
- `--js-only`: Only check JavaScript dependencies

**Example output:**
```
=== Python Dependencies ===

requirements.txt:
  ⬆ Django: 5.1.15 → 5.1.16
  ⬆ Pillow: 11.3.0 → 11.4.0
  ✓ All other packages up to date

=== JavaScript Dependencies ===

base/package.json5:
  ⬆ mathlive: 0.104.0 → 0.105.0
  ✓ All other packages up to date

document/package.json:
  ⬆ prosemirror-view: 1.38.1 → 1.39.0
```

### update_dependencies

Update all dependencies to their latest versions.

```bash
python manage.py update_dependencies
```

**Options:**
- `--dry-run`: Preview changes without modifying files
- `--python-only`: Only update Python dependencies
- `--js-only`: Only update JavaScript dependencies

**Examples:**

Preview all updates:
```bash
python manage.py update_dependencies --dry-run
```

Update only Python dependencies:
```bash
python manage.py update_dependencies --python-only
```

Update only JavaScript dependencies:
```bash
python manage.py update_dependencies --js-only
```

**Workflow after updating:**

1. Review the changes made to dependency files
2. Test your application thoroughly
3. Update installed packages:
   ```bash
   # For Python packages
   pip install -r requirements.txt
   
   # For JavaScript packages (handled by django-npm-mjs)
   npm install
   ```

## Installation

Add `devel` to your `INSTALLED_APPS` in `configuration.py`:

```python
INSTALLED_APPS = [
    'devel',
    # ... other apps
]
```

## How It Works

### Python Dependencies

The app:
1. Parses `requirements.txt` files using regex to handle various formats
2. Queries PyPI API for the latest version of each package
3. Updates version specifications while preserving extras (e.g., `Django[extra]`)
4. Maintains file formatting and comments

### JavaScript Dependencies

The app:
1. Finds all `package.json5` and `package.json` files in Django app directories
2. Parses JSON5 format (which allows comments and unquoted keys) using a PyPy-compatible regex-based parser
3. Queries npm registry for the latest version of each package
4. Updates versions while preserving version prefixes (^, ~, etc.)
5. Maintains the original file formatting

### Supported Files

**Python:**
- `requirements.txt`
- `dev-requirements.txt`
- `test-requirements.txt`
- `mysql-requirements.txt`
- `postgresql-requirements.txt`
- Any file matching `*requirements*.txt`

**JavaScript:**
- `package.json5` or `package.json` files in Django app directories (e.g., `base/package.json5`, `document/package.json`)
- If both exist in the same directory, `package.json5` takes precedence

## Automation

You can automate dependency checks by adding a cron job or CI/CD pipeline:

```bash
# Check for updates daily
0 0 * * * cd /path/to/fiduswriter && python manage.py check_dependencies
```

Or in GitHub Actions:

```yaml
name: Dependency Check
on:
  schedule:
    - cron: '0 0 * * 1'  # Weekly on Monday
  workflow_dispatch:

jobs:
  check-deps:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.x'
      - name: Install dependencies
        run: pip install -r requirements.txt
      - name: Check for outdated dependencies
        run: python manage.py check_dependencies
```

## Notes

- The app preserves version specifiers like `^`, `~`, `>=` in JavaScript dependencies
- Python packages with extras notation (e.g., `Twisted[tls,http2]`) are supported
- Comments in both requirements.txt and package.json5/package.json files are preserved
- The app uses PyPI and npm registries to fetch version information
- Network connectivity is required to check for updates
- **PyPy Compatible**: Uses a regex-based JSON5 parser that works with PyPy (no external dependencies)
- Supports both `package.json` (standard JSON) and `package.json5` (JSON with comments)

## Requirements

- Django
- Python 3.6+ (including PyPy)
- npm (for JavaScript dependency updates)
- Internet connection (to query package registries)
- No external Python packages required (uses only standard library)

## License

This app is part of Fidus Writer and follows the same AGPL license.

---

**Last Updated:** December 8, 2025
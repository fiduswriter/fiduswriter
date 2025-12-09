# Devel App - Complete Setup Guide

This guide walks you through setting up and using the `devel` app for automated dependency management in Fidus Writer.

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Quick Start](#quick-start)
4. [Management Commands](#management-commands)
5. [Automation Setup](#automation-setup)
6. [Configuration](#configuration)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The `devel` app provides automated dependency management for Fidus Writer, covering:

- **Python dependencies**: All `*requirements*.txt` files
- **JavaScript dependencies**: All `package.json5` files across Django apps

### Key Features

- ✅ Automatic version detection from PyPI and npm registries
- ✅ Preserves file formatting and comments
- ✅ Supports dry-run mode for safe previews
- ✅ Selective updates (Python-only or JavaScript-only)
- ✅ Cron and GitHub Actions integration
- ✅ Email and Slack notifications

---

## Installation

### Step 1: Add to INSTALLED_APPS

Edit your `configuration.py` file:

```python
INSTALLED_APPS = [
    'devel',  # Add this line
    # ... other apps
]
```

### Step 2: Verify Installation

Run the following command to verify the app is properly installed:

```bash
cd fiduswriter
python manage.py check_dependencies
```

If you see dependency check output, the installation was successful!

---

## Quick Start

### Check for Outdated Dependencies

```bash
python manage.py check_dependencies
```

**Sample output:**
```
=== Python Dependencies ===

requirements.txt:
  ⬆ Django: 5.1.5 → 5.1.6
  ⬆ Pillow: 12.0.0 → 12.0.1
  ✓ All other packages up to date

=== JavaScript Dependencies ===

base/package.json5:
  ⬆ mathlive: 0.108.2 → 0.109.0
  ✓ All other packages up to date

==================================================
2 package(s) can be updated
```

### Preview Updates (Dry Run)

```bash
python manage.py update_dependencies --dry-run
```

This shows what would be updated without making any changes.

### Update All Dependencies

```bash
python manage.py update_dependencies
```

### Install Updated Packages

After updating dependency files, install the new versions:

```bash
# For Python packages
pip install -r requirements.txt

# For JavaScript packages (handled by django-npm-mjs)
python manage.py transpile
```

---

## Management Commands

### `check_dependencies`

Check for outdated dependencies without making changes.

**Usage:**
```bash
python manage.py check_dependencies [options]
```

**Options:**
- `--python-only`: Only check Python dependencies
- `--js-only`: Only check JavaScript dependencies

**Examples:**
```bash
# Check all dependencies
python manage.py check_dependencies

# Check only Python
python manage.py check_dependencies --python-only

# Check only JavaScript
python manage.py check_dependencies --js-only
```

---

### `update_dependencies`

Update dependencies to their latest versions.

**Usage:**
```bash
python manage.py update_dependencies [options]
```

**Options:**
- `--dry-run`: Preview changes without modifying files
- `--python-only`: Only update Python dependencies
- `--js-only`: Only update JavaScript dependencies

**Examples:**
```bash
# Preview all updates
python manage.py update_dependencies --dry-run

# Update all dependencies
python manage.py update_dependencies

# Update only Python packages
python manage.py update_dependencies --python-only

# Update only JavaScript packages
python manage.py update_dependencies --js-only
```

---

## Automation Setup

### Option 1: Cron Job (Linux/Mac)

The `check_deps.sh` script provides automated checking with optional notifications.

#### Basic Setup

```bash
# Make script executable (if not already)
chmod +x devel/check_deps.sh

# Test the script
./devel/check_deps.sh
```

#### Weekly Checks (Every Monday at 9 AM)

```bash
crontab -e
```

Add this line:
```
0 9 * * 1 cd /path/to/fiduswriter && ./devel/check_deps.sh
```

#### With Email Notifications

```bash
0 9 * * 1 cd /path/to/fiduswriter && ./devel/check_deps.sh --email admin@example.com
```

#### With Automatic Updates (Use with caution!)

```bash
0 9 * * 1 cd /path/to/fiduswriter && ./devel/check_deps.sh --update --email admin@example.com
```

#### With Slack Notifications

```bash
0 9 * * 1 cd /path/to/fiduswriter && ./devel/check_deps.sh --slack https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

---

### Option 2: GitHub Actions

A GitHub Actions workflow is provided in `.github/workflows/check-dependencies.yml`.

#### Setup

1. The workflow file is already in your repository
2. It runs automatically every Monday at 9:00 AM UTC
3. You can also trigger it manually from the Actions tab

#### Manual Trigger

1. Go to your repository on GitHub
2. Click on "Actions" tab
3. Select "Check Dependencies" workflow
4. Click "Run workflow"
5. Optionally enable "Update dependencies automatically" to create a PR with updates

#### Configuration

Edit `.github/workflows/check-dependencies.yml` to customize:

- **Schedule**: Change the cron expression
  ```yaml
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9 AM UTC
  ```

- **Python version**: Change in `setup-python` step
  ```yaml
  python-version: '3.11'
  ```

- **Node.js version**: Change in `setup-node` step
  ```yaml
  node-version: '20'
  ```

#### Enable Slack Notifications

Uncomment the Slack notification section and add your webhook URL as a GitHub secret:

1. Go to Repository Settings → Secrets and variables → Actions
2. Add a new secret: `SLACK_WEBHOOK_URL`
3. Uncomment the Slack notification step in the workflow file

---

### Option 3: Standalone Script

For environments without Django, use the standalone script:

```bash
cd fiduswriter
python3 devel/update_all_deps.py
```

This script doesn't require Django to be installed and can be used in CI/CD pipelines.

---

## Configuration

### Supported Files

#### Python Requirements Files

The following files are automatically detected and processed:

- `requirements.txt` - Main dependencies
- `dev-requirements.txt` - Development dependencies
- `test-requirements.txt` - Testing dependencies
- `mysql-requirements.txt` - MySQL-specific dependencies
- `postgresql-requirements.txt` - PostgreSQL-specific dependencies
- Any file matching `*requirements*.txt`

#### JavaScript Package Files

All `package.json5` files in Django app directories:

- `base/package.json5`
- `document/package.json5`
- `bibliography/package.json5`
- `npm_mjs/package.json5`
- And all other Django apps with package.json5 files

### Version Specifiers

The app preserves version specifiers:

**Python:**
- `==` - Exact version (updated to new exact version)
- `>=`, `<=`, `>`, `<` - Preserved as-is
- Extras: `Django[extra]==5.1.5` → `Django[extra]==5.1.6`

**JavaScript:**
- `^` - Compatible with version (preserved)
- `~` - Approximately equivalent (preserved)
- Exact: `1.0.0` → `1.0.1`
- Prefixed: `^1.0.0` → `^1.0.1`

---

## Best Practices

### 1. Regular Checks

Run dependency checks regularly:

- **Development**: Weekly or bi-weekly
- **Production**: Monthly or after security advisories

### 2. Review Before Updating

Always review changes before updating:

```bash
# Preview first
python manage.py update_dependencies --dry-run

# Review output, then update
python manage.py update_dependencies
```

### 3. Test After Updates

After updating dependencies:

1. Review the changes in version control
2. Install updated packages
3. Run your test suite
4. Test critical functionality manually
5. Check for deprecation warnings

### 4. Incremental Updates

For large projects, update in stages:

```bash
# Update Python first
python manage.py update_dependencies --python-only

# Test thoroughly

# Then update JavaScript
python manage.py update_dependencies --js-only
```

### 5. Version Control

Always commit dependency updates separately:

```bash
git add requirements.txt *requirements*.txt */package.json5
git commit -m "chore: update dependencies"
```

### 6. Read Changelogs

Before updating, check changelogs for major version changes:

- Django: https://docs.djangoproject.com/en/stable/releases/
- Major npm packages: Check their GitHub releases

### 7. Pin Critical Versions

For packages with breaking changes, consider pinning:

```txt
# requirements.txt
Django==5.1.5  # Pin to 5.x until 6.x is stable
```

### 8. Monitor Security

Combine with security scanning:

```bash
# Python
pip install safety
safety check

# JavaScript
npm audit
```

---

## Troubleshooting

### Issue: Command not found

**Problem:** `python manage.py check_dependencies` fails with "Unknown command"

**Solution:**
1. Verify `devel` is in `INSTALLED_APPS`
2. Restart Django development server
3. Check for typos in app name

---

### Issue: Network timeout

**Problem:** "Could not fetch version for package X"

**Solutions:**
1. Check internet connectivity
2. Verify firewall settings allow PyPI/npm access
3. Try again later (registries may be temporarily down)
4. Increase timeout in `dependency_utils.py` if needed

---

### Issue: JSON5 parse error

**Problem:** "Could not parse package.json5"

**Solutions:**
1. Check JSON5 syntax (trailing commas, comments are allowed)
2. Ensure quotes are balanced
3. Verify no special characters in file
4. Try parsing with an online JSON5 validator

---

### Issue: Wrong version detected

**Problem:** Latest version seems incorrect or includes pre-release

**Solutions:**
1. Check PyPI/npm directly to verify
2. The tool fetches the latest stable release
3. For Python, check if package is on PyPI
4. For JavaScript, use `npm view package versions` to see all versions

---

### Issue: Permissions error

**Problem:** "Permission denied" when updating files

**Solutions:**
1. Check file permissions: `chmod 644 requirements.txt`
2. Ensure you own the files: `chown user:group requirements.txt`
3. Run with appropriate user permissions

---

### Issue: Git conflicts

**Problem:** Merge conflicts in dependency files

**Solutions:**
1. Accept incoming changes if updating to latest
2. Manually resolve conflicts
3. Run `update_dependencies` again after resolving
4. Verify all changes with `--dry-run` first

---

### Issue: Cron job not running

**Problem:** Scheduled checks don't execute

**Solutions:**
1. Verify cron is running: `systemctl status cron`
2. Check cron logs: `grep CRON /var/log/syslog`
3. Ensure absolute paths in crontab
4. Check script permissions: `chmod +x check_deps.sh`
5. Test script manually first

---

### Issue: Email notifications not working

**Problem:** Emails not being sent from `check_deps.sh`

**Solutions:**
1. Install mailutils: `sudo apt-get install mailutils`
2. Configure mail server (postfix, sendmail, etc.)
3. Test mail command: `echo "test" | mail -s "test" your@email.com`
4. Check spam folder

---

### Issue: GitHub Actions failing

**Problem:** Workflow fails to run

**Solutions:**
1. Check workflow syntax with GitHub's validator
2. Verify secrets are set correctly
3. Check job logs for specific errors
4. Ensure Python/Node versions are compatible
5. Verify repository permissions

---

## Additional Resources

- **Django Documentation**: https://docs.djangoproject.com/
- **django-npm-mjs**: https://github.com/fiduswriter/django-npm-mjs
- **PyPI**: https://pypi.org/
- **npm Registry**: https://www.npmjs.com/

---

## Getting Help

If you encounter issues not covered here:

1. Check the [README.md](README.md) for more details
2. Review the [CHANGELOG.md](CHANGELOG.md) for recent changes
3. Open an issue on the Fidus Writer repository
4. Check existing issues for similar problems

---

## Contributing

Contributions to improve the `devel` app are welcome!

Areas for improvement:
- Security vulnerability scanning
- Dependency conflict detection
- Web-based dashboard
- Support for additional package managers
- Smarter version update strategies

---

**Last Updated:** December 8, 2025
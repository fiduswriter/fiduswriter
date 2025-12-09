# Developer Installation Guide

This guide will help you set up a development environment for Fidus Writer. Follow these steps if you want to contribute code, develop plugins, or customize Fidus Writer.

## Prerequisites

### Required Software

- **Python 3.12+** (3.13 or 3.14 recommended)
- **Node.js 24+** and npm
- **Git**
- **Database** (PostgreSQL recommended for development matching production)

### System Dependencies

#### Ubuntu/Debian

```bash
sudo apt-get update
sudo apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    nodejs \
    npm \
    git \
    build-essential \
    libjpeg-dev \
    zlib1g-dev \
    gettext \
    postgresql \
    postgresql-contrib \
    libpq-dev
```

#### macOS

```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install dependencies
brew install python@3.11 node postgresql git
```

#### Windows (WSL2 recommended)

We recommend using WSL2 (Windows Subsystem for Linux) for development on Windows:

1. Install WSL2 and Ubuntu
2. Follow the Ubuntu/Debian instructions above

## Installation Steps

### 1. Fork and Clone Repository

```bash
# Fork the repository on GitHub first, then:
git clone https://github.com/YOUR-USERNAME/fiduswriter.git
cd fiduswriter

# Add upstream remote
git remote add upstream https://github.com/fiduswriter/fiduswriter.git
```

### 2. Set Up Python Virtual Environment

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# Linux/macOS:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Upgrade pip
pip install --upgrade pip
```

### 3. Install Python Dependencies

```bash
cd fiduswriter

# Install production dependencies
pip install -r requirements.txt

# Install development dependencies
pip install -r dev-requirements.txt

# Install test dependencies
pip install -r test-requirements.txt
```

### 4. Configure Database

#### Using PostgreSQL (Recommended)

```bash
# Create database and user
sudo -u postgres psql
```

In PostgreSQL shell:

```sql
CREATE DATABASE fiduswriter;
CREATE USER fiduswriter WITH PASSWORD 'fiduswriter';
ALTER ROLE fiduswriter SET client_encoding TO 'utf8';
ALTER ROLE fiduswriter SET default_transaction_isolation TO 'read committed';
ALTER ROLE fiduswriter SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE fiduswriter TO fiduswriter;
\q
```

#### Using SQLite (Quick Start)

SQLite is configured by default for development. No additional setup needed.

### 5. Create Configuration File

```bash
cp configuration.py-default configuration.py
```

Edit `configuration.py`:

```python
# For PostgreSQL:
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'fiduswriter',
        'USER': 'fiduswriter',
        'PASSWORD': 'fiduswriter',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}

# Development settings
DEBUG = True
ALLOWED_HOSTS = ['localhost', '127.0.0.1', '[::1]']

# Email backend for development (prints to console)
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Optional: Disable CSRF for easier testing
# CSRF_COOKIE_SECURE = False
# SESSION_COOKIE_SECURE = False
```

### 6. Set Up Database

```bash
# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Load initial data (optional)
python manage.py loaddata initial_data
```

### 7. Install and Build Frontend Assets

```bash
# Install JavaScript dependencies and transpile
python manage.py transpile

# Collect static files
python manage.py collectstatic --noinput
```

### 8. Run Development Server

```bash
python manage.py runserver
```

Access Fidus Writer at `http://localhost:8000`

## Development Tools

### Install Pre-commit Hooks

```bash
pip install pre-commit
pre-commit install
```

This will automatically run code formatters and linters before each commit.

### Code Formatters and Linters

```bash
# Python: Black, isort, flake8 (configured in pre-commit)
# JavaScript: Biome (configured in biome.json)

# Run manually:
pre-commit run --all-files
```

### IDE Setup

#### VS Code (Recommended)

Install recommended extensions:

```json
{
    "recommendations": [
        "ms-python.python",
        "ms-python.vscode-pylance",
        "biomejs.biome",
        "editorconfig.editorconfig"
    ]
}
```

Settings are pre-configured in `.vscode/settings.json`.

#### PyCharm

1. Open project in PyCharm
2. Configure Python interpreter to use `venv`
3. Mark `fiduswriter` directory as "Sources Root"
4. Enable Django support in settings

## Testing

### Run All Tests

```bash
python manage.py test
```

### Run Specific Tests

```bash
# Test a specific app
python manage.py test document

# Test a specific test case
python manage.py test document.tests.test_editor

# Test a specific method
python manage.py test document.tests.test_editor.EditorTest.test_create_document
```

### Browser Tests

Browser tests use Selenium and require ChromeDriver:

```bash
# Install ChromeDriver (Ubuntu/Debian)
sudo apt-get install chromium-chromedriver

# Or download from https://chromedriver.chromium.org/

# Run browser tests
python manage.py test browser_check base
```

### Coverage Report

```bash
# Install coverage
pip install coverage

# Run tests with coverage
coverage run --source='.' manage.py test

# Generate report
coverage report

# Generate HTML report
coverage html
# Open htmlcov/index.html in browser
```

### Test with Different Databases

```bash
# PostgreSQL
export DATABASE_ENGINE=postgresql
python manage.py test

# MySQL
export DATABASE_ENGINE=mysql
python manage.py test
```

## Plugin Development

### Create a New Plugin

```bash
python manage.py startapp my_plugin
```

See [Plugin Development Guide](../development/plugin-development.md) for details.

### Install Plugin

1. Add to `INSTALLED_APPS` in `configuration.py`
2. Run migrations: `python manage.py migrate`
3. Restart development server

## Common Development Tasks

### Update Dependencies

```bash
# Check for outdated packages
python manage.py check_dependencies

# Update all dependencies (with devel app)
python manage.py update_dependencies

# Install updated packages
pip install -r requirements.txt
python manage.py transpile
```

### Database Operations

```bash
# Create migrations for your changes
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Reset database (WARNING: deletes all data)
python manage.py flush
python manage.py migrate
python manage.py createsuperuser
```

### Translations

```bash
# Extract translatable strings
python manage.py makemessages -l de

# Compile translations
python manage.py compilemessages
```

### Clear Cache

```bash
python manage.py clear_cache
```

### Django Shell

```bash
# Open Django shell
python manage.py shell

# Or use shell_plus (if installed)
python manage.py shell_plus
```

## Debugging

### Enable Debug Toolbar

Install Django Debug Toolbar:

```bash
pip install django-debug-toolbar
```

Add to `configuration.py`:

```python
INSTALLED_APPS += ['debug_toolbar']
MIDDLEWARE += ['debug_toolbar.middleware.DebugToolbarMiddleware']
INTERNAL_IPS = ['127.0.0.1']
```

### Enable Verbose Logging

In `configuration.py`:

```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'DEBUG',
    },
}
```

### Browser DevTools

For frontend debugging:

1. Open browser DevTools (F12)
2. Check Console for JavaScript errors
3. Use Network tab to inspect requests
4. Use Sources tab for debugging JavaScript

## Git Workflow

### Keep Your Fork Updated

```bash
# Fetch latest changes
git fetch upstream

# Update main branch
git checkout main
git merge upstream/main
git push origin main

# Update develop branch
git checkout develop
git merge upstream/develop
git push origin develop
```

### Create Feature Branch

```bash
git checkout -b feature/my-feature develop
```

### Commit Changes

```bash
# Stage changes
git add .

# Commit with meaningful message
git commit -m "feat: add new feature"

# Push to your fork
git push origin feature/my-feature
```

### Create Pull Request

1. Go to your fork on GitHub
2. Click "New Pull Request"
3. Select your feature branch
4. Fill out PR template
5. Submit for review

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 8000
lsof -i :8000

# Kill process
kill -9 <PID>

# Or run on different port
python manage.py runserver 8080
```

### Database Connection Errors

- Verify PostgreSQL is running: `sudo systemctl status postgresql`
- Check credentials in `configuration.py`
- Test connection: `psql -U fiduswriter -h localhost -d fiduswriter`

### Import Errors

```bash
# Ensure you're in the correct directory
cd fiduswriter

# Verify virtual environment is activated
which python
# Should show path to venv

# Reinstall dependencies
pip install -r requirements.txt
```

### Frontend Build Errors

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules
find . -name "node_modules" -type d -exec rm -rf {} +

# Rebuild
python manage.py transpile
```

### Permission Errors

```bash
# Fix media directory permissions
chmod -R 755 media/

# Fix database permissions (PostgreSQL)
sudo -u postgres psql
GRANT ALL PRIVILEGES ON DATABASE fiduswriter TO fiduswriter;
```

## Performance Tips

### Speed Up Tests

```bash
# Run tests in parallel
python manage.py test --parallel

# Keep test database
python manage.py test --keepdb

# Run only modified tests
pytest --testmon
```

### Optimize Database

```bash
# Create indexes (in production)
python manage.py migrate --fake-initial

# Analyze queries
python manage.py debugsqlshell
```

## Next Steps

- Read [Software Architecture](../development/software-structure.md)
- Check [Contributing Guidelines](../contributing.md)
- Explore [Plugin Development](../development/plugin-development.md)
- Join the community discussions

## Resources

- [Django Documentation](https://docs.djangoproject.com/)
- [Python Style Guide (PEP 8)](https://www.python.org/dev/peps/pep-0008/)
- [Git Documentation](https://git-scm.com/doc)
- [Fidus Writer GitHub](https://github.com/fiduswriter/fiduswriter)

---

**Last Updated:** December 8, 2025

**Questions?** Open an issue or discussion on GitHub!

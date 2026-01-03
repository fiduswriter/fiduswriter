# Debian Package Building Guide

This guide explains how to build and install Fidus Writer as a Debian/Ubuntu package with all Python dependencies bundled.

## Overview

This package bundles a recent **Python**, **Node.js** (via nodejs-wheel), **database adapters** (PostgreSQL and MySQL), all dependencies (Django, Channels, Daphne, and 30+ packages), and **all optional modules** into a single self-contained installation at `/opt/fiduswriter/`. This means:

- ✅ **Python included** - No system Python 3.11+ required
- ✅ **Node.js included** - Bundled via nodejs-wheel for JavaScript transpilation
- ✅ **Database adapters included** - PostgreSQL and MySQL adapters bundled
- ✅ No internet required during installation
- ✅ All dependencies and optional modules bundled
- ✅ Works on recent Ubuntu, Debian (even with older Python)
- ✅ Isolated from system Python (no conflicts)
- ✅ Fast and modern Python with optimizations enabled
- ✅ All modules included: books, ojs, pandoc, languagetool, etc.
- 📦 Package size (~250-300 MB)

## Quick Start

### Building Packages

```bash
# Install build dependencies
sudo apt-get install build-essential devscripts equivs wget
sudo mk-build-deps -i -r -t "apt-get -y --no-install-recommends" debian/control

# Build all packages
./build-deb.sh

# Packages created in: debian-build/
```

### Installing

```bash
# Install package (includes all modules)
sudo dpkg -i debian-build/fiduswriter_*.deb
sudo apt-get install -f
```

### Initial Setup

```bash
# 1. Configure database
sudo nano /etc/fiduswriter/configuration.py

# 2. Run migrations
sudo -u fiduswriter fiduswriter migrate

# 3. Create admin user
sudo -u fiduswriter fiduswriter createsuperuser

# 4. Transpile JavaScript (requires bundled Node.js via nodejs-wheel)
sudo -u fiduswriter fiduswriter transpile

# 5. Collect static files (must run after transpile)
sudo -u fiduswriter fiduswriter collectstatic --noinput

# 6. Start service
sudo systemctl enable fiduswriter
sudo systemctl start fiduswriter
```

## Architecture

### File Locations

| Component | Location |
|-----------|----------|
| Bundled Python 3.14 | `/opt/fiduswriter/python3.14/` |
| Python packages | `/opt/fiduswriter/python3.14/lib/python3.14/site-packages/` |
| Bundled binaries | `/opt/fiduswriter/python3.14/bin/` |
| Configuration | `/etc/fiduswriter/configuration.py` |
| Data directory | `/var/lib/fiduswriter/` |
| Media files | `/var/lib/fiduswriter/media/` |
| Logs | `/var/log/fiduswriter/` |
| Service | `/lib/systemd/system/fiduswriter.service` |

### How It Works

**Build Process:**
1. Downloads and compiles Python 3.14.2 from source
2. Installs all packages from `fiduswriter/requirements.txt` into bundled Python
3. Installs Node.js via `nodejs-wheel` Python package for JavaScript transpilation
4. Installs database adapters (psycopg2-binary for PostgreSQL, mysqlclient for MySQL)
5. Bundles Python with all packages into .deb package
6. Output: `debian-build/fiduswriter_*.deb` (~250-300 MB)

**Installation:**
1. Extracts Python 3.14 to `/opt/fiduswriter/python3.14/`
2. Creates wrapper script at `/usr/bin/fiduswriter`
3. Sets up systemd service
4. No internet connection needed
5. Works even if system has only Python 3.8 or 3.9

**Runtime:**
- Service uses bundled Python 3.14.2
- Service uses `/opt/fiduswriter/python3.14/bin/daphne`
- Commands use `/opt/fiduswriter/python3.14/bin/python3.14`
- All dependencies installed directly in bundled Python
- Node.js binaries provided by nodejs-wheel for transpilation
- Database adapters (PostgreSQL/MySQL) bundled - no separate installation needed

## Building from Source

### Prerequisites

```bash
# Essential build tools
sudo apt-get install build-essential debhelper dh-python wget

# Python 3.14 build dependencies
sudo apt-get install libssl-dev libffi-dev libbz2-dev libreadline-dev \
    libsqlite3-dev libncurses5-dev libncursesw5-dev xz-utils tk-dev liblzma-dev

# Additional libraries for Python packages
sudo apt-get install libjpeg-dev zlib1g-dev libmagic1

# Python tools (for message compilation)
sudo apt-get install python3-pip python3-setuptools python3-wheel python3-babel

# Frontend tools
sudo apt-get install nodejs npm

# Package tools
sudo apt-get install devscripts equivs
```

### Build Commands

```bash
# Automated build (recommended)
./build-deb.sh

# Manual build
dpkg-buildpackage -b -us -uc

# Clean build
debian/rules clean
dpkg-buildpackage -b -us -uc
```

**Note:** Python 3.14.2 is compiled from source during the first build (~10-15 minutes). 
The compiled Python is cached in `.python-build-cache/` so subsequent builds are much 
faster (~2-3 minutes). The cache is automatically reused unless you delete it or change 
the Python version.

### Build Output

```
debian-build/
└── fiduswriter_4.0.X-1_all.deb                    (~250-300 MB)
```

## Configuration

### Database Setup

### PostgreSQL (Recommended)

```bash
# Create database
sudo -u postgres createdb fiduswriter
sudo -u postgres createuser fiduswriter
sudo -u postgres psql -c "ALTER USER fiduswriter WITH PASSWORD 'your_password';"

# Note: PostgreSQL adapter (psycopg2-binary) is already bundled!
# No need to install python3-psycopg2

# Configure
sudo nano /etc/fiduswriter/configuration.py
```

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'fiduswriter',
        'USER': 'fiduswriter',
        'PASSWORD': 'your_password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}

ALLOWED_HOSTS = ['your-domain.com']
CSRF_TRUSTED_ORIGINS = ['https://your-domain.com']
```

#### MySQL

```bash
# Note: MySQL adapter (mysqlclient) is already bundled!
# No need to install python3-mysqlclient

# Configure
sudo nano /etc/fiduswriter/configuration.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'fiduswriter',
        'USER': 'fiduswriter',
        'PASSWORD': 'your_password',
        'HOST': 'localhost',
        'PORT': '3306',
        'OPTIONS': {'charset': 'utf8mb4'},
    }
}
```

### Production Deployment

#### Nginx Reverse Proxy

```bash
# Install nginx
sudo apt-get install nginx

# Copy example config
sudo cp /usr/share/doc/fiduswriter/nginx-example.conf /etc/nginx/sites-available/fiduswriter

# Edit server_name
sudo nano /etc/nginx/sites-available/fiduswriter

# Enable
sudo ln -s /etc/nginx/sites-available/fiduswriter /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### HTTPS with Let's Encrypt

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Update configuration
sudo nano /etc/fiduswriter/configuration.py
# Add: ACCOUNT_DEFAULT_HTTP_PROTOCOL = 'https'

# Restart
sudo systemctl restart fiduswriter
```

## Enabling Modules

All modules are already installed. To enable them, edit the configuration:

```bash
# Edit configuration
sudo nano /etc/fiduswriter/configuration.py
```

Add modules to INSTALLED_APPS:

```python
INSTALLED_APPS = [
    'book',              # Book document type support
    'citation_api_import',  # Import citations from external APIs
    'languagetool',      # Grammar and spell checking
    'ojs',               # Open Journal Systems integration
    'pandoc',            # Additional export formats
    'phplist',           # PHPList newsletter integration
    'gitrepo_export',    # Export to Git repositories
    'payment',           # Paddle payment processing (payment-paddle module)
    'website',           # Static website generation
]
```

```bash
# Restart service to apply changes
sudo systemctl restart fiduswriter
```

## Management Commands

```bash
# All commands run as fiduswriter user (uses bundled Python 3.14)
sudo -u fiduswriter fiduswriter <command>

# Examples
fiduswriter migrate              # Run migrations
fiduswriter createsuperuser      # Create admin
fiduswriter transpile            # Transpile JavaScript (run before collectstatic)
fiduswriter collectstatic        # Collect static files (run after transpile)
fiduswriter shell                # Django shell
fiduswriter check                # System check

# Or use bundled Python directly
sudo -u fiduswriter /opt/fiduswriter/python3.14/bin/python3.14 -m fiduswriter.manage <command>
```

## Service Management

```bash
sudo systemctl start fiduswriter
sudo systemctl stop fiduswriter
sudo systemctl restart fiduswriter
sudo systemctl status fiduswriter
sudo journalctl -u fiduswriter -f
```

## Updating

### Update Package Version

```bash
# Update upstream version
echo "4.0.18" > fiduswriter/version.txt

# Update changelog
dch -v 4.0.18-1 "New upstream release"

# Rebuild
./build-deb.sh
```

### Upgrade Installation

```bash
# Stop service
sudo systemctl stop fiduswriter

# Backup
sudo -u postgres pg_dump fiduswriter > backup.sql
sudo tar -czf media-backup.tar.gz /var/lib/fiduswriter/media/

# Install new version
sudo dpkg -i debian-build/fiduswriter_4.0.18-1_all.deb

# Run migrations and asset generation (transpile must run before collectstatic)
sudo -u fiduswriter fiduswriter migrate
sudo -u fiduswriter fiduswriter transpile
sudo -u fiduswriter fiduswriter collectstatic --noinput

# Restart
sudo systemctl start fiduswriter
```

## Troubleshooting

### Build Issues

**Debhelper compat level error:**
If you see an error about compat level being specified twice, make sure `debian/compat` 
file doesn't exist. We use the modern approach with `debhelper-compat` in `debian/control` only.

**Build dependencies missing:**
```bash
sudo mk-build-deps -i debian/control
```

**Python download fails:**
The build downloads Python 3.14.2 from python.org. Ensure you have internet access and
either `wget` or `curl` installed:
```bash
sudo apt-get install wget
```

**Slow builds:**
First build compiles Python 3.14.2 from source (~10-15 minutes). Subsequent builds use 
the cached Python from `.python-build-cache/` and are much faster (~2-3 minutes). If you 
need to rebuild Python, delete `.python-build-cache/`.

### Installation Issues

**Package conflicts:**
```bash
sudo apt-get purge fiduswriter
sudo dpkg -i debian-build/fiduswriter_*.deb
```

### Runtime Issues

**Service won't start:**
```bash
sudo journalctl -u fiduswriter -n 50
sudo -u fiduswriter fiduswriter check
```

**Database connection errors:**
```bash
# Verify credentials in /etc/fiduswriter/configuration.py
# Ensure database adapter installed
sudo apt-get install python3-psycopg2
```

**Import errors:**
```bash
# Check virtualenv
ls -la /opt/fiduswriter/lib/python3.*/site-packages/
```

## Technical Details

### Database Adapters

Database adapters are **already bundled** in the package:

- **PostgreSQL**: `psycopg2-binary` is included
- **MySQL**: `mysqlclient` is included
- **SQLite**: Built into Python (no additional adapter needed)

No additional installation is required! Simply configure your database settings in `/etc/fiduswriter/configuration.py` and the appropriate adapter will be used automatically.

If you need a different version or adapter, you can install it manually:
```bash
sudo /opt/fiduswriter/python3.14/bin/pip install psycopg2-binary
sudo /opt/fiduswriter/python3.14/bin/pip install mysqlclient
```

### Node.js for Transpilation

Node.js is bundled automatically via the `nodejs-wheel` Python package. This provides:
- Node.js binaries within the Python environment
- No separate Node.js installation required
- Used by `django-npm-mjs` for JavaScript transpilation
- The `transpile` command must be run before `collectstatic`

The build process automatically installs `nodejs-wheel` and database adapters after installing dependencies from `requirements.txt`.

### Database Adapters Bundled

Both PostgreSQL and MySQL database adapters are bundled in the package:
- **psycopg2-binary** - PostgreSQL adapter (pure Python, no compilation needed)
- **mysqlclient** - MySQL adapter

This means:
- No separate package installation required
- Works immediately after configuring database settings
- Reduces deployment complexity
- Same package works for any database choice


---

**Last Updated:** 2025-12-19  
**Package Version:** 4.0.17-1  
**Python Version:** 3.14.2 (bundled)  
**Approach:** Bundled Python + virtualenv

# Debian Package Building Guide

This guide explains how to build and install Fidus Writer as a Debian/Ubuntu package with all Python dependencies bundled.

## Overview

This package bundles a recent **Python**, all dependencies (Django, Channels, Daphne, and 30+ packages), and **all optional modules** into a single self-contained installation at `/opt/fiduswriter/`. This means:

- ✅ **Python included** - No system Python 3.11+ required
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

# 4. Transpile JavaScript
sudo -u fiduswriter fiduswriter transpile

# 5. Collect static files
sudo -u fiduswriter fiduswriter collectstatic --noinput

# 6. Start service
sudo systemctl enable fiduswriter
sudo systemctl start fiduswriter
```

## Architecture

### File Locations

| Component | Location |
|-----------|----------|
| Bundled Python 3.14+ | `/opt/fiduswriter/python3.X/` |
| Virtualenv | `/opt/fiduswriter/venv/` |
| Python packages | `/opt/fiduswriter/venv/lib/python3.X/site-packages/` |
| Bundled binaries | `/opt/fiduswriter/venv/bin/` |
| Configuration | `/etc/fiduswriter/configuration.py` |
| Data directory | `/var/lib/fiduswriter/` |
| Media files | `/var/lib/fiduswriter/media/` |
| Logs | `/var/log/fiduswriter/` |
| Service | `/lib/systemd/system/fiduswriter.service` |

### How It Works

**Build Process:**
1. Downloads and compiles Python 3.14+ from source
2. Creates virtualenv using bundled Python
3. Installs all packages from `fiduswriter/requirements.txt`
4. Bundles Python + virtualenv into .deb package
5. Output: `debian-build/fiduswriter_*.deb` (~200-250 MB)

**Installation:**
1. Extracts Python 3.14+ to `/opt/fiduswriter/python3.X/`
2. Extracts virtualenv to `/opt/fiduswriter/venv/`
3. Creates wrapper script at `/usr/bin/fiduswriter`
4. Sets up systemd service
5. No internet connection needed
6. Works even if system has only Python 3.8 or 3.9

**Runtime:**
- Service uses bundled Python 3.14+
- Service uses `/opt/fiduswriter/venv/bin/daphne`
- Commands use `/opt/fiduswriter/venv/bin/python3`
- All dependencies resolved from bundled virtualenv

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

### Build Output

```
debian-build/
└── fiduswriter_4.0.X-1_all.deb                    (~250-300 MB)
```

## Configuration

### Database Setup

#### PostgreSQL (Recommended)

```bash
# Create database
sudo -u postgres createdb fiduswriter
sudo -u postgres createuser fiduswriter
sudo -u postgres psql -c "ALTER USER fiduswriter WITH PASSWORD 'your_password';"

# Install adapter
sudo apt-get install python3-psycopg2

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
# Install adapter
sudo apt-get install python3-mysqlclient

# Configure
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
# All commands run as fiduswriter user (uses bundled Python 3.14+)
sudo -u fiduswriter fiduswriter <command>

# Examples
fiduswriter migrate              # Run migrations
fiduswriter createsuperuser      # Create admin
fiduswriter collectstatic        # Collect static files
fiduswriter transpile            # Transpile JavaScript
fiduswriter shell                # Django shell
fiduswriter check                # System check
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

# Run migrations
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

Database adapters can be installed either way:

**Option 1: System-wide (recommended for ease):**
```bash
sudo apt-get install python3-psycopg2  # PostgreSQL
sudo apt-get install python3-mysqlclient  # MySQL
```

**Option 2: In virtualenv (works with bundled Python):**
```bash
sudo /opt/fiduswriter/venv/bin/pip install psycopg2-binary
sudo /opt/fiduswriter/venv/bin/pip install mysqlclient
```

The bundled Python can compile C extensions, so both options work.


---

**Last Updated:** 2025-12-19  
**Package Version:** 4.0.17-1  
**Python Version:** 3.14.2 (bundled)  
**Approach:** Bundled Python + virtualenv

# Running Fidus Writer on Ubuntu Snap

The easiest way to install Fidus Writer on Ubuntu is using snap. This guide covers installation, configuration, and advanced setup.

## Quick Installation

### Install from Snap Store

Install Fidus Writer from the Ubuntu Software Store or via command line:

```bash
sudo snap install fiduswriter
```

### First Access

After installation, access Fidus Writer at:

```
http://localhost:4386
```

**Note:** Port 4386 is the default for snap installations (not 8000).

### Create Admin User

Create your first admin user:

```bash
sudo fiduswriter.createsuperuser
```

Or sign up through the web interface at `http://localhost:4386` by clicking "Sign up".

## Initial Configuration

### Configure Fidus Writer

Open the configuration editor:

```bash
sudo fiduswriter.configure
```

This opens a text editor where you can configure Fidus Writer settings.

### Activate Plugins

The Fidus Writer snap includes all generic plugins from the fiduswriter organization. To activate plugins:

1. Run the configuration tool:
   ```bash
   sudo fiduswriter.configure
   ```

2. Find the `INSTALLED_APPS` section and uncomment (remove `#`) the plugins you want:

   ```python
   INSTALLED_APPS = [
       # 'user_template_manager',
       'book',  # Uncommented - enabled
       # 'citation_api_import',
       # 'languagetool',
       'ojs',  # Uncommented - enabled
       # 'phplist',
       # 'gitrepo_export',
       # 'website',
   ]
   ```

3. Save and exit (CTRL+X, then Y to confirm)

4. Wait for migrations to run and JavaScript files to transpile

### Available Plugins

- **user_template_manager** - Custom document templates
- **book** - Book document type support
- **citation_api_import** - Import citations from external APIs
- **languagetool** - Grammar and spell checking
- **ojs** - Open Journal Systems integration
- **phplist** - PHPList newsletter integration
- **gitrepo_export** - Export to Git repositories
- **website** - Website generation from documents

## Network Access Configuration

By default, Fidus Writer is only accessible from localhost. To allow access from other computers:

### 1. Configure Allowed Hosts

Edit the configuration:

```bash
sudo fiduswriter.configure
```

Find the `ALLOWED_HOSTS` section and add your domain name or IP address:

```python
ALLOWED_HOSTS = [
    'myfiduswriter.com',
    '193.75.75.193',
]
```

### 2. Configure CSRF Trusted Origins

In the same configuration file, find `CSRF_TRUSTED_ORIGINS` and add your domain/IP with the protocol:

```python
CSRF_TRUSTED_ORIGINS = [
    'https://myfiduswriter.com',
    'http://193.75.75.193',
]
```

### 3. Choose Access Method

**Option A: Use NGINX Proxy (Recommended)**
See the NGINX section below.

**Option B: Direct Access (Local Network Only)**
Add this setting to the configuration:

```python
LISTEN_TO_ALL_INTERFACES = True
```

**Warning:** Only use Option B for local network access. For internet-facing deployments, always use a reverse proxy with HTTPS.

## NGINX Reverse Proxy Setup

### Install NGINX

```bash
sudo apt install nginx
```

### Create NGINX Configuration

Create a configuration file at `/etc/nginx/sites-available/fidus`:

```nginx
server {
    listen 80;
    listen [::]:80;  # IPv6
    server_name [SERVER_ADDRESS];  # Replace with your domain or IP

    location /static/ {
        alias /var/snap/fiduswriter/current/static-collected/;
        expires max;
    }

    location / {
        proxy_pass http://127.0.0.1:4386;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support (nginx 1.4+)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Maximum upload size
        client_max_body_size 8M;
    }
}
```

Replace `[SERVER_ADDRESS]` with your actual domain name or IP address.

### Enable the Site

```bash
sudo ln -s /etc/nginx/sites-available/fidus /etc/nginx/sites-enabled/fidus
```

### Test and Restart NGINX

```bash
# Test configuration
sudo nginx -t

# Restart NGINX
sudo service nginx restart
```

### Update Fidus Writer Configuration

```bash
sudo fiduswriter.configure
```

Ensure your SERVER_ADDRESS is listed in `ALLOWED_HOSTS` and `CSRF_TRUSTED_ORIGINS`.

### Secure the Internal Port

Block external access to port 4386:

```bash
sudo ufw deny 4386
sudo ufw allow 'Nginx Full'
```

## HTTPS Setup with Let's Encrypt

### Prerequisites

- NGINX proxy must be set up (see above)
- Domain name pointing to your server
- Ports 80 and 443 open in firewall

### Install Certbot

```bash
sudo apt install certbot python3-certbot-nginx
```

### Obtain and Install Certificate

```bash
sudo certbot --nginx -d [SERVER_ADDRESS]
```

Replace `[SERVER_ADDRESS]` with your domain name (e.g., `fiduswriter.example.com`).

Follow the prompts:
- Enter your email address
- Agree to terms of service
- Choose whether to redirect HTTP to HTTPS (recommended: yes)

### Configure HTTPS in Fidus Writer

```bash
sudo fiduswriter.configure
```

Add or verify this setting:

```python
ACCOUNT_DEFAULT_HTTP_PROTOCOL = 'https'
```

### Auto-Renewal

Certbot automatically sets up certificate renewal. Test it with:

```bash
sudo certbot renew --dry-run
```

## Two-Factor Authentication for Admin

### Enable OTP Support

1. Open configuration:
   ```bash
   sudo fiduswriter.configure
   ```

2. Enable OTP plugins in `INSTALLED_APPS`:
   ```python
   INSTALLED_APPS = [
       # ... other apps ...
       'django_otp',
       'django_otp.plugins.otp_totp',
       # ... other apps ...
   ]
   ```

3. Add middleware:
   ```python
   MIDDLEWARE = [
       'django.contrib.auth.middleware.AuthenticationMiddleware',
       'django_otp.middleware.OTPMiddleware',
       # ... other middleware ...
   ]
   ```

4. Set issuer name:
   ```python
   OTP_TOTP_ISSUER = 'Fidus Writer'  # Or your organization name
   ```

5. Save and exit (CTRL+X, then Y)

### Set Up TOTP Device

1. Log into the admin interface at `http://your-domain/admin/`

2. Under "TOTP devices", click "Add"

3. Create an entry for your authenticator app (Google Authenticator, Authy, etc.)

4. Scan the QR code with your phone's authenticator app

### Configure OTP Admin Site

1. Create a configuration file:
   ```bash
   sudo nano /var/snap/fiduswriter/current/two_factor_authentication.py
   ```

2. Add this content:
   ```python
   from django.contrib.admin.apps import AdminConfig

   class FidusConfig(AdminConfig):
       default_site = 'django_otp.admin.OTPAdminSite'
   ```

3. Save and exit

4. Open Fidus Writer configuration:
   ```bash
   sudo fiduswriter.configure
   ```

5. Enable the custom admin config in `INSTALLED_APPS`:
   ```python
   INSTALLED_APPS = [
       'two_factor_authentication.FidusConfig',
       # ... other apps ...
   ]
   ```

6. Disable the default admin:
   ```python
   REMOVED_APPS = ['django.contrib.admin']
   ```

7. Save and exit

Now admin login will require 2FA.

## LanguageTool Configuration

### Disable LanguageTool

If you don't want to run LanguageTool on this machine:

```bash
sudo fiduswriter.configure
```

Remove or set to False:

```python
LT_PORT = False
```

Also remove the plugin from `INSTALLED_APPS`:

```python
INSTALLED_APPS = [
    # ... other apps ...
    # 'languagetool',  # Commented out
    # ... other apps ...
]
```

### Use External LanguageTool Server

To use LanguageTool running on another server:

```bash
sudo fiduswriter.configure
```

Remove or disable `LT_PORT` and add `LT_URL`:

```python
LT_PORT = False
LT_URL = 'https://languagetool.example.com'
```

Keep the plugin enabled in `INSTALLED_APPS`:

```python
INSTALLED_APPS = [
    # ... other apps ...
    'languagetool',
    # ... other apps ...
]
```

## Management Commands

### View Service Status

```bash
sudo snap services fiduswriter
```

### Restart Service

```bash
sudo snap restart fiduswriter
```

### Stop Service

```bash
sudo snap stop fiduswriter
```

### Start Service

```bash
sudo snap start fiduswriter
```

### View Logs

```bash
# View recent logs
sudo snap logs fiduswriter

# Follow logs in real-time
sudo snap logs -f fiduswriter

# View logs for specific service
sudo snap logs fiduswriter.gunicorn
sudo snap logs fiduswriter.daphne
```

### Django Management Commands

All Django management commands are available via `fiduswriter.` prefix:

```bash
# Create superuser
sudo fiduswriter.createsuperuser

# Run migrations
sudo fiduswriter.migrate

# Collect static files
sudo fiduswriter.collectstatic

# Create backup
sudo fiduswriter.backup

# Restore backup
sudo fiduswriter.restore

# Clear cache
sudo fiduswriter.clearcache

# Django shell
sudo fiduswriter.shell
```

## Backup and Restore

### Manual Backup

The snap stores data in `/var/snap/fiduswriter/current/`:

```bash
# Backup entire snap data
sudo tar -czf fiduswriter-backup-$(date +%Y%m%d).tar.gz \
    /var/snap/fiduswriter/current/

# Backup just the database and media
sudo tar -czf fiduswriter-data-$(date +%Y%m%d).tar.gz \
    /var/snap/fiduswriter/current/db.sqlite3 \
    /var/snap/fiduswriter/current/media/
```

### Using Built-in Backup Command

```bash
# Create backup
sudo fiduswriter.backup

# Backups are stored in /var/snap/fiduswriter/current/backups/
```

### Restore from Backup

```bash
# Stop service
sudo snap stop fiduswriter

# Restore data
sudo tar -xzf fiduswriter-backup-YYYYMMDD.tar.gz -C /

# Restart service
sudo snap start fiduswriter

# Or use built-in restore
sudo fiduswriter.restore /path/to/backup/file
```

## Updates

### Automatic Updates

Snap packages update automatically by default. To check for updates:

```bash
sudo snap refresh --list
```

### Manual Update

```bash
sudo snap refresh fiduswriter
```

### Hold Updates

To prevent automatic updates:

```bash
sudo snap refresh --hold fiduswriter
```

### View Version

```bash
snap info fiduswriter
```

### Revert to Previous Version

If an update causes issues:

```bash
sudo snap revert fiduswriter
```

## Configuration Reference

### Configuration File Location

```
/var/snap/fiduswriter/current/configuration.py
```

### Common Configuration Options

```python
# Site information
SITE_NAME = 'My Fidus Writer'
CONTACT_EMAIL = 'admin@example.com'

# Network access
ALLOWED_HOSTS = ['yourdomain.com', 'www.yourdomain.com']
CSRF_TRUSTED_ORIGINS = ['https://yourdomain.com']

# Protocol
ACCOUNT_DEFAULT_HTTP_PROTOCOL = 'https'

# Listen on all interfaces (use with caution)
LISTEN_TO_ALL_INTERFACES = False  # Default

# Database (default is MySQL, included with snap)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'fiduswriter',
        'USER': 'fiduswriter',
        'PASSWORD': 'your_password_here',
        'HOST': 'localhost',
        'PORT': '3306',
        'OPTIONS': {
            'charset': 'utf8mb4',
        }
    }
}

# To use SQLite instead (not recommended for production):
# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.sqlite3',
#         'NAME': '/var/snap/fiduswriter/current/db.sqlite3',
#     }
# }

# Email configuration
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.example.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'your-email@example.com'
EMAIL_HOST_PASSWORD = 'your-password'

# LanguageTool
LT_PORT = 8081  # Port for local LanguageTool, or False to disable
LT_URL = None  # URL for external LanguageTool server

# Plugins
INSTALLED_APPS = [
    # List of enabled apps/plugins
]

# Removed apps (when overriding defaults)
REMOVED_APPS = []
```

## Troubleshooting

### Service Won't Start

Check logs for errors:
```bash
sudo snap logs fiduswriter
```

Common issues:
- Port 4386 already in use
- Configuration syntax error
- Missing dependencies (should auto-install)

### Can't Access from Browser

1. Check service is running:
   ```bash
   sudo snap services fiduswriter
   ```

2. Check firewall:
   ```bash
   sudo ufw status
   ```

3. Verify ALLOWED_HOSTS configuration

### Configuration Changes Not Taking Effect

After editing configuration:
```bash
sudo snap restart fiduswriter
```

### Static Files Not Loading

Recollect static files:
```bash
sudo fiduswriter.collectstatic --noinput
sudo snap restart fiduswriter
```

### Database Locked Error

This can happen with SQLite if you've switched from the default MySQL:
1. Use the default MySQL database (included with the snap)
2. Or reduce concurrent access if you must use SQLite

### NGINX 502 Bad Gateway

1. Check Fidus Writer is running:
   ```bash
   sudo snap services fiduswriter
   ```

2. Check port 4386 is accessible:
   ```bash
   curl http://localhost:4386
   ```

3. Check NGINX error logs:
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

### Certbot Certificate Renewal Fails

Check if port 80 is accessible:
```bash
sudo ufw status
sudo netstat -tlnp | grep :80
```

Manually renew:
```bash
sudo certbot renew --nginx
```

## Performance Optimization

### MySQL Database (Default)

The Fidus Writer snap includes and uses a built-in MySQL server by default. MySQL is pre-configured for production deployments with multiple users, providing better performance and scalability than SQLite.

**Note:** MySQL is the default database and is already configured. You don't need to do anything unless you want to customize settings.

#### Customize MySQL Settings (Optional)

If you need to change MySQL settings (e.g., password, database name):

1. Configure Fidus Writer:
   ```bash
   sudo fiduswriter.configure
   ```

2. Modify the MySQL database configuration:
   ```python
   DATABASES = {
       'default': {
           'ENGINE': 'django.db.backends.mysql',
           'NAME': 'fiduswriter',
           'USER': 'fiduswriter',
           'PASSWORD': 'your_custom_password_here',
           'HOST': 'localhost',
           'PORT': '3306',
           'OPTIONS': {
               'charset': 'utf8mb4',
               'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
           }
       }
   }
   ```

3. Save and exit (CTRL+X, then Y)

4. Restart the snap:
   ```bash
   sudo snap restart fiduswriter
   ```

**Security Note:** For production deployments, make sure to use a strong, unique password.

### Enable Redis for Caching

For better performance with multiple users:

1. Install Redis:
   ```bash
   sudo apt install redis-server
   ```

2. Configure Fidus Writer:
   ```bash
   sudo fiduswriter.configure
   ```
   ```python
   CACHES = {
       'default': {
           'BACKEND': 'django_redis.cache.RedisCache',
           'LOCATION': 'redis://127.0.0.1:6379/1',
       }
   }
   ```

## Security Best Practices

1. ✅ **Always use HTTPS** in production with valid SSL certificate
2. ✅ **Block direct access** to port 4386 from internet
3. ✅ **Keep snap updated** for security patches
4. ✅ **Use strong passwords** for admin accounts
5. ✅ **Enable 2FA** for admin access
6. ✅ **Regular backups** of data and configuration
7. ✅ **Configure firewall** properly with ufw
8. ✅ **Restrict ALLOWED_HOSTS** to actual domains
9. ✅ **Use MySQL** for production (default with snap, already configured)
10. ✅ **Monitor logs** for suspicious activity

## Getting Help

- [Configuration Guides](../configuration/README.md)
- [GitHub Issues](https://github.com/fiduswriter/fiduswriter/issues)
- [GitHub Discussions](https://github.com/fiduswriter/fiduswriter/discussions)
- [Fidus Writer Website](https://fiduswriter.org)

## Related Documentation

- [Installation Overview](README.md)
- [Docker Installation](docker.md)
- [Advanced Configuration](../configuration/advanced.md)
- [Login Providers](../configuration/login-providers.md)
- [Branding](../configuration/branding.md)

---

**Last Updated:** December 8, 2025

**Note:** This guide is specific to the snap installation. The snap includes and uses a MySQL server by default for optimal production performance. For other installation methods, see the [Installation Overview](README.md).
# Security Configuration

This guide covers security configuration for Fidus Writer, including brute-force protection, GDPR compliance, and production hardening.

## Table of Contents

- [Brute-Force Protection](#brute-force-protection)
- [IP-Based Admin Access Restriction](#ip-based-admin-access-restriction)
- [GDPR Compliance](#gdpr-compliance)
- [Production Security Checklist](#production-security-checklist)
- [Security Headers](#security-headers)
- [Password Policies](#password-policies)
- [Password Reset Timeout](#password-reset-timeout)
- [Session Management](#session-management)
- [Monitoring and Auditing](#monitoring-and-auditing)

## Brute-Force Protection

Fidus Writer includes `django-axes` to protect against brute-force login attacks.

### Default Configuration

Out of the box, Fidus Writer is configured with:

- **5 failed login attempts** before lockout
- **1 hour lockout duration**
- **Username + IP combination** for lockout tracking
- **Automatic reset** after successful login
- **Database logging** of all failed attempts

### How It Works

1. Failed login attempts are tracked by username and IP address
2. After 5 failures, the combination is locked out for 1 hour
3. Continued attempts during lockout extend the duration
4. Successful login resets the failure counter
5. All attempts are logged for security auditing

### Monitoring Failed Attempts

View failed login attempts in the Django admin:

1. Navigate to `/admin/`
2. Click **Axes** → **Access Attempts**
3. Review attempts with timestamps, IPs, and usernames

### Unlocking Users

#### Via Django Admin

1. Go to `/admin/axes/accessattempt/`
2. Select the attempt(s) to delete
3. Choose "Delete selected access attempts" action
4. Confirm deletion

#### Via Command Line

```bash
# Reset all lockouts
python manage.py axes_reset

# Reset specific user
python manage.py axes_reset --username user@example.com

# Reset specific IP
python manage.py axes_reset --ip-address 192.168.1.100
```

#### Via Django Shell

```python
python manage.py shell

from axes.models import AccessAttempt

# Clear all attempts
AccessAttempt.objects.all().delete()

# Clear for specific user
AccessAttempt.objects.filter(username='user@example.com').delete()

# Clear for specific IP
AccessAttempt.objects.filter(ip_address='192.168.1.100').delete()
```

### Customizing django-axes

Add these settings to your `configuration.py`:

#### Adjust Failure Threshold

```python
# Allow 10 failed attempts before lockout
AXES_FAILURE_LIMIT = 10
```

#### Adjust Lockout Duration

```python
# Lockout for 2 hours
AXES_COOLOFF_TIME = 2

# Lockout for 30 minutes
AXES_COOLOFF_TIME = 0.5

# No automatic unlock (requires manual intervention)
AXES_COOLOFF_TIME = None
```

#### Change Lockout Strategy

```python
# Lock out by IP address only (useful for shared IPs)
AXES_LOCK_OUT_BY_COMBINATION_USER_AND_IP = False
AXES_LOCKOUT_PARAMETERS = ["ip_address"]

# Lock out by username only (useful behind proxies)
AXES_LOCK_OUT_BY_COMBINATION_USER_AND_IP = False
AXES_LOCKOUT_PARAMETERS = ["username"]

# Lock out by username AND IP (default, most secure)
AXES_LOCK_OUT_BY_COMBINATION_USER_AND_IP = True
AXES_LOCKOUT_PARAMETERS = ["username", "ip_address"]
```

#### Whitelist IPs

```python
# Never lock out these IPs (use with caution!)
AXES_IP_WHITELIST = ['127.0.0.1', '192.168.1.100']
```

#### Custom Lockout Message

```python
# Create custom template at templates/axes/lockout.html
AXES_LOCKOUT_TEMPLATE = 'axes/lockout.html'
```

### Proxy and Load Balancer Configuration

If behind a proxy/load balancer, configure IP detection:

```python
# Trust X-Forwarded-For header
AXES_META_PRECEDENCE_ORDER = [
    'HTTP_X_FORWARDED_FOR',
    'REMOTE_ADDR',
]

# Also configure Django proxy settings
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
USE_X_FORWARDED_HOST = True

# Number of proxies to trust (adjust based on your setup)
AXES_NUM_PROXIES = 1
```

### Data Retention

Clean up old failed attempts periodically:

```python
# In a scheduled task or cron job
from axes.models import AccessAttempt
from django.utils import timezone
from datetime import timedelta

# Delete attempts older than 30 days
cutoff = timezone.now() - timedelta(days=30)
AccessAttempt.objects.filter(attempt_time__lt=cutoff).delete()
```

Or use a management command:

```bash
# Add to crontab
0 2 * * * cd /path/to/fiduswriter && python manage.py axes_reset_logs --age 30
```

## IP-Based Admin Access Restriction

For enhanced security, you can restrict access to the Django admin interface (`/admin/`) to specific IP addresses. This is best implemented at the web server level (NGINX or Apache) rather than in Django.

### Why Restrict Admin Access?

- **Reduces attack surface** - Attackers can't even reach the login page
- **Prevents brute-force attempts** - Only trusted IPs can attempt login
- **Compliance requirements** - Some regulations require administrative access restrictions
- **Defense in depth** - Additional layer beyond authentication

### NGINX Configuration

#### Restrict to Single IP Address

Edit your NGINX configuration file (e.g., `/etc/nginx/sites-available/fidus`):

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    # Admin access - single IP only
    location /admin/ {
        allow 203.0.113.50;  # Your office/home IP
        deny all;
        
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # All other locations accessible to everyone
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Note:** For snap installations, use `http://127.0.0.1:4386` instead of port 8000.

#### Restrict to Multiple IP Addresses

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    # Admin access - multiple IPs
    location /admin/ {
        allow 203.0.113.50;    # Office IP
        allow 198.51.100.25;   # Home IP
        allow 192.0.2.100;     # VPN IP
        deny all;
        
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Restrict to IP Range (CIDR Notation)

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    # Admin access - IP range
    location /admin/ {
        allow 10.0.0.0/8;        # Private network (10.x.x.x)
        allow 192.168.1.0/24;    # Local subnet
        allow 203.0.113.0/24;    # Office network range
        deny all;
        
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Complete Example with HTTPS

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # Static files
    location /static/ {
        alias /var/www/fiduswriter/static-collected/;
        expires max;
    }
    
    # Admin - IP restricted
    location /admin/ {
        allow 203.0.113.50;    # Office IP
        allow 198.51.100.25;   # Home IP
        deny all;
        
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        client_max_body_size 8M;
    }
    
    # All other locations
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        client_max_body_size 8M;
    }
}
```

#### Apply NGINX Changes

```bash
# Test configuration
sudo nginx -t

# Reload NGINX
sudo systemctl reload nginx
```

### Apache Configuration

#### Restrict to Single IP Address

Edit your Apache virtual host configuration (e.g., `/etc/apache2/sites-available/fiduswriter.conf`):

```apache
<VirtualHost *:80>
    ServerName yourdomain.com
    
    # Admin access restriction
    <Location /admin/>
        Require ip 203.0.113.50
    </Location>
    
    # Proxy configuration
    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:8000/
    ProxyPassReverse / http://127.0.0.1:8000/
</VirtualHost>
```

**Note:** For snap installations, use `http://127.0.0.1:4386/` instead of port 8000.

#### Restrict to Multiple IP Addresses

```apache
<VirtualHost *:80>
    ServerName yourdomain.com
    
    # Admin access - multiple IPs
    <Location /admin/>
        Require ip 203.0.113.50 198.51.100.25 192.0.2.100
    </Location>
    
    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:8000/
    ProxyPassReverse / http://127.0.0.1:8000/
</VirtualHost>
```

#### Restrict to IP Range

```apache
<VirtualHost *:80>
    ServerName yourdomain.com
    
    # Admin access - IP ranges
    <Location /admin/>
        Require ip 10.0.0.0/8
        Require ip 192.168.1.0/24
        Require ip 203.0.113.0/24
    </Location>
    
    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:8000/
    ProxyPassReverse / http://127.0.0.1:8000/
</VirtualHost>
```

#### Complete Example with HTTPS

```apache
<VirtualHost *:80>
    ServerName yourdomain.com
    Redirect permanent / https://yourdomain.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName yourdomain.com
    
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/yourdomain.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/yourdomain.com/privkey.pem
    
    # Static files
    Alias /static/ /var/www/fiduswriter/static-collected/
    <Directory /var/www/fiduswriter/static-collected/>
        Require all granted
    </Directory>
    
    # Admin access restriction
    <Location /admin/>
        Require ip 203.0.113.50
        Require ip 198.51.100.25
    </Location>
    
    # Proxy configuration
    ProxyPreserveHost On
    ProxyPass /static/ !
    ProxyPass / http://127.0.0.1:8000/
    ProxyPassReverse / http://127.0.0.1:8000/
    
    # WebSocket support
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteRule /(.*)           ws://127.0.0.1:8000/$1 [P,L]
</VirtualHost>
```

#### Enable Required Apache Modules

```bash
# Enable proxy modules
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod proxy_wstunnel
sudo a2enmod rewrite
sudo a2enmod ssl

# Test configuration
sudo apache2ctl configtest

# Restart Apache
sudo systemctl restart apache2
```

### Testing Your Configuration

#### 1. Test from Allowed IP

From a machine with an allowed IP address:

```bash
curl -I https://yourdomain.com/admin/
```

You should see a `200 OK` or `302 Found` (redirect to login).

#### 2. Test from Denied IP

From a machine with a non-allowed IP address:

```bash
curl -I https://yourdomain.com/admin/
```

You should see `403 Forbidden`.

#### 3. Check Your Current IP

Find your current public IP address:

```bash
curl ifconfig.me
```

Or visit: https://whatismyipaddress.com/

#### 4. Monitor Access Logs

**NGINX:**
```bash
sudo tail -f /var/log/nginx/access.log | grep /admin/
```

**Apache:**
```bash
sudo tail -f /var/log/apache2/access.log | grep /admin/
```

### Dynamic IP Address Considerations

If you don't have a static IP address:

#### Option 1: Use a VPN

Set up a VPN with a static IP and allow only the VPN IP:

```nginx
location /admin/ {
    allow 203.0.113.50;  # Your VPN IP
    deny all;
    # ... proxy settings ...
}
```

#### Option 2: Use a Wider IP Range

Allow your ISP's IP range (less secure):

```nginx
location /admin/ {
    allow 203.0.113.0/24;  # Your ISP's range
    deny all;
    # ... proxy settings ...
}
```

#### Option 3: Use Dynamic DNS with Script

Create a script to update NGINX configuration when your IP changes:

```bash
#!/bin/bash
# /usr/local/bin/update-admin-ip.sh

NEW_IP=$(curl -s ifconfig.me)
CONFIG_FILE="/etc/nginx/sites-available/fiduswriter"

# Update the IP in the config file
sed -i "s/allow [0-9.]*;  # Dynamic IP/allow $NEW_IP;  # Dynamic IP/" $CONFIG_FILE

# Reload NGINX
nginx -t && systemctl reload nginx
```

Run this script periodically via cron or when your IP changes.

#### Option 4: Use SSH Tunnel (Most Secure)

Access admin only through an SSH tunnel:

```bash
# On your local machine
ssh -L 8001:localhost:8000 user@yourdomain.com

# Then access admin at
http://localhost:8001/admin/
```

Configure NGINX to only allow admin access from localhost:

```nginx
location /admin/ {
    allow 127.0.0.1;
    deny all;
    # ... proxy settings ...
}
```

### Important Security Notes

1. **Always use HTTPS** when restricting by IP to prevent session hijacking
2. **Keep a backup access method** in case you get locked out (e.g., console access)
3. **Document allowed IPs** and keep the list updated
4. **Monitor 403 errors** to detect legitimate access attempts
5. **Combine with other security measures** (2FA, strong passwords, etc.)
6. **Test thoroughly** before deploying to production
7. **Consider IPv6** if your network uses it - add both IPv4 and IPv6 addresses

### Troubleshooting

#### Getting Locked Out

If you accidentally lock yourself out:

1. **Via server console access:**
   ```bash
   sudo nano /etc/nginx/sites-available/fiduswriter
   # Remove or comment out the IP restrictions
   sudo nginx -t
   sudo systemctl reload nginx
   ```

2. **Via SSH tunnel:**
   ```bash
   ssh user@yourdomain.com
   # Edit config to allow 127.0.0.1
   # Create SSH tunnel to access admin
   ```

#### IP Restrictions Not Working

1. Check if you're behind a load balancer or CDN (Cloudflare, etc.)
2. Verify the actual IP reaching your server:
   ```bash
   sudo tail -f /var/log/nginx/access.log
   ```
3. If behind a proxy, you may need to check `X-Forwarded-For` header instead

#### Using with Load Balancers

If using a load balancer, configure it to pass the real client IP:

**NGINX with real IP:**
```nginx
# Get real IP from load balancer
set_real_ip_from 10.0.0.0/8;  # Load balancer IP range
real_ip_header X-Forwarded-For;

location /admin/ {
    allow 203.0.113.50;  # Your actual IP
    deny all;
    # ... proxy settings ...
}
```

## GDPR Compliance

Fidus Writer includes settings to help with GDPR compliance.

### Default GDPR-Friendly Settings

✅ **Already Configured:**

- Strong password policies (12+ characters)
- Mandatory email verification
- Secure session management
- Security logging
- Cookie protection (SameSite)

### GDPR Requirements Checklist

#### Essential Legal Documents

```python
# In configuration.py
FOOTER_LINKS = [
    {
        "text": "Privacy Policy",
        "link": "/pages/privacy/"
    },
    {
        "text": "Terms of Service",
        "link": "/pages/terms/"
    },
    {
        "text": "Cookie Policy",
        "link": "/pages/cookies/"
    },
    {
        "text": "GDPR Rights",
        "link": "/pages/gdpr-rights/"
    }
]
```

Create these pages using Django's flatpages in `/admin/flatpages/flatpage/`.

#### Data Protection Officer Contact

```python
# Set DPO contact email
CONTACT_EMAIL = 'dpo@yourdomain.com'
```

#### User Rights Implementation

Implement these features in your deployment:

1. **Right to Access**: Allow users to export their data
2. **Right to Rectification**: Users can edit profile (already implemented)
3. **Right to Erasure**: Implement account deletion functionality
4. **Right to Data Portability**: Export user data in JSON/XML
5. **Right to Object**: Opt-out mechanisms for optional processing

#### Session and Cookie Configuration

```python
# Session cookies
SESSION_COOKIE_AGE = 1209600  # 2 weeks
SESSION_EXPIRE_AT_BROWSER_CLOSE = False
SESSION_SAVE_EVERY_REQUEST = False
SESSION_COOKIE_SECURE = True  # HTTPS only
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_HTTPONLY = False  # JavaScript needs access for Fidus Writer

# CSRF cookies
CSRF_COOKIE_SECURE = True  # HTTPS only
CSRF_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_HTTPONLY = False  # JavaScript needs access for Fidus Writer
```

#### Data Retention Policy

```python
# Example retention settings
# Implement cleanup tasks for:
# - Inactive user accounts (e.g., 2 years)
# - Old access logs (e.g., 90 days)
# - Deleted documents (e.g., 30 days in trash)

# Session expiry
SESSION_COOKIE_AGE = 1209600  # 2 weeks

# Consider implementing:
# - Automatic account deactivation after inactivity
# - Regular cleanup of old sessions
# - Archival of old audit logs
```

### GDPR Consent Management

If you collect data beyond service provision:

```python
# Example: Track user consent
# Implement in your custom app

from django.db import models

class UserConsent(models.Model):
    user = models.ForeignKey('user.User', on_delete=models.CASCADE)
    consent_type = models.CharField(max_length=50)  # e.g., 'marketing', 'analytics'
    consented = models.BooleanField(default=False)
    consent_date = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField()
    
    class Meta:
        unique_together = ['user', 'consent_type']
```

## Production Security Checklist

### Critical Settings

```python
# configuration.py for production

# NEVER run production with DEBUG=True
DEBUG = False

# Set production secret key (50+ random characters)
SECRET_KEY = 'CHANGE-THIS-TO-RANDOM-STRING-50-PLUS-CHARACTERS'

# Restrict to your actual domains
ALLOWED_HOSTS = [
    'yourdomain.com',
    'www.yourdomain.com',
]

# CSRF protection for your domains
CSRF_TRUSTED_ORIGINS = [
    'https://yourdomain.com',
    'https://www.yourdomain.com',
]
```

### HTTPS Configuration

```python
# Redirect all HTTP to HTTPS
SECURE_SSL_REDIRECT = True

# Trust X-Forwarded-Proto header from proxy
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Secure cookies (HTTPS only)
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# HTTP Strict Transport Security (HSTS)
# WARNING: Only enable after verifying HTTPS works!
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
```

### Database Security

```python
# Use PostgreSQL or MySQL, not SQLite
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'fiduswriter',
        'USER': 'fiduswriter_user',
        'PASSWORD': 'STRONG-DATABASE-PASSWORD',
        'HOST': 'localhost',
        'PORT': '5432',
        'CONN_MAX_AGE': 600,
        'OPTIONS': {
            'sslmode': 'require',  # Require SSL for database connections
        },
    }
}
```

### Email Configuration

```python
# Production email backend
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.yourdomain.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'noreply@yourdomain.com'
EMAIL_HOST_PASSWORD = 'STRONG-EMAIL-PASSWORD'
DEFAULT_FROM_EMAIL = 'Fidus Writer <noreply@yourdomain.com>'
SERVER_EMAIL = 'admin@yourdomain.com'
EMAIL_SUBJECT_PREFIX = '[Fidus Writer] '

# Email for security notifications
ADMINS = [
    ('Admin Name', 'admin@yourdomain.com'),
]
```

### File Upload Security

```python
# Limit upload sizes
MEDIA_MAX_SIZE = 10485760  # 10MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 10485760  # 10MB
DATA_UPLOAD_MAX_NUMBER_FIELDS = 5000

# Secure media root (outside web root)
MEDIA_ROOT = '/var/fiduswriter/media/'
MEDIA_URL = '/media/'
```

## Security Headers

Configure security headers in `configuration.py`:

```python
# XSS Protection (already enabled by default)
SECURE_BROWSER_XSS_FILTER = True

# Prevent MIME type sniffing (already enabled by default)
SECURE_CONTENT_TYPE_NOSNIFF = True

# Clickjacking protection (already enabled by default)
X_FRAME_OPTIONS = 'DENY'

# Content Security Policy (optional, requires testing)
CSP_DEFAULT_SRC = ("'self'",)
CSP_SCRIPT_SRC = ("'self'", "'unsafe-inline'", "'unsafe-eval'")  # Fidus Writer needs inline scripts
CSP_STYLE_SRC = ("'self'", "'unsafe-inline'")  # Fidus Writer needs inline styles
CSP_IMG_SRC = ("'self'", "data:", "https:")
CSP_FONT_SRC = ("'self'", "data:")

# Referrer Policy
SECURE_REFERRER_POLICY = 'same-origin'
```

## Password Policies

Default password requirements (already configured):

```python
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 12,
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]
```

### Custom Password Validators

Create stricter policies if needed:

```python
# In your custom app
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _

class CustomPasswordValidator:
    def validate(self, password, user=None):
        # Require at least one uppercase, lowercase, digit, and special char
        if not any(c.isupper() for c in password):
            raise ValidationError(_("Password must contain an uppercase letter."))
        if not any(c.islower() for c in password):
            raise ValidationError(_("Password must contain a lowercase letter."))
        if not any(c.isdigit() for c in password):
            raise ValidationError(_("Password must contain a digit."))
        if not any(c in '!@#$%^&*()_+-=[]{}|;:,.<>?' for c in password):
            raise ValidationError(_("Password must contain a special character."))
    
    def get_help_text(self):
        return _("Password must contain uppercase, lowercase, digit, and special character.")

# In configuration.py
AUTH_PASSWORD_VALIDATORS = [
    # ... default validators ...
    {
        'NAME': 'myapp.validators.CustomPasswordValidator',
    },
]
```

## Password Reset Timeout

For security reasons, password reset links should expire after a limited time to prevent unauthorized access if a reset email is intercepted or accessed later.

### Default Configuration

Fidus Writer sets the password reset timeout to **24 hours** (86400 seconds) by default, which is more secure than Django's default of 3 days.

```python
# Already configured in base/settings.py
PASSWORD_RESET_TIMEOUT = 86400  # 24 hours
```

### Customizing the Timeout

You can adjust this value in your `configuration.py` based on your security requirements:

```python
# More secure options
PASSWORD_RESET_TIMEOUT = 43200  # 12 hours
PASSWORD_RESET_TIMEOUT = 3600   # 1 hour (very secure)

# Less secure (not recommended)
PASSWORD_RESET_TIMEOUT = 259200  # 3 days (Django default)
```

### Security Recommendations

- **24 hours or less**: Recommended for most deployments
- **12 hours**: Suitable for high-security environments
- **1 hour**: Appropriate for critical systems requiring maximum security
- **Avoid longer timeouts**: Reset links valid for multiple days increase the risk window

### How It Works

1. User requests a password reset
2. System generates a unique, time-limited token
3. Token is sent via email as part of a reset link
4. Token expires after `PASSWORD_RESET_TIMEOUT` seconds
5. Expired tokens cannot be used to reset passwords

### User Impact

Shorter timeouts improve security but may require users to request new reset links if they don't act quickly. Consider your user base when setting this value:

- **Tech-savvy users**: Can handle 1-6 hour timeouts
- **General users**: 12-24 hours provides good balance
- **Users with limited email access**: May need 24+ hours (balance with security needs)

## Session Management

### Session Security

```python
# Session cookie settings (GDPR compliant)
SESSION_COOKIE_AGE = 1209600  # 2 weeks
SESSION_EXPIRE_AT_BROWSER_CLOSE = False
SESSION_SAVE_EVERY_REQUEST = False
SESSION_COOKIE_SECURE = True  # HTTPS only
SESSION_COOKIE_HTTPONLY = False  # Fidus Writer needs JS access
SESSION_COOKIE_SAMESITE = 'Lax'

# Use database sessions (default) for persistence
SESSION_ENGINE = 'django.contrib.sessions.backends.db'

# Or use cached sessions for performance
SESSION_ENGINE = 'django.contrib.sessions.backends.cached_db'

# Or Redis for distributed deployments
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}
```

### Session Cleanup

```bash
# Add to cron to clean expired sessions
0 3 * * * cd /path/to/fiduswriter && python manage.py clearsessions
```

## Monitoring and Auditing

### Security Logging

```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'security_file': {
            'level': 'WARNING',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': '/var/log/fiduswriter/security.log',
            'maxBytes': 10485760,  # 10MB
            'backupCount': 10,
            'formatter': 'verbose',
        },
        'mail_admins': {
            'level': 'ERROR',
            'class': 'django.utils.log.AdminEmailHandler',
            'include_html': True,
        },
    },
    'loggers': {
        'django.security': {
            'handlers': ['security_file', 'mail_admins'],
            'level': 'WARNING',
            'propagate': False,
        },
        'axes': {
            'handlers': ['security_file'],
            'level': 'WARNING',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['security_file', 'mail_admins'],
            'level': 'ERROR',
            'propagate': False,
        },
    },
}
```

### Regular Security Tasks

1. **Weekly**: Review failed login attempts
2. **Weekly**: Check security logs for anomalies
3. **Monthly**: Review user accounts for suspicious activity
4. **Monthly**: Update dependencies (`pip list --outdated`)
5. **Quarterly**: Security audit of configuration
6. **Quarterly**: Review and test backup restoration

### Security Monitoring Commands

```bash
# Check failed login attempts
python manage.py shell -c "from axes.models import AccessAttempt; print(AccessAttempt.objects.count())"

# List recent lockouts
python manage.py shell -c "from axes.models import AccessLog; for log in AccessLog.objects.all()[:10]: print(log)"

# Check active sessions
python manage.py shell -c "from django.contrib.sessions.models import Session; print(Session.objects.count())"
```

## Security Best Practices

### Development vs Production

| Setting | Development | Production |
|---------|-------------|------------|
| `DEBUG` | `True` | `False` |
| `SECRET_KEY` | Default | Unique random string |
| `ALLOWED_HOSTS` | `['localhost']` | Actual domains |
| `SESSION_COOKIE_SECURE` | `False` | `True` |
| `CSRF_COOKIE_SECURE` | `False` | `True` |
| `SECURE_SSL_REDIRECT` | `False` | `True` |
| Database | SQLite | PostgreSQL/MySQL |
| Email | Console | SMTP |

### Secret Management

**Never commit secrets to version control!**

Options for managing secrets:

1. **Environment Variables**
   ```bash
   export SECRET_KEY="your-secret-key"
   export DATABASE_PASSWORD="db-password"
   ```

2. **Separate Secrets File**
   ```python
   # secrets.py (in .gitignore)
   SECRET_KEY = "your-secret-key"
   DATABASE_PASSWORD = "db-password"
   
   # configuration.py
   from secrets import SECRET_KEY, DATABASE_PASSWORD
   ```

3. **External Secrets Management**
   - AWS Secrets Manager
   - HashiCorp Vault
   - Azure Key Vault
   - Kubernetes Secrets

### Security Updates

Keep dependencies updated:

```bash
# Check for updates
pip list --outdated

# Update Django
pip install --upgrade Django

# Update django-axes
pip install --upgrade django-axes

# Update all dependencies
pip install --upgrade -r requirements.txt

# Run migrations after updates
python manage.py migrate
```

## Security Incident Response

### If Account Compromise is Suspected

1. **Immediately lock the account**
   ```python
   from user.models import User
   user = User.objects.get(username='compromised@example.com')
   user.is_active = False
   user.save()
   ```

2. **Reset passwords**
   ```bash
   python manage.py changepassword username
   ```

3. **Invalidate all sessions**
   ```python
   from django.contrib.sessions.models import Session
   Session.objects.all().delete()
   ```

4. **Review access logs**
   ```python
   from axes.models import AccessAttempt, AccessLog
   # Check suspicious attempts
   ```

5. **Notify the user** (GDPR requirement for data breaches)

### If System Breach is Suspected

1. **Isolate the system** (take offline if necessary)
2. **Preserve evidence** (logs, database snapshots)
3. **Identify attack vector**
4. **Patch vulnerabilities**
5. **Restore from clean backup**
6. **Reset all secrets** (SECRET_KEY, passwords, API keys)
7. **Notify affected users** (GDPR requirement)
8. **Document the incident**
9. **Implement additional protections**

## Getting Help

- **Security Issues**: Report to security@fiduswriter.org (if available) or GitHub Security tab
- **Django Security**: https://docs.djangoproject.com/en/stable/topics/security/
- **django-axes**: https://django-axes.readthedocs.io/
- **GDPR**: https://gdpr.eu/
- **OWASP**: https://owasp.org/

## Related Documentation

- [SSL/HTTPS Setup](ssl.md)
- [Database Configuration](database.md)
- [Monitoring and Logging](monitoring.md)
- [Backup and Restore](backup.md)

---

**Last Updated**: January 2026

**Important**: Security is an ongoing process. Regularly review and update your security configuration as threats evolve.
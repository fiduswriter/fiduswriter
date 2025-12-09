# Configuration Guides

This section provides guides for configuring and customizing Fidus Writer for your deployment.

## Quick Reference

### Essential Configuration

- [Login Providers](login-providers.md) - Set up OAuth, SAML, and social authentication
- [SSL/HTTPS Setup](ssl.md) - Secure your deployment with SSL certificates
- [Advanced Configuration](advanced.md) - Environment variables and Django settings

### Customization

- [Branding and Logo](branding.md) - Add your organization's branding
- [Footer Links](footer-links.md) - Customize footer links and information
- [Email Configuration](email.md) - Set up SMTP for notifications

### Performance and Scaling

- [Load Balancer Setup](load-balancer.md) - Deploy with load balancing
- [Performance Optimization](performance.md) - Tune for better performance
- [Caching with Redis](caching.md) - Configure Redis for session storage and caching

### Operations

- [Monitoring and Logging](monitoring.md) - Set up monitoring and centralized logging
- [Backup and Restore](backup.md) - Configure automated backups
- [Database Configuration](database.md) - PostgreSQL, MySQL, and SQLite setup

## Configuration Overview

Fidus Writer can be configured through several methods:

### 1. Configuration File (`configuration.py`)

The primary configuration method for most settings:

```python
# Example configuration.py
DEBUG = False
ALLOWED_HOSTS = ['yourdomain.com', 'www.yourdomain.com']

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'fiduswriter',
        'USER': 'fiduswriter',
        'PASSWORD': 'secure_password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}

# Email settings
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.example.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True

# Site information
SITE_NAME = 'My Fidus Writer'
CONTACT_EMAIL = 'admin@example.com'
```

**Location:**
- Snap: `/var/snap/fiduswriter/current/configuration.py`
- Docker: Mount as volume or use environment variables
- Source: `fiduswriter/configuration.py`

### 2. Environment Variables

Useful for Docker deployments and sensitive data:

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:port/dbname

# Security
DJANGO_SECRET_KEY=your-secret-key-here
DJANGO_DEBUG=False

# Site
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
SITE_NAME=My Fidus Writer

# Email
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_HOST_USER=user@example.com
EMAIL_HOST_PASSWORD=password
```

### 3. Django Settings

Advanced Django settings can be configured in `configuration.py`:

```python
# Session configuration
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'

# Cache configuration
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
    }
}

# Security settings
SECURE_SSL_REDIRECT = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SECURE = True
```

## Common Configuration Tasks

### Basic Setup

1. **Set Site Name and Contact**
   ```python
   SITE_NAME = 'My Academic Writing Platform'
   CONTACT_EMAIL = 'support@example.com'
   ```

2. **Configure Allowed Hosts**
   ```python
   ALLOWED_HOSTS = [
       'yourdomain.com',
       'www.yourdomain.com',
       'fiduswriter.example.org'
   ]
   ```

3. **Set Up Database** (see [Database Configuration](database.md))

4. **Configure Email** (see [Email Configuration](email.md))

### Security Configuration

1. **Generate Secret Key**
   ```bash
   python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
   ```

2. **Enable HTTPS** (see [SSL Setup](ssl.md))
   ```python
   SECURE_SSL_REDIRECT = True
   CSRF_COOKIE_SECURE = True
   SESSION_COOKIE_SECURE = True
   SECURE_HSTS_SECONDS = 31536000
   ```

3. **Configure CORS** (if using separate frontend)
   ```python
   CORS_ALLOWED_ORIGINS = [
       'https://yourdomain.com',
   ]
   ```

### Authentication Configuration

1. **Email-based Registration**
   ```python
   ACCOUNT_EMAIL_REQUIRED = True
   ACCOUNT_EMAIL_VERIFICATION = 'mandatory'
   ```

2. **Social Authentication** (see [Login Providers](login-providers.md))
   ```python
   SOCIALACCOUNT_PROVIDERS = {
       'google': {
           'APP': {
               'client_id': 'your-client-id',
               'secret': 'your-client-secret',
           }
       }
   }
   ```

3. **LDAP/SAML** (see [Login Providers](login-providers.md))

### Storage Configuration

1. **Local Storage** (default)
   ```python
   MEDIA_ROOT = '/var/fiduswriter/media'
   STATIC_ROOT = '/var/fiduswriter/static'
   ```

2. **S3 Storage**
   ```python
   DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
   AWS_ACCESS_KEY_ID = 'your-access-key'
   AWS_SECRET_ACCESS_KEY = 'your-secret-key'
   AWS_STORAGE_BUCKET_NAME = 'fiduswriter-media'
   AWS_S3_REGION_NAME = 'us-east-1'
   ```

## Configuration by Deployment Method

### Snap Installation

Configuration file location:
```bash
sudo nano /var/snap/fiduswriter/current/configuration.py
```

Restart after changes:
```bash
sudo snap restart fiduswriter
```

See [Snap Installation Guide](../installation/snap.md) for details.

### Docker Installation

Use environment variables in `docker-compose.yml`:

```yaml
services:
  fiduswriter:
    environment:
      - DATABASE_URL=postgresql://...
      - DJANGO_SECRET_KEY=...
      - ALLOWED_HOSTS=yourdomain.com
```

Or mount configuration file:
```yaml
services:
  fiduswriter:
    volumes:
      - ./configuration.py:/app/configuration.py
```

See [Docker Installation Guide](../installation/docker.md) for details.

### Source Installation

Edit `fiduswriter/configuration.py` directly.

Restart your WSGI server after changes.

See [Developer Installation Guide](../installation/developer-install.md) for details.

## Configuration Best Practices

### Security

1. ✅ **Never commit secrets** to version control
2. ✅ **Use strong secret keys** (at least 50 characters)
3. ✅ **Disable DEBUG in production**
4. ✅ **Enable HTTPS** and security headers
5. ✅ **Restrict ALLOWED_HOSTS** to actual domains
6. ✅ **Use environment variables** for sensitive data
7. ✅ **Regular security audits** of configuration

### Performance

1. ✅ **Use PostgreSQL** for production (not SQLite)
2. ✅ **Enable caching** with Redis
3. ✅ **Configure static file serving** properly
4. ✅ **Set appropriate timeouts**
5. ✅ **Enable database connection pooling**

### Reliability

1. ✅ **Set up database backups**
2. ✅ **Configure error logging**
3. ✅ **Use health checks**
4. ✅ **Document your configuration**
5. ✅ **Test configuration changes** in staging first

### Maintenance

1. ✅ **Version control configuration** (excluding secrets)
2. ✅ **Use configuration management** tools
3. ✅ **Keep configuration organized**
4. ✅ **Document customizations**
5. ✅ **Plan for disaster recovery**

## Configuration Checklist

Before going to production:

- [ ] Set `DEBUG = False`
- [ ] Configure secure `SECRET_KEY`
- [ ] Set proper `ALLOWED_HOSTS`
- [ ] Configure PostgreSQL database
- [ ] Set up email (SMTP)
- [ ] Enable HTTPS/SSL
- [ ] Configure static file serving
- [ ] Set up Redis for caching
- [ ] Configure backup strategy
- [ ] Set up monitoring and logging
- [ ] Configure authentication providers
- [ ] Test all functionality
- [ ] Document your configuration
- [ ] Review security settings

## Troubleshooting

### Configuration Not Taking Effect

**Problem:** Changes to configuration file don't apply

**Solutions:**
1. Restart the service/server
2. Check file syntax (Python syntax errors)
3. Verify file permissions
4. Check for typos in setting names
5. Ensure you're editing the correct file

### Database Connection Errors

**Problem:** Can't connect to database

**Solutions:**
1. Verify database is running
2. Check connection credentials
3. Test connection manually: `psql -U user -h host -d database`
4. Check firewall rules
5. Verify `DATABASES` configuration

### Static Files Not Loading

**Problem:** CSS/JS files return 404

**Solutions:**
1. Run `collectstatic`: `python manage.py collectstatic`
2. Check `STATIC_ROOT` and `STATIC_URL` settings
3. Verify web server configuration for static files
4. Check file permissions

### Email Not Sending

**Problem:** Emails not being delivered

**Solutions:**
1. Check SMTP credentials
2. Test SMTP connection manually
3. Check firewall/security group rules
4. Verify email backend configuration
5. Check spam folders
6. Review email logs

## Getting Help

- [FAQ](../faq.md)
- [Troubleshooting Guide](../troubleshooting.md)
- [GitHub Issues](https://github.com/fiduswriter/fiduswriter/issues)
- [GitHub Discussions](https://github.com/fiduswriter/fiduswriter/discussions)

## Next Steps

Choose a configuration guide based on your needs:

- **Just Getting Started?** → [Advanced Configuration](advanced.md)
- **Need Authentication?** → [Login Providers](login-providers.md)
- **Want Customization?** → [Branding](branding.md) and [Footer Links](footer-links.md)
- **Scaling Up?** → [Load Balancer](load-balancer.md) and [Performance](performance.md)
- **Production Deployment?** → Review all security-related guides

---

**Last Updated:** December 8, 2025

**Note:** Configuration options may vary between versions. Always refer to the documentation for your specific Fidus Writer version.
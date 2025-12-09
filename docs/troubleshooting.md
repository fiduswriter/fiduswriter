# Troubleshooting Guide

This guide provides solutions to common problems you might encounter with Fidus Writer.

## Installation Issues

### Snap Installation Problems

#### Service Won't Start After Installation

**Symptoms:** Can't access Fidus Writer at http://localhost:4386

**Solutions:**

1. Check service status:
   ```bash
   sudo snap services fiduswriter
   ```

2. View logs for errors:
   ```bash
   sudo snap logs fiduswriter
   ```

3. Restart the service:
   ```bash
   sudo snap restart fiduswriter
   ```

4. Check if port is already in use:
   ```bash
   sudo lsof -i :4386
   ```

#### Permission Denied Errors

**Symptoms:** Permission errors in logs

**Solutions:**

1. Ensure snap has proper permissions:
   ```bash
   sudo snap connect fiduswriter:removable-media
   ```

2. Check file permissions:
   ```bash
   ls -la /var/snap/fiduswriter/current/
   ```

### Docker Installation Problems

#### Container Exits Immediately

**Symptoms:** `docker-compose ps` shows container as exited

**Solutions:**

1. Check container logs:
   ```bash
   docker-compose logs fiduswriter
   ```

2. Common issues:
   - Database not ready (add healthcheck)
   - Configuration error (check syntax)
   - Port conflict (change port mapping)

3. Rebuild and restart:
   ```bash
   docker-compose down
   docker-compose up --build
   ```

#### Database Connection Failed

**Symptoms:** "Could not connect to database" error

**Solutions:**

1. Ensure database container is running:
   ```bash
   docker-compose ps db
   ```

2. Check database credentials in environment variables

3. Add depends_on with condition:
   ```yaml
   services:
     fiduswriter:
       depends_on:
         db:
           condition: service_healthy
     db:
       healthcheck:
         test: ["CMD-SHELL", "pg_isready -U fiduswriter"]
         interval: 10s
         timeout: 5s
         retries: 5
   ```

#### Volumes Permission Issues

**Symptoms:** Can't write to mounted volumes

**Solutions:**

1. Check volume permissions:
   ```bash
   docker-compose exec fiduswriter ls -la /app/media
   ```

2. Fix permissions:
   ```bash
   docker-compose exec fiduswriter chown -R www-data:www-data /app/media
   ```

### Development Installation Problems

#### Import Errors

**Symptoms:** ModuleNotFoundError when running manage.py

**Solutions:**

1. Ensure virtual environment is activated:
   ```bash
   which python
   # Should show path to venv
   ```

2. Reinstall dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Check Python version:
   ```bash
   python --version
   # Should be 3.10 or higher
   ```

#### Database Migration Errors

**Symptoms:** Errors when running `migrate`

**Solutions:**

1. Check database connection:
   ```bash
   python manage.py dbshell
   ```

2. Reset migrations (WARNING: Loses data):
   ```bash
   python manage.py migrate --fake-initial
   ```

3. Or start fresh:
   ```bash
   rm db.sqlite3
   python manage.py migrate
   python manage.py createsuperuser
   ```

#### Frontend Build Errors

**Symptoms:** Errors when running `transpile`

**Solutions:**

1. Check Node.js version:
   ```bash
   node --version
   # Should be 18 or higher
   ```

2. Clear npm cache:
   ```bash
   find . -name "node_modules" -type d -exec rm -rf {} +
   npm cache clean --force
   ```

3. Rebuild:
   ```bash
   python manage.py transpile
   ```

## Access Issues

### Can't Access Fidus Writer

#### Wrong Port

**Symptoms:** Connection refused or timeout

**Solutions:**

1. Check which port is being used:
   - Snap: Default is 4386
   - Docker: Check docker-compose.yml port mapping
   - Development: Default is 8000 (or specified in runserver)

2. Try the correct URL:
   - Snap: http://localhost:4386
   - Docker: http://localhost:8000
   - Development: http://localhost:8000

#### Firewall Blocking Access

**Symptoms:** Can't access from other machines

**Solutions:**

1. Check firewall status:
   ```bash
   sudo ufw status
   ```

2. Allow the port:
   ```bash
   sudo ufw allow 4386  # For snap
   sudo ufw allow 8000  # For docker/dev
   ```

3. For external access, also allow NGINX ports:
   ```bash
   sudo ufw allow 'Nginx Full'
   ```

#### ALLOWED_HOSTS Error

**Symptoms:** "Invalid HTTP_HOST header" or 400 Bad Request

**Solutions:**

1. Edit configuration and add your domain/IP to ALLOWED_HOSTS:
   ```bash
   sudo fiduswriter.configure  # Snap
   ```

   ```python
   ALLOWED_HOSTS = [
       'localhost',
       '127.0.0.1',
       'yourdomain.com',
       'your.ip.address',
   ]
   ```

2. Also add to CSRF_TRUSTED_ORIGINS:
   ```python
   CSRF_TRUSTED_ORIGINS = [
       'http://localhost:4386',
       'https://yourdomain.com',
   ]
   ```

3. Restart service

### Can't Log In

#### Forgot Password

**Solutions:**

1. Reset via Django shell:
   ```bash
   # Snap
   sudo fiduswriter.shell
   
   # Docker
   docker-compose exec fiduswriter python manage.py shell
   
   # Development
   python manage.py shell
   ```

2. In Python shell:
   ```python
   from django.contrib.auth import get_user_model
   User = get_user_model()
   user = User.objects.get(username='yourusername')
   user.set_password('newpassword')
   user.save()
   exit()
   ```

#### No Superuser Exists

**Solutions:**

Create a superuser:
```bash
# Snap
sudo fiduswriter.createsuperuser

# Docker
docker-compose exec fiduswriter python manage.py createsuperuser

# Development
python manage.py createsuperuser
```

#### Two-Factor Authentication Issues

**Symptoms:** Can't log in to admin after enabling 2FA

**Solutions:**

1. Use backup codes if you have them

2. Disable 2FA temporarily by accessing database directly:
   ```bash
   # Snap
   sudo fiduswriter.shell
   
   # Docker
   docker-compose exec fiduswriter python manage.py shell
   ```

3. In Python shell:
   ```python
   from django_otp.plugins.otp_totp.models import TOTPDevice
   TOTPDevice.objects.all().delete()
   ```

## Performance Issues

### Slow Page Loading

**Common Causes:**

1. **Using SQLite in production**
   - Solution: Migrate to PostgreSQL
   - See database configuration guide

2. **No caching enabled**
   - Solution: Enable Redis caching
   - See caching configuration guide

3. **Static files not optimized**
   - Solution: Use CDN and enable compression
   - Configure web server caching

4. **Insufficient resources**
   - Solution: Increase CPU/RAM allocation
   - Monitor resource usage with `htop`

### Database Locked Error (SQLite)

**Symptoms:** "Database is locked" errors

**Solutions:**

1. **Short term:** Reduce concurrent access

2. **Long term:** Switch to PostgreSQL:
   ```python
   DATABASES = {
       'default': {
           'ENGINE': 'django.db.backends.postgresql',
           'NAME': 'fiduswriter',
           'USER': 'fiduswriter',
           'PASSWORD': 'password',
           'HOST': 'localhost',
           'PORT': '5432',
       }
   }
   ```

### High Memory Usage

**Solutions:**

1. Enable Redis for session storage:
   ```python
   SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
   ```

2. Limit number of worker processes

3. Monitor and optimize queries

4. Consider horizontal scaling

## Frontend Issues

### Static Files Not Loading

**Symptoms:** Missing CSS/JavaScript, unstyled pages

**Solutions:**

1. Collect static files:
   ```bash
   # Snap
   sudo fiduswriter.collectstatic --noinput
   
   # Docker
   docker-compose exec fiduswriter python manage.py collectstatic --noinput
   
   # Development
   python manage.py collectstatic --noinput
   ```

2. Check STATIC_URL and STATIC_ROOT settings

3. Verify web server configuration for static files

4. Check file permissions:
   ```bash
   ls -la /var/snap/fiduswriter/current/static-collected/
   ```

5. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)

### JavaScript Errors in Browser Console

**Solutions:**

1. Open browser DevTools (F12) and check Console tab

2. Common issues:
   - Missing transpiled files: Run `python manage.py transpile`
   - CORS errors: Check CORS configuration
   - WebSocket errors: Check WebSocket configuration

3. Check for conflicting browser extensions

4. Try in incognito/private mode

### Editor Not Loading

**Symptoms:** Blank page or spinning loader

**Solutions:**

1. Check browser console for errors

2. Verify JavaScript files are loading:
   - Open DevTools → Network tab
   - Reload page
   - Check for 404 errors

3. Clear browser cache completely

4. Rebuild frontend:
   ```bash
   python manage.py transpile --clean
   python manage.py collectstatic --noinput
   ```

## Collaboration Issues

### Real-Time Collaboration Not Working

**Symptoms:** Changes don't sync between users

**Solutions:**

1. Check WebSocket connection:
   - Open browser DevTools → Network tab
   - Filter by WS (WebSocket)
   - Look for WebSocket connections

2. Ensure WebSocket support in reverse proxy:
   ```nginx
   # NGINX configuration
   location / {
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
   }
   ```

3. Check firewall allows WebSocket connections

4. Verify Django Channels is properly configured

### Users Kicked Out During Editing

**Solutions:**

1. Check session timeout settings:
   ```python
   SESSION_COOKIE_AGE = 3600  # 1 hour
   ```

2. Increase timeout if needed

3. Check for network stability issues

4. Monitor server resources (CPU/RAM)

## Email Issues

### Emails Not Sending

**Symptoms:** No confirmation emails, password resets fail

**Solutions:**

1. Check email backend configuration:
   ```python
   EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
   EMAIL_HOST = 'smtp.gmail.com'
   EMAIL_PORT = 587
   EMAIL_USE_TLS = True
   EMAIL_HOST_USER = 'your-email@gmail.com'
   EMAIL_HOST_PASSWORD = 'your-app-password'
   DEFAULT_FROM_EMAIL = 'noreply@yourdomain.com'
   ```

2. Test SMTP connection manually:
   ```bash
   telnet smtp.gmail.com 587
   ```

3. Check spam folder

4. For Gmail, use App Password (not account password)

5. Check email logs:
   ```bash
   sudo snap logs fiduswriter | grep -i email
   ```

### Emails in Console Instead of Sending

**Symptoms:** Emails appear in logs but not delivered

**Solution:**

This is normal for development. You're using console backend:
```python
# Development
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Production
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
```

## SSL/HTTPS Issues

### Certificate Errors

**Symptoms:** "Your connection is not private" browser warning

**Solutions:**

1. Ensure certificate is valid:
   ```bash
   sudo certbot certificates
   ```

2. Renew if expired:
   ```bash
   sudo certbot renew
   ```

3. Check certificate matches domain

4. Verify NGINX/Apache is using correct certificate paths

### Mixed Content Warnings

**Symptoms:** Some resources load over HTTP instead of HTTPS

**Solutions:**

1. Ensure all resources use HTTPS

2. Set in configuration:
   ```python
   ACCOUNT_DEFAULT_HTTP_PROTOCOL = 'https'
   SECURE_SSL_REDIRECT = True
   ```

3. Update any hardcoded HTTP URLs to HTTPS

### Let's Encrypt Renewal Fails

**Solutions:**

1. Check if port 80 is accessible:
   ```bash
   sudo netstat -tlnp | grep :80
   ```

2. Temporarily stop web server if needed:
   ```bash
   sudo service nginx stop
   sudo certbot renew
   sudo service nginx start
   ```

3. Check certbot logs:
   ```bash
   sudo cat /var/log/letsencrypt/letsencrypt.log
   ```

## Database Issues

### Connection Pool Exhausted

**Symptoms:** "Too many connections" error

**Solutions:**

1. Increase max connections in PostgreSQL:
   ```bash
   # Edit postgresql.conf
   max_connections = 200
   ```

2. Use connection pooling (PgBouncer)

3. Check for connection leaks in code

### Slow Queries

**Solutions:**

1. Enable query logging:
   ```python
   LOGGING = {
       'version': 1,
       'handlers': {
           'console': {
               'class': 'logging.StreamHandler',
           },
       },
       'loggers': {
           'django.db.backends': {
               'handlers': ['console'],
               'level': 'DEBUG',
           },
       },
   }
   ```

2. Analyze slow queries

3. Add database indexes

4. Optimize queries with select_related/prefetch_related

### Database Migrations Fail

**Solutions:**

1. Check for conflicts:
   ```bash
   python manage.py showmigrations
   ```

2. Fake problematic migration:
   ```bash
   python manage.py migrate --fake app_name migration_name
   ```

3. Manual intervention may be needed - backup first!

## NGINX/Reverse Proxy Issues

### 502 Bad Gateway

**Symptoms:** NGINX shows 502 error

**Solutions:**

1. Check if Fidus Writer is running:
   ```bash
   sudo snap services fiduswriter
   # or
   docker-compose ps
   ```

2. Check NGINX error logs:
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

3. Verify proxy_pass URL is correct:
   ```nginx
   proxy_pass http://127.0.0.1:4386;  # Snap
   proxy_pass http://fiduswriter:8000;  # Docker
   ```

4. Test NGINX configuration:
   ```bash
   sudo nginx -t
   ```

### 504 Gateway Timeout

**Solutions:**

1. Increase timeout in NGINX:
   ```nginx
   proxy_connect_timeout 600;
   proxy_send_timeout 600;
   proxy_read_timeout 600;
   send_timeout 600;
   ```

2. Check if Fidus Writer is overloaded

3. Optimize slow operations

### Static Files Return 404

**Solutions:**

1. Verify static file location in NGINX config:
   ```nginx
   location /static/ {
       alias /var/snap/fiduswriter/current/static-collected/;
   }
   ```

2. Collect static files again

3. Check file permissions:
   ```bash
   sudo chmod -R 755 /var/snap/fiduswriter/current/static-collected/
   ```

## Plugin Issues

### Plugin Not Appearing

**Solutions:**

1. Verify plugin is in INSTALLED_APPS:
   ```bash
   sudo fiduswriter.configure
   ```

2. Run migrations:
   ```bash
   sudo fiduswriter.migrate
   ```

3. Collect static files:
   ```bash
   sudo fiduswriter.collectstatic --noinput
   ```

4. Restart service

### Plugin Conflicts

**Solutions:**

1. Check for conflicting plugins

2. Review plugin dependencies

3. Check logs for errors:
   ```bash
   sudo snap logs fiduswriter | grep -i error
   ```

## Upgrade Issues

### Upgrade Fails

**Solutions:**

1. Always backup before upgrading

2. Check release notes for breaking changes

3. Revert to previous version:
   ```bash
   # Snap
   sudo snap revert fiduswriter
   
   # Docker
   docker-compose down
   # Edit docker-compose.yml to use previous version
   docker-compose up -d
   ```

4. Report issue on GitHub with logs

### Post-Upgrade Errors

**Solutions:**

1. Run migrations:
   ```bash
   python manage.py migrate
   ```

2. Collect static files:
   ```bash
   python manage.py collectstatic --noinput
   ```

3. Clear cache:
   ```bash
   python manage.py clear_cache
   ```

4. Rebuild frontend:
   ```bash
   python manage.py transpile
   ```

## Getting More Help

### Gathering Information for Bug Reports

When reporting issues, include:

1. **Version information:**
   ```bash
   # Snap
   snap info fiduswriter
   
   # Docker
   docker-compose exec fiduswriter python manage.py version
   ```

2. **System information:**
   - Operating system and version
   - Browser and version
   - Installation method

3. **Logs:**
   ```bash
   # Snap
   sudo snap logs fiduswriter -n=100
   
   # Docker
   docker-compose logs --tail=100 fiduswriter
   ```

4. **Steps to reproduce**

5. **Expected vs actual behavior**

### Where to Get Help

- **Documentation**: Start with [main docs](README.md)
- **FAQ**: Check [FAQ](faq.md) for common questions
- **GitHub Issues**: [Report bugs](https://github.com/fiduswriter/fiduswriter/issues)
- **GitHub Discussions**: [Ask questions](https://github.com/fiduswriter/fiduswriter/discussions)
- **Community**: Join community forums

### Debugging Tips

1. **Enable DEBUG mode** (development only):
   ```python
   DEBUG = True
   ```

2. **Check all logs:**
   - Application logs
   - Web server logs (NGINX/Apache)
   - Database logs
   - Browser console

3. **Isolate the problem:**
   - Test in different browser
   - Test with plugins disabled
   - Test with default configuration

4. **Search existing issues** on GitHub

5. **Test in staging** before production

---

**Still stuck?** Open an [issue](https://github.com/fiduswriter/fiduswriter/issues) or look at the [forum](https://forum.fiduswriter.org/) with details.

**Last Updated:** December 8, 2025
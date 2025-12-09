# Advanced Configuration Guide

This guide covers advanced configuration options for Fidus Writer deployments.

## Overview

Fidus Writer is built on Django and can be configured through:
- Configuration file (`configuration.py`)
- Environment variables
- Django settings

## Configuration File Location

**Snap:**
```
/var/snap/fiduswriter/current/configuration.py
```

Edit with: `sudo fiduswriter.configure`

**Docker:**
Mount as volume or use environment variables in `docker-compose.yml`

**Development:**
```
fiduswriter/configuration.py
```

## Core Settings

### Site Configuration

```python
# Site identity
SITE_NAME = 'My Fidus Writer'
CONTACT_EMAIL = 'admin@example.com'
SITE_DOMAIN = 'fidus.example.com'

# Protocol (http or https)
ACCOUNT_DEFAULT_HTTP_PROTOCOL = 'https'
```

### Security Settings

```python
# Secret key (generate with: python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')
SECRET_KEY = 'your-very-long-random-secret-key-here'

# Debug mode (NEVER enable in production!)
DEBUG = False

# Allowed hosts
ALLOWED_HOSTS = [
    'yourdomain.com',
    'www.yourdomain.com',
    '192.168.1.100',
]

# CSRF trusted origins
CSRF_TRUSTED_ORIGINS = [
    'https://yourdomain.com',
    'https://www.yourdomain.com',
]

# Security headers
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
X_FRAME_OPTIONS = 'DENY'
```

### Database Configuration

#### PostgreSQL (Recommended for Production)

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'fiduswriter',
        'USER': 'fiduswriter',
        'PASSWORD': 'secure_password_here',
        'HOST': 'localhost',
        'PORT': '5432',
        'CONN_MAX_AGE': 600,  # Connection pooling
        'OPTIONS': {
            'connect_timeout': 10,
        }
    }
}
```

#### MySQL/MariaDB

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'fiduswriter',
        'USER': 'fiduswriter',
        'PASSWORD': 'secure_password_here',
        'HOST': 'localhost',
        'PORT': '3306',
        'OPTIONS': {
            'charset': 'utf8mb4',
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
        }
    }
}
```

#### SQLite (Development Only)

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': '/path/to/db.sqlite3',
    }
}
```

### Cache Configuration

#### Redis (Recommended)

```python
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'CONNECTION_POOL_KWARGS': {
                'max_connections': 50,
            },
            'COMPRESSOR': 'django_redis.compressors.zlib.ZlibCompressor',
        },
        'TIMEOUT': 300,
    }
}

# Use Redis for sessions
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'
```

#### Memcached

```python
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.memcached.PyMemcacheCache',
        'LOCATION': '127.0.0.1:11211',
    }
}
```

### Email Configuration

#### SMTP

```python
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'your-email@gmail.com'
EMAIL_HOST_PASSWORD = 'your-app-password'
DEFAULT_FROM_EMAIL = 'noreply@yourdomain.com'
SERVER_EMAIL = 'server@yourdomain.com'
```

#### Console (Development)

```python
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
```

#### Amazon SES

```python
EMAIL_BACKEND = 'django_ses.SESBackend'
AWS_ACCESS_KEY_ID = 'your-access-key'
AWS_SECRET_ACCESS_KEY = 'your-secret-key'
AWS_SES_REGION_NAME = 'us-east-1'
AWS_SES_REGION_ENDPOINT = 'email.us-east-1.amazonaws.com'
```

### File Storage

#### Local Storage (Default)

```python
MEDIA_ROOT = '/var/fiduswriter/media'
MEDIA_URL = '/media/'
STATIC_ROOT = '/var/fiduswriter/static'
STATIC_URL = '/static/'
```

#### Amazon S3

```python
DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
STATICFILES_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'

AWS_ACCESS_KEY_ID = 'your-access-key'
AWS_SECRET_ACCESS_KEY = 'your-secret-key'
AWS_STORAGE_BUCKET_NAME = 'fiduswriter-media'
AWS_S3_REGION_NAME = 'us-east-1'
AWS_S3_CUSTOM_DOMAIN = f'{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com'
AWS_S3_OBJECT_PARAMETERS = {
    'CacheControl': 'max-age=86400',
}
AWS_DEFAULT_ACL = 'public-read'
```

### Logging Configuration

```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': '/var/log/fiduswriter/app.log',
            'maxBytes': 1024 * 1024 * 15,  # 15MB
            'backupCount': 10,
            'formatter': 'verbose',
        },
        'mail_admins': {
            'level': 'ERROR',
            'class': 'django.utils.log.AdminEmailHandler',
            'filters': ['require_debug_false'],
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file', 'mail_admins'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.db.backends': {
            'handlers': ['console'],
            'level': 'INFO',  # Set to DEBUG to see SQL queries
            'propagate': False,
        },
    },
}
```

## Performance Optimization

### Connection Pooling

```python
# Database connection pooling
DATABASES['default']['CONN_MAX_AGE'] = 600

# Or use external pooler like PgBouncer
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'fiduswriter',
        'USER': 'fiduswriter',
        'PASSWORD': 'password',
        'HOST': 'localhost',
        'PORT': '6432',  # PgBouncer port
        'OPTIONS': {
            'sslmode': 'disable',
        },
    }
}
```

### Template Caching

```python
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'OPTIONS': {
            'loaders': [
                ('django.template.loaders.cached.Loader', [
                    'django.template.loaders.filesystem.Loader',
                    'django.template.loaders.app_directories.Loader',
                ]),
            ],
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]
```

### Compression

```python
# GZip middleware
MIDDLEWARE = [
    'django.middleware.gzip.GZipMiddleware',  # Add at top
    # ... other middleware
]

# Static files compression
STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.ManifestStaticFilesStorage'
```

## WebSocket Configuration

```python
# Channel layers for WebSocket support
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [('127.0.0.1', 6379)],
            'capacity': 1500,
            'expiry': 10,
        },
    },
}

# ASGI application
ASGI_APPLICATION = 'fiduswriter.asgi.application'
```

## Internationalization

```python
# Language and timezone
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_L10N = True
USE_TZ = True

# Available languages
LANGUAGES = [
    ('en', 'English'),
    ('de', 'German'),
    ('fr', 'French'),
    ('es', 'Spanish'),
]

# Locale paths
LOCALE_PATHS = [
    '/path/to/locale',
]
```

## Authentication

### Password Validation

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

### Session Configuration

```python
SESSION_COOKIE_AGE = 3600  # 1 hour
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_SAVE_EVERY_REQUEST = False
```

### Account Settings

```python
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_EMAIL_VERIFICATION = 'mandatory'
ACCOUNT_USERNAME_REQUIRED = False
ACCOUNT_AUTHENTICATION_METHOD = 'email'
ACCOUNT_SIGNUP_EMAIL_ENTER_TWICE = True
```

## Middleware Configuration

```python
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.locale.LocaleMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]
```

## Custom Settings

### Branding

```python
BRANDING_LOGO = 'png/logo.png'
FAVICON = 'favicon.ico'
CUSTOM_STYLESHEETS = ['css/custom.css']
```

### Footer Links

```python
FOOTER_LINKS = [
    {
        'text': 'Terms',
        'link': '/pages/terms/'
    },
    {
        'text': 'Privacy',
        'link': '/pages/privacy/'
    },
]
```

### Plugin Configuration

```python
INSTALLED_APPS = [
    # Core Django apps
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Fidus Writer apps
    'base',
    'document',
    'bibliography',
    'usermedia',
    'user',
    
    # Optional plugins
    'book',
    'ojs',
    'citation_api_import',
]
```

## Environment-Specific Configuration

### Development

```python
DEBUG = True
ALLOWED_HOSTS = ['*']
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Show SQL queries in development
LOGGING['loggers']['django.db.backends']['level'] = 'DEBUG'
```

### Staging

```python
DEBUG = False
ALLOWED_HOSTS = ['staging.example.com']
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
```

### Production

```python
DEBUG = False
ALLOWED_HOSTS = ['example.com', 'www.example.com']
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
```

## Using Environment Variables

```python
import os

DEBUG = os.environ.get('DJANGO_DEBUG', 'False') == 'True'
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '').split(',')

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'fiduswriter'),
        'USER': os.environ.get('DB_USER', 'fiduswriter'),
        'PASSWORD': os.environ.get('DB_PASSWORD'),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}
```

## Configuration Checklist

Before going to production:

- [ ] `DEBUG = False`
- [ ] Strong `SECRET_KEY` (50+ characters)
- [ ] Proper `ALLOWED_HOSTS` configured
- [ ] PostgreSQL database configured
- [ ] Redis cache enabled
- [ ] HTTPS/SSL enabled with valid certificate
- [ ] `SECURE_*` settings enabled
- [ ] Email properly configured
- [ ] Static files served by web server
- [ ] Logging configured
- [ ] Backups configured
- [ ] Monitoring set up

## Testing Configuration

```python
# Test configuration
python manage.py check --deploy
```

This command checks for common deployment issues.

## Related Documentation

- [Database Configuration](database.md)
- [Email Configuration](email.md)
- [Caching Configuration](caching.md)
- [SSL/HTTPS Setup](ssl.md)
- [Performance Optimization](performance.md)

---

**Last Updated:** December 8, 2025
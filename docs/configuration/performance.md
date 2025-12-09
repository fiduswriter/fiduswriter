# Performance Optimization Guide

Tips and techniques for optimizing Fidus Writer performance.

## Database Optimization

### Use PostgreSQL

Switch from SQLite to PostgreSQL for production:
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'fiduswriter',
        'CONN_MAX_AGE': 600,  # Connection pooling
    }
}
```

### Enable Query Optimization

```python
# Use select_related and prefetch_related
documents = Document.objects.select_related('owner').all()
```

### Add Database Indexes

```python
class Meta:
    indexes = [
        models.Index(fields=['created_at']),
        models.Index(fields=['owner', 'title']),
    ]
```

## Caching

### Enable Redis

```python
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
    }
}
```

### Template Caching

```python
TEMPLATES[0]['OPTIONS']['loaders'] = [
    ('django.template.loaders.cached.Loader', [
        'django.template.loaders.filesystem.Loader',
        'django.template.loaders.app_directories.Loader',
    ]),
]
```

## Static Files

### Use CDN

Configure CDN for static files delivery.

### Enable Compression

```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
```

## Application Server

### Use Gunicorn with Multiple Workers

```bash
gunicorn fiduswriter.wsgi:application \
    --workers 4 \
    --threads 2 \
    --worker-class gthread
```

### Configure Worker Timeout

```bash
gunicorn --timeout 120 fiduswriter.wsgi:application
```

## Monitoring

- Monitor database query performance
- Track memory usage
- Monitor response times
- Set up error tracking (Sentry)

## Related Documentation

- [Advanced Configuration](advanced.md)
- [Caching Configuration](caching.md)

---

**Last Updated:** December 8, 2025

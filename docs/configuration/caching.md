# Caching Configuration Guide

Configure caching to improve Fidus Writer performance.

## Redis Caching

### Install Redis

```bash
sudo apt install redis-server
```

### Configure Fidus Writer

```python
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
    }
}
```

### Use Redis for Sessions

```python
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'
```

## Memcached

```python
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.memcached.PyMemcacheCache',
        'LOCATION': '127.0.0.1:11211',
    }
}
```

## File-Based Caching

```python
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.filebased.FileBasedCache',
        'LOCATION': '/var/tmp/django_cache',
    }
}
```

## Template Caching

```python
TEMPLATES[0]['OPTIONS']['loaders'] = [
    ('django.template.loaders.cached.Loader', [
        'django.template.loaders.filesystem.Loader',
        'django.template.loaders.app_directories.Loader',
    ]),
]
```

## Clear Cache

```bash
python manage.py clear_cache
```

## Related Documentation

- [Performance Optimization](performance.md)
- [Advanced Configuration](advanced.md)

---

**Last Updated:** December 8, 2025

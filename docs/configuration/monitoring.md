# Monitoring and Logging Guide

Set up monitoring and logging for Fidus Writer.

## Logging

### Configure Logging

```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': '/var/log/fiduswriter/app.log',
            'maxBytes': 1024 * 1024 * 15,  # 15MB
            'backupCount': 10,
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['file'],
        'level': 'INFO',
    },
}
```

### View Logs

```bash
# Snap
sudo snap logs fiduswriter -f

# Docker
docker-compose logs -f fiduswriter

# File logs
tail -f /var/log/fiduswriter/app.log
```

## Monitoring Tools

### System Monitoring

- **htop** - CPU/memory usage
- **iotop** - Disk I/O
- **netstat** - Network connections

### Application Monitoring

- **Sentry** - Error tracking
- **New Relic** - Performance monitoring
- **Prometheus + Grafana** - Metrics and visualization

### Health Checks

Create health check endpoint:
```python
def health_check(request):
    return JsonResponse({'status': 'ok'})
```

## Performance Metrics

Monitor:
- Response times
- Database query performance
- Memory usage
- Error rates
- User activity

## Alerting

Set up alerts for:
- Server down
- High error rates
- Disk space low
- High response times

## Related Documentation

- [Performance Optimization](performance.md)
- [Troubleshooting](../troubleshooting.md)

---

**Last Updated:** December 8, 2025

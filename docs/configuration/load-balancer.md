# Load Balancer Setup

Guide for deploying Fidus Writer with load balancing for high availability and scalability.

## Overview

Use a load balancer to:
- Distribute traffic across multiple servers
- Improve performance and reliability
- Enable zero-downtime deployments
- Scale horizontally

## Architecture

```
               Load Balancer (NGINX/HAProxy)
                          |
        +-----------------+-----------------+
        |                 |                 |
    Server 1          Server 2          Server 3
   (Fidus Writer)   (Fidus Writer)   (Fidus Writer)
        |                 |                 |
        +-----------------+-----------------+
                          |
                   Shared Database
                   (PostgreSQL)
```

## Prerequisites

- Multiple Fidus Writer servers
- Shared PostgreSQL database
- Shared Redis instance
- Shared file storage (NFS or S3)

## NGINX Load Balancer

```nginx
upstream fiduswriter_backend {
    least_conn;
    server server1.example.com:8000 max_fails=3 fail_timeout=30s;
    server server2.example.com:8000 max_fails=3 fail_timeout=30s;
    server server3.example.com:8000 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    listen 443 ssl http2;
    server_name fiduswriter.example.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://fiduswriter_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Shared Storage

### Using NFS

Mount shared storage on all servers:
```bash
sudo apt install nfs-common
sudo mount server:/media /var/fiduswriter/media
```

### Using S3

Configure all servers to use S3:
```python
DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
AWS_STORAGE_BUCKET_NAME = 'fiduswriter-shared'
```

## Session Affinity

For WebSocket connections, enable session stickiness:

```nginx
upstream fiduswriter_backend {
    ip_hash;  # Session stickiness
    server server1.example.com:8000;
    server server2.example.com:8000;
}
```

## Health Checks

Add health check endpoint and monitoring.

## Related Documentation

- [Performance Optimization](performance.md)
- [Advanced Configuration](advanced.md)

---

**Last Updated:** December 8, 2025

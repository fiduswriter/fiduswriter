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
   (some docs)       (some docs)       (some docs)
        |                 |                 |
        +-----------------+-----------------+
                          |
                   Shared Database
                   (PostgreSQL)
```

Fidus Writer handles multi-server collaboration without Redis or a shared channel layer. Each document's live collaboration state is kept in-memory on exactly one server. Clients are routed to the correct server deterministically based on the document ID.

## How Routing Works

Fidus Writer assigns each document to a specific server using:

```python
server = PORTS[document_id % len(PORTS)]
```

All servers must share the same `PORTS` setting. When a client opens a document:

1. The initial HTTP response includes a `ws_base` URL pointing to the correct server for that document.
2. If a WebSocket connection lands on the wrong server, the server sends a `redirect` message and the client reconnects to the correct server.
3. All users editing the same document end up on the same server, so collaboration happens in-memory without needing Redis.

## Prerequisites

- Multiple Fidus Writer servers with the same `PORTS` configuration
- Shared PostgreSQL database
- Shared file storage (NFS or S3)
- Optional: shared Redis instance for Django caching/sessions (not required for collaboration)

## Configure PORTS

All servers must use the same `PORTS` list. Each entry can be a port number or a connection dict with internal and external addresses:

```python
# Simple: one process per port on the same host
PORTS = [8001, 8002, 8003]

# With external hostnames (useful behind a load balancer)
PORTS = [
    {"internal": 8001, "external": "fw1.example.com"},
    {"internal": 8002, "external": "fw2.example.com"},
    {"internal": 8003, "external": "fw3.example.com"},
]
```

## NGINX Load Balancer

```nginx
upstream fiduswriter_backend {
    least_conn;
    server fw1.example.com:8001 max_fails=3 fail_timeout=30s;
    server fw2.example.com:8002 max_fails=3 fail_timeout=30s;
    server fw3.example.com:8003 max_fails=3 fail_timeout=30s;
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

Note: Session stickiness (ip_hash) is **not required**. Fidus Writer redirects clients to the correct server automatically.

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

## Important Limitations

- A document's live session exists only in-memory on one server. If that server restarts, any open document sessions are lost (clients will reconnect and reload from the database).
- There is no automatic failover of live document sessions between servers.
- Redis is **not** used to share WebSocket state. It is only useful as an optional Django cache/session backend.

## Health Checks

Add health check endpoint and monitoring.

## Related Documentation

- [Performance Optimization](performance.md)
- [Advanced Configuration](advanced.md)

---

**Last Updated:** June 2026

# Docker Installation

This guide covers how to install and run Fidus Writer using Docker and Docker Compose.

## Prerequisites

- Docker 20.10 or later
- Docker Compose 1.29 or later (or Docker Compose V2)
- 4GB RAM minimum (8GB recommended)
- 10GB free disk space

## Quick Start

### Using Docker Hub Image

The simplest way to run Fidus Writer:

```bash
docker pull fiduswriter/fiduswriter:latest
docker run -d -p 8000:8000 --name fiduswriter fiduswriter/fiduswriter:latest
```

Access Fidus Writer at `http://localhost:8000`

### Using Docker Compose (Recommended)

Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  db:
    image: postgres:15
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: fiduswriter
      POSTGRES_USER: fiduswriter
      POSTGRES_PASSWORD: changeme
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped

  fiduswriter:
    image: fiduswriter/fiduswriter:latest
    ports:
      - "8000:8000"
    volumes:
      - media_files:/app/media
      - static_files:/app/static
    environment:
      - DATABASE_URL=postgresql://fiduswriter:changeme@db:5432/fiduswriter
      - REDIS_URL=redis://redis:6379/0
      - DJANGO_SECRET_KEY=change-this-to-a-random-secret-key
      - DJANGO_DEBUG=False
      - ALLOWED_HOSTS=localhost,127.0.0.1
    depends_on:
      - db
      - redis
    restart: unless-stopped

volumes:
  postgres_data:
  media_files:
  static_files:
```

Start the services:

```bash
docker-compose up -d
```

## Building from Source

### Clone Repository

```bash
git clone https://github.com/fiduswriter/fiduswriter.git
cd fiduswriter
```

### Build Docker Image

```bash
docker build -t fiduswriter:local .
```

### Run with Custom Image

Update `docker-compose.yml` to use your local image:

```yaml
  fiduswriter:
    image: fiduswriter:local
    # ... rest of configuration
```

## Initial Setup

### Create Admin User

After first startup, create an admin account:

```bash
docker-compose exec fiduswriter python manage.py createsuperuser
```

Follow the prompts to create your administrator account.

### Run Database Migrations

If needed, run migrations:

```bash
docker-compose exec fiduswriter python manage.py migrate
```

### Collect Static Files

```bash
docker-compose exec fiduswriter python manage.py collectstatic --noinput
```

## Configuration

### Environment Variables

Configure Fidus Writer using environment variables in `docker-compose.yml`:

#### Required Variables

```yaml
environment:
  # Database connection
  - DATABASE_URL=postgresql://user:password@host:port/database
  
  # Secret key for Django (generate a random string)
  - DJANGO_SECRET_KEY=your-secret-key-here
  
  # Allowed hosts (comma-separated)
  - ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
```

#### Optional Variables

```yaml
environment:
  # Debug mode (never enable in production!)
  - DJANGO_DEBUG=False
  
  # Email configuration
  - EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
  - EMAIL_HOST=smtp.example.com
  - EMAIL_PORT=587
  - EMAIL_USE_TLS=True
  - EMAIL_HOST_USER=your-email@example.com
  - EMAIL_HOST_PASSWORD=your-password
  - DEFAULT_FROM_EMAIL=noreply@example.com
  
  # Redis for caching and sessions
  - REDIS_URL=redis://redis:6379/0
  
  # Site configuration
  - SITE_NAME=My Fidus Writer
  - CONTACT_EMAIL=admin@example.com
  
  # Storage configuration (for S3, etc.)
  - USE_S3=False
  - AWS_ACCESS_KEY_ID=
  - AWS_SECRET_ACCESS_KEY=
  - AWS_STORAGE_BUCKET_NAME=
  - AWS_S3_REGION_NAME=us-east-1
```

### Custom Configuration File

For advanced configuration, mount a custom `configuration.py`:

```yaml
services:
  fiduswriter:
    volumes:
      - ./configuration.py:/app/configuration.py
      - media_files:/app/media
      - static_files:/app/static
```

Create `configuration.py` based on the example in the repository.

## SSL/HTTPS Setup

### Using Nginx Reverse Proxy

Create `nginx.conf`:

```nginx
upstream fiduswriter {
    server fiduswriter:8000;
}

server {
    listen 80;
    server_name your-domain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    client_max_body_size 100M;
    
    location / {
        proxy_pass http://fiduswriter;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    
    location /static/ {
        alias /app/static/;
    }
    
    location /media/ {
        alias /app/media/;
    }
}
```

Update `docker-compose.yml`:

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - ./ssl:/etc/nginx/ssl
      - static_files:/app/static:ro
      - media_files:/app/media:ro
    depends_on:
      - fiduswriter
    restart: unless-stopped
  
  fiduswriter:
    # Remove port mapping since nginx handles it
    expose:
      - "8000"
```

### Using Traefik (with Let's Encrypt)

```yaml
version: '3.8'

services:
  traefik:
    image: traefik:v2.10
    command:
      - "--api.dashboard=true"
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@example.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/acme.json"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./acme.json:/acme.json
    restart: unless-stopped

  fiduswriter:
    image: fiduswriter/fiduswriter:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.fiduswriter.rule=Host(`your-domain.com`)"
      - "traefik.http.routers.fiduswriter.entrypoints=websecure"
      - "traefik.http.routers.fiduswriter.tls.certresolver=letsencrypt"
      - "traefik.http.services.fiduswriter.loadbalancer.server.port=8000"
```

## Management Commands

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f fiduswriter

# Last 100 lines
docker-compose logs --tail=100 fiduswriter
```

### Execute Django Management Commands

```bash
docker-compose exec fiduswriter python manage.py <command>
```

Examples:

```bash
# Create superuser
docker-compose exec fiduswriter python manage.py createsuperuser

# Run migrations
docker-compose exec fiduswriter python manage.py migrate

# Clear cache
docker-compose exec fiduswriter python manage.py clear_cache

# Check for problems
docker-compose exec fiduswriter python manage.py check

# Open Django shell
docker-compose exec fiduswriter python manage.py shell
```

### Access Container Shell

```bash
docker-compose exec fiduswriter bash
```

## Backup and Restore

### Backup Database (PostgreSQL)

```bash
# Backup
docker-compose exec db pg_dump -U fiduswriter fiduswriter > backup-$(date +%Y%m%d).sql

# Or using docker
docker exec fiduswriter_db_1 pg_dump -U fiduswriter fiduswriter > backup-$(date +%Y%m%d).sql
```

### Restore Database

```bash
# Restore
docker-compose exec -T db psql -U fiduswriter fiduswriter < backup.sql
```

### Backup Media Files

```bash
docker run --rm -v fiduswriter_media_files:/media -v $(pwd):/backup \
  alpine tar czf /backup/media-backup-$(date +%Y%m%d).tar.gz -C /media .
```

### Restore Media Files

```bash
docker run --rm -v fiduswriter_media_files:/media -v $(pwd):/backup \
  alpine tar xzf /backup/media-backup.tar.gz -C /media
```

### Full Backup Script

Create `backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="./backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup database
docker-compose exec -T db pg_dump -U fiduswriter fiduswriter > "$BACKUP_DIR/database.sql"

# Backup media files
docker run --rm -v fiduswriter_media_files:/media -v $(pwd)/$BACKUP_DIR:/backup \
  alpine tar czf /backup/media.tar.gz -C /media .

# Backup configuration
cp docker-compose.yml "$BACKUP_DIR/"
cp configuration.py "$BACKUP_DIR/" 2>/dev/null || true

echo "Backup completed: $BACKUP_DIR"
```

Make executable and run:

```bash
chmod +x backup.sh
./backup.sh
```

## Updates and Maintenance

### Update to Latest Version

```bash
# Pull latest image
docker-compose pull fiduswriter

# Restart with new image
docker-compose up -d

# Run migrations if needed
docker-compose exec fiduswriter python manage.py migrate
```

### Restart Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart fiduswriter
```

### Stop Services

```bash
docker-compose stop
```

### Start Services

```bash
docker-compose start
```

### Remove Services (keeps volumes)

```bash
docker-compose down
```

### Remove Everything (including volumes)

```bash
docker-compose down -v
```

## Scaling

### Horizontal Scaling with Multiple Workers

```yaml
version: '3.8'

services:
  # ... db and redis services ...
  
  fiduswriter:
    image: fiduswriter/fiduswriter:latest
    volumes:
      - media_files:/app/media
      - static_files:/app/static
    environment:
      # ... environment variables ...
    depends_on:
      - db
      - redis
    deploy:
      replicas: 3  # Run 3 instances
    restart: unless-stopped
  
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - fiduswriter
```

Update `nginx.conf` for load balancing:

```nginx
upstream fiduswriter_backend {
    least_conn;
    server fiduswriter:8000 max_fails=3 fail_timeout=30s;
}
```

## Troubleshooting

### Container Won't Start

Check logs:
```bash
docker-compose logs fiduswriter
```

Common issues:
- Database not ready: Add healthcheck or wait-for-it script
- Port conflict: Change port mapping
- Permission issues: Check volume permissions

### Database Connection Errors

Ensure database is ready:

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

### Static Files Not Loading

Collect static files:

```bash
docker-compose exec fiduswriter python manage.py collectstatic --noinput
```

### Performance Issues

1. **Allocate more resources** in Docker settings
2. **Use PostgreSQL** instead of SQLite
3. **Enable Redis caching**
4. **Use volume mounts** for better I/O
5. **Limit container resources**:

```yaml
services:
  fiduswriter:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### Permission Issues

Fix volume permissions:

```bash
docker-compose exec fiduswriter chown -R www-data:www-data /app/media
```

## Security Best Practices

1. **Never use default passwords** - Change all passwords in production
2. **Use secrets management** - Store sensitive data in Docker secrets or env files
3. **Keep images updated** - Regularly pull and update images
4. **Use HTTPS** - Always use SSL/TLS in production
5. **Limit exposed ports** - Only expose necessary ports
6. **Run as non-root** - Use unprivileged user inside containers
7. **Scan for vulnerabilities** - Use `docker scan` or similar tools
8. **Network isolation** - Use Docker networks to isolate services

## Production Deployment Checklist

- [ ] Set `DJANGO_DEBUG=False`
- [ ] Use PostgreSQL database
- [ ] Configure Redis for caching
- [ ] Set secure `DJANGO_SECRET_KEY`
- [ ] Configure proper `ALLOWED_HOSTS`
- [ ] Enable HTTPS with valid SSL certificate
- [ ] Set up automated backups
- [ ] Configure email (SMTP)
- [ ] Set up monitoring and logging
- [ ] Configure firewall rules
- [ ] Use strong passwords for all services
- [ ] Regular security updates
- [ ] Test disaster recovery procedures

## Advanced Configuration

### Using Docker Secrets

```yaml
services:
  fiduswriter:
    secrets:
      - db_password
      - secret_key
    environment:
      - DATABASE_PASSWORD_FILE=/run/secrets/db_password
      - SECRET_KEY_FILE=/run/secrets/secret_key

secrets:
  db_password:
    file: ./secrets/db_password.txt
  secret_key:
    file: ./secrets/secret_key.txt
```

### Multi-Stage Build

Optimize image size with multi-stage builds (see `Dockerfile` in repository).

### Health Checks

```yaml
services:
  fiduswriter:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

## Next Steps

- [Configure login providers](../configuration/login-providers.md)
- [Set up monitoring and logging](../configuration/monitoring.md)
- [Load balancer configuration](../configuration/load-balancer.md)
- [Performance optimization](../configuration/performance.md)

## Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Fidus Writer GitHub](https://github.com/fiduswriter/fiduswriter)

---

**Last Updated:** December 8, 2025

**Note**: This guide assumes basic familiarity with Docker and Docker Compose. For Docker basics, see the official Docker documentation.
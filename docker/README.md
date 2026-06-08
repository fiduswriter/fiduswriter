# Fidus Writer Docker Image

Official Docker image for Fidus Writer, built from source on every release.

## Quick Start

```bash
docker pull ghcr.io/fiduswriter/fiduswriter:latest
```

## Tags

- `latest` - Latest release
- `4`, `4.1`, `4.1.4` - Version-specific tags

## Usage

```bash
docker run -d \
  -p 8000:8000 \
  -v ./data:/data \
  --name fiduswriter \
  ghcr.io/fiduswriter/fiduswriter:latest
```

## docker-compose

```yaml
services:
  fiduswriter:
    image: ghcr.io/fiduswriter/fiduswriter:latest
    ports:
      - "8000:8000"
    volumes:
      - ./data:/data
    restart: unless-stopped
    user: "999:999"
```

## Configuration

The container stores all data in `/data`:
- `configuration.py` - Django configuration
- `media/` - User uploads
- `fiduswriter.sql` - SQLite database (if used)

Mount a host directory to `/data` to persist data across container restarts.

## Creating a superuser

```bash
docker exec -it fiduswriter venv/bin/fiduswriter createsuperuser
```

# Fidus Writer Docker Image

Official Docker image for Fidus Writer, built from source on every release.

## Registries

Images are published to both registries on every release:

- **GitHub Container Registry**: `ghcr.io/fiduswriter/fiduswriter`
- **Docker Hub**: `fiduswriter/fiduswriter`

## Quick Start

### Using docker-compose (Recommended)

```bash
cd docker

# Copy environment file
cp .env.example .env

# Build and start
make up

# Create a superuser
make superuser

# View logs
make logs
```

Visit <http://localhost:8000>.

### Using docker run

```bash
# GitHub Container Registry
docker pull ghcr.io/fiduswriter/fiduswriter:latest

# Or Docker Hub
docker pull fiduswriter/fiduswriter:latest

docker run -d \
  -p 8000:8000 \
  -v ./volumes/data:/data \
  --name fiduswriter \
  ghcr.io/fiduswriter/fiduswriter:latest
```

### Building locally from source

```bash
cd docker
make build
make up
```

## Tags

- `latest` — Latest release
- `4`, `4.1`, `4.1.6` — Version-specific tags

## Configuration

The container stores all data in `/data`:

- `configuration.py` — Django configuration
- `media/` — User uploads
- `fiduswriter.sql` — SQLite database (if used)

Mount a host directory to `/data` to persist data across container restarts.

## Make commands

| Command | Description |
|---------|-------------|
| `make build` | Build the Docker image |
| `make up` | Start the container |
| `make down` | Stop and remove the container |
| `make logs` | Follow container logs |
| `make shell` | Open a shell inside the container |
| `make superuser` | Create a Django superuser |

## Version handling

The Makefile automatically reads the version from `../fiduswriter/version.txt`, so the Docker image is always built with the correct version — no manual editing required.

```bash
cd docker
make build   # Version is picked up from version.txt automatically
```

If you run `docker build` or `docker compose` directly, you can pass the version explicitly:

```bash
docker build --build-arg FIDUSWRITER_VERSION=$(cat ../fiduswriter/version.txt) -f docker/Dockerfile ..
```

## docker-compose.yml

```yaml
services:
  fiduswriter:
    build:
      context: ..
      dockerfile: docker/Dockerfile
      args:
        FIDUSWRITER_VERSION: ${FIDUSWRITER_VERSION:-4.1.6}
    volumes:
      - ./volumes/data:/data
    ports:
      - "8000:8000"
    container_name: fiduswriter
    restart: unless-stopped
    user: "999:999"
```

## Creating a superuser

```bash
docker exec -it fiduswriter venv/bin/fiduswriter createsuperuser
```

Or with docker-compose:

```bash
cd docker
make superuser
```

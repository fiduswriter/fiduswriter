# Upgrade Guide

Guide for upgrading Fidus Writer to newer versions.

## Before Upgrading

1. **Backup everything**
   - Database
   - Media files
   - Configuration

2. **Read release notes**
   - Check for breaking changes
   - Note new requirements

3. **Test in staging**
   - Never upgrade production directly

## Upgrade Methods

### Snap Installation

```bash
# Check for updates
sudo snap refresh --list

# Upgrade
sudo snap refresh fiduswriter

# Verify
snap info fiduswriter
```

### Docker Installation

```bash
# Backup first
docker-compose exec db pg_dump -U fiduswriter fiduswriter > backup.sql

# Pull new image
docker-compose pull

# Stop and restart
docker-compose down
docker-compose up -d

# Run migrations
docker-compose exec fiduswriter python manage.py migrate
```

### Source Installation

```bash
# Backup
pg_dump fiduswriter > backup.sql

# Update code
git pull origin main

# Activate venv
source venv/bin/activate

# Update dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Update frontend
python manage.py transpile
python manage.py collectstatic --noinput

# Restart service
sudo systemctl restart fiduswriter
```

## Post-Upgrade Tasks

1. **Run migrations**
   ```bash
   python manage.py migrate
   ```

2. **Update frontend**
   ```bash
   python manage.py transpile
   python manage.py collectstatic --noinput
   ```

3. **Clear cache**
   ```bash
   python manage.py clear_cache
   ```

4. **Test functionality**
   - Login
   - Create/edit document
   - Collaboration
   - Export

## Rolling Back

If upgrade fails:

### Snap

```bash
sudo snap revert fiduswriter
```

### Docker

```bash
docker-compose down
# Edit docker-compose.yml to use previous version
docker-compose up -d
# Restore database if needed
```

### Source

```bash
git checkout previous-version
pip install -r requirements.txt
psql fiduswriter < backup.sql
python manage.py migrate
```

## Version-Specific Notes

### Upgrading to 4.0

- Major UI changes
- New dependency requirements
- Database schema changes

### Upgrading from 3.x to 4.x

- Read migration guide
- Update configuration format
- Test plugin compatibility

## Automatic Updates

### Snap

Automatic updates enabled by default.

### Docker

Use Watchtower for automatic updates:

```yaml
services:
  watchtower:
    image: containrrr/watchtower
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: --interval 86400  # Daily checks
```

## Related Documentation

- [Migration Guide](migration.md)
- [Backup Guide](../configuration/backup.md)

---

**Last Updated:** December 8, 2025

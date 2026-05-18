# Backup and Restore Guide

Ensure data safety with regular backups.

## What to Back Up

1. **Database** - User data, documents, settings
2. **Media files** - Uploaded images and attachments
3. **Configuration** - settings files

## Database Backup

### PostgreSQL

```bash
# Backup
pg_dump -U fiduswriter fiduswriter > backup-$(date +%Y%m%d).sql

# With compression
pg_dump -U fiduswriter fiduswriter | gzip > backup-$(date +%Y%m%d).sql.gz

# Restore
psql -U fiduswriter fiduswriter < backup.sql
```

### MySQL

```bash
# Backup
mysqldump -u fiduswriter -p fiduswriter > backup-$(date +%Y%m%d).sql

# Restore
mysql -u fiduswriter -p fiduswriter < backup.sql
```

### SQLite

```bash
# Backup
cp db.sqlite3 backup-$(date +%Y%m%d).sqlite3

# Restore
cp backup.sqlite3 db.sqlite3
```

## Media Files Backup

```bash
# Backup
tar -czf media-backup-$(date +%Y%m%d).tar.gz /var/fiduswriter/media/

# Restore
tar -xzf media-backup.tar.gz -C /var/fiduswriter/
```

## Automated Backups

### Cron Job

```bash
crontab -e
```

Add:
```cron
# Daily backup at 2 AM
0 2 * * * /path/to/backup-script.sh
```

### Backup Script

```bash
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d)

# Database backup
pg_dump -U fiduswriter fiduswriter | gzip > "$BACKUP_DIR/db-$DATE.sql.gz"

# Media backup
tar -czf "$BACKUP_DIR/media-$DATE.tar.gz" /var/fiduswriter/media/

# Keep only last 7 days
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete
```

## Cloud Backups

### S3 Sync

```bash
aws s3 sync /backups/ s3://fiduswriter-backups/
```

## Related Documentation

- [Database Configuration](database.md)

---

**Last Updated:** December 8, 2025

# Migration Guide

Migrate Fidus Writer between different installation methods or upgrade from older versions.

## Migrating Between Installation Methods

### From Source to Snap

1. **Backup current installation**
   
   If using PostgreSQL:
   ```bash
   pg_dump fiduswriter > backup.sql
   tar -czf media-backup.tar.gz /path/to/media/
   ```
   
   If using MySQL:
   ```bash
   mysqldump -u fiduswriter -p fiduswriter > backup.sql
   tar -czf media-backup.tar.gz /path/to/media/
   ```

2. **Install Snap**
   ```bash
   sudo snap install fiduswriter
   ```

3. **Configure Snap MySQL settings** (optional - MySQL is already the default)
   
   The snap uses MySQL by default. If you need to customize settings:
   ```bash
   sudo fiduswriter.configure
   ```
   
   Verify or modify MySQL database configuration:
   ```python
   DATABASES = {
       'default': {
           'ENGINE': 'django.db.backends.mysql',
           'NAME': 'fiduswriter',
           'USER': 'fiduswriter',
           'PASSWORD': 'your_secure_password',
           'HOST': 'localhost',
           'PORT': '3306',
           'OPTIONS': {
               'charset': 'utf8mb4',
           }
       }
   }
   ```

4. **Restore database to snap's MySQL**
   ```bash
   sudo snap stop fiduswriter
   # The snap's MySQL will auto-initialize on first start
   sudo snap start fiduswriter
   
   # Restore your data
   mysql -u fiduswriter -p fiduswriter < backup.sql
   ```

5. **Restore media files**
   ```bash
   sudo tar -xzf media-backup.tar.gz -C /var/snap/fiduswriter/current/media/
   ```

### From Snap to Docker

1. **Backup from Snap**
   
   The snap uses MySQL by default:
   ```bash
   mysqldump -u fiduswriter -p fiduswriter > backup.sql
   tar -czf media-backup.tar.gz /var/snap/fiduswriter/current/media/
   ```
   
   If you configured the snap to use SQLite instead:
   ```bash
   sudo cp /var/snap/fiduswriter/current/db.sqlite3 backup.sqlite3
   tar -czf media-backup.tar.gz /var/snap/fiduswriter/current/media/
   ```

2. **Set up Docker**
   - Create docker-compose.yml with your preferred database (PostgreSQL or MySQL)
   - Start containers

3. **Restore to Docker**
   
   For PostgreSQL in Docker (if migrating from MySQL snap):
   ```bash
   # You'll need to convert the database or use Django's dumpdata/loaddata
   # See "Database Migration" section below
   ```
   
   For MySQL in Docker:
   ```bash
   docker-compose exec db mysql -u fiduswriter -p fiduswriter < backup.sql
   ```

## Database Migration

### SQLite to MySQL (for Snap)

If you configured your snap to use SQLite and want to switch to the default MySQL:

```bash
# Export from SQLite
sudo fiduswriter.dumpdata > data.json

# Configure snap to use MySQL (the default)
sudo fiduswriter.configure
# Change DATABASES back to MySQL configuration (see examples above)

# Run migrations and load data
sudo fiduswriter.migrate
sudo fiduswriter.loaddata data.json
```

**Note:** The snap uses MySQL by default, so this is only needed if you previously switched to SQLite.

### SQLite to PostgreSQL

Use Django's `dumpdata` and `loaddata`:

```bash
# Export from SQLite
python manage.py dumpdata > data.json

# Configure PostgreSQL
# Edit configuration.py

# Load into PostgreSQL
python manage.py migrate
python manage.py loaddata data.json
```

### MySQL to PostgreSQL (or vice versa)

Use Django's `dumpdata` and `loaddata` for cross-database migration:

```bash
# Export from source database
python manage.py dumpdata --natural-foreign --natural-primary > data.json

# Configure target database
# Edit configuration.py

# Load into target database
python manage.py migrate
python manage.py loaddata data.json
```

**Note:** The snap installation uses the built-in MySQL server by default for optimal production performance.

## Version Upgrades

### Major Version Upgrades

1. **Read release notes** for breaking changes
2. **Backup everything**
3. **Test in staging first**
4. **Run migrations**: `python manage.py migrate`
5. **Update frontend**: `python manage.py transpile`
6. **Collect static**: `python manage.py collectstatic`

### Minor Version Upgrades

Usually just:
```bash
git pull  # or snap refresh
python manage.py migrate
python manage.py transpile
```

## Rollback Procedure

If upgrade fails:

1. **Stop service**
2. **Restore database backup**
3. **Restore media files**
4. **Revert to previous version**
5. **Start service**

## Related Documentation

- [Upgrade Guide](upgrade.md)
- [Backup Guide](../configuration/backup.md)

---

**Last Updated:** December 8, 2025

# Database Configuration Guide

Configure Fidus Writer to use different database backends.

## Supported Databases

- **PostgreSQL** (Recommended for production)
- **MySQL/MariaDB**
- **SQLite** (Development only)

## PostgreSQL Setup

### Install PostgreSQL

```bash
sudo apt install postgresql postgresql-contrib
```

### Create Database and User

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE fiduswriter;
CREATE USER fiduswriter WITH PASSWORD 'secure_password';
ALTER ROLE fiduswriter SET client_encoding TO 'utf8';
ALTER ROLE fiduswriter SET default_transaction_isolation TO 'read committed';
ALTER ROLE fiduswriter SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE fiduswriter TO fiduswriter;
\q
```

### Configure Fidus Writer

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'fiduswriter',
        'USER': 'fiduswriter',
        'PASSWORD': 'secure_password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

### Run Migrations

```bash
python manage.py migrate
```

## MySQL/MariaDB Setup

### Install MySQL

```bash
sudo apt install mysql-server
```

### Create Database

```bash
sudo mysql
```

```sql
CREATE DATABASE fiduswriter CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'fiduswriter'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON fiduswriter.* TO 'fiduswriter'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Configure Fidus Writer

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'fiduswriter',
        'USER': 'fiduswriter',
        'PASSWORD': 'secure_password',
        'HOST': 'localhost',
        'PORT': '3306',
        'OPTIONS': {
            'charset': 'utf8mb4',
        },
    }
}
```

## Backup and Restore

### PostgreSQL

```bash
# Backup
pg_dump fiduswriter > backup.sql

# Restore
psql fiduswriter < backup.sql
```

### MySQL

```bash
# Backup
mysqldump fiduswriter > backup.sql

# Restore
mysql fiduswriter < backup.sql
```

## Related Documentation

- [Advanced Configuration](advanced.md)
- [Backup Guide](backup.md)

---

**Last Updated:** December 8, 2025

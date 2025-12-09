# Installation on Ubuntu using Virtual Environment

Install Fidus Writer from source on Ubuntu using a Python virtual environment.

## Prerequisites

- Ubuntu 20.04 or later
- Python 3.10+
- Node.js 18+
- PostgreSQL (recommended)

## System Dependencies

```bash
sudo apt update
sudo apt install -y \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    nodejs \
    npm \
    git \
    build-essential \
    libjpeg-dev \
    zlib1g-dev \
    gettext \
    postgresql \
    postgresql-contrib \
    libpq-dev
```

## Installation Steps

### 1. Clone Repository

```bash
git clone https://github.com/fiduswriter/fiduswriter.git
cd fiduswriter
```

### 2. Create Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
```

### 3. Install Python Dependencies

```bash
cd fiduswriter
pip install -r requirements.txt
```

### 4. Configure Database

Create PostgreSQL database:

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE fiduswriter;
CREATE USER fiduswriter WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE fiduswriter TO fiduswriter;
\q
```

### 5. Create Configuration

```bash
cp configuration.py-default configuration.py
nano configuration.py
```

Configure database:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'fiduswriter',
        'USER': 'fiduswriter',
        'PASSWORD': 'password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

### 6. Initialize Database

```bash
python manage.py migrate
python manage.py createsuperuser
```

### 7. Install Frontend Dependencies

```bash
python manage.py transpile
python manage.py collectstatic --noinput
```

### 8. Run Development Server

```bash
python manage.py runserver 0.0.0.0:8000
```

Access at http://localhost:8000

## Production Deployment

### Using Gunicorn

```bash
pip install gunicorn
gunicorn fiduswriter.wsgi:application --bind 0.0.0.0:8000
```

### Using Supervisor

Install supervisor:

```bash
sudo apt install supervisor
```

Create config `/etc/supervisor/conf.d/fiduswriter.conf`:

```ini
[program:fiduswriter]
command=/path/to/venv/bin/gunicorn fiduswriter.wsgi:application --bind 127.0.0.1:8000
directory=/path/to/fiduswriter/fiduswriter
user=www-data
autostart=true
autorestart=true
```

### Configure NGINX

See [Snap Installation Guide](snap.md#nginx-reverse-proxy-setup) for NGINX configuration.

## Updates

```bash
git pull
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py transpile
python manage.py collectstatic --noinput
# Restart gunicorn/supervisor
```

## Related Documentation

- [Developer Installation](developer-install.md)
- [Advanced Configuration](../configuration/advanced.md)

---

**Last Updated:** December 8, 2025

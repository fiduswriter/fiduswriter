# Fidus Writer Quick Start Guide

Get up and running with Fidus Writer in minutes!

## Choose Your Installation Method

### Option 1: Ubuntu Snap (Recommended for Ubuntu)

**Installation:**
```bash
sudo snap install fiduswriter
```

**Create Admin User:**
```bash
sudo fiduswriter.setup
```

**Access:**
Open your browser to `http://localhost:4386`

**Documentation:** [Snap Installation Guide](installation/snap.md)

---

### Option 2: Docker (Cross-Platform)

**Installation:**
```bash
# Pull the image
docker pull fiduswriter/fiduswriter:latest

# Run the container
docker run -d -p 8000:8000 --name fiduswriter fiduswriter/fiduswriter:latest

# Create admin user
docker exec -it fiduswriter python manage.py createsuperuser
```

**Access:**
Open your browser to `http://localhost:8000`

**Documentation:** [Docker Installation Guide](installation/docker.md)

---

### Option 3: Docker Compose (Production-Ready)

**Create docker-compose.yml:**
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

**Run:**
```bash
# Start services
docker-compose up -d

# Create admin user
docker-compose exec fiduswriter python manage.py createsuperuser

# View logs
docker-compose logs -f fiduswriter
```

**Access:**
Open your browser to `http://localhost:8000`

**Documentation:** [Docker Installation Guide](installation/docker.md)

---

### Option 4: Development Setup

**For contributors and plugin developers:**

```bash
# Clone repository
git clone https://github.com/YOUR-USERNAME/fiduswriter.git
cd fiduswriter

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
cd fiduswriter
pip install -r requirements.txt
pip install -r dev-requirements.txt
pip install -r test-requirements.txt

# Set up database
python manage.py migrate
python manage.py createsuperuser

# Install and build frontend
python manage.py transpile

# Run development server
python manage.py runserver
```

**Access:**
Open your browser to `http://localhost:8000`

**Documentation:** [Developer Installation Guide](installation/developer-install.md)

---

## First Steps After Installation

### 1. Log In

Navigate to `http://localhost:8000` and log in with your admin credentials.

### 2. Create Your First Document

1. Click **"Documents"** in the navigation
2. Click **"Create New Document"**
3. Enter a title
4. Start writing!

### 3. Explore Features

- **Collaborative Editing**: Invite collaborators to edit together
- **Citations**: Add references using the citation tool
- **Math Formulas**: Insert LaTeX formulas
- **Export**: Export to PDF, EPUB, HTML, and more
- **Templates**: Use or create custom document templates

## Common Tasks

### Adding Users

```bash
# Snap
sudo fiduswriter.manage createsuperuser

# Docker
docker-compose exec fiduswriter python manage.py createsuperuser

# Development
python manage.py createsuperuser
```

### Viewing Logs

```bash
# Snap
sudo snap logs fiduswriter -f

# Docker
docker-compose logs -f fiduswriter

# Development
# Logs appear in terminal where runserver is running
```

### Restarting Service

```bash
# Snap
sudo snap restart fiduswriter

# Docker
docker-compose restart fiduswriter

# Development
# Ctrl+C to stop, then run again: python manage.py runserver
```

### Updating Fidus Writer

```bash
# Snap (automatic updates enabled by default)
sudo snap refresh fiduswriter

# Docker
docker-compose pull
docker-compose up -d

# Development
git pull upstream main
pip install -r requirements.txt
python manage.py migrate
python manage.py transpile
```

## Configuration

### Basic Configuration

Edit the configuration file (location depends on installation method):

- **Snap**: `/var/snap/fiduswriter/current/configuration.py`
- **Docker**: Use environment variables in `docker-compose.yml`
- **Development**: `fiduswriter/configuration.py`

### Essential Settings

```python
# Site information
SITE_NAME = 'My Fidus Writer'
CONTACT_EMAIL = 'admin@example.com'

# Allowed hosts (important for production!)
ALLOWED_HOSTS = ['yourdomain.com', 'www.yourdomain.com']

# Database (PostgreSQL recommended for production)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'fiduswriter',
        'USER': 'fiduswriter',
        'PASSWORD': 'your_password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}

# Email configuration
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.example.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'your-email@example.com'
EMAIL_HOST_PASSWORD = 'your-password'
```

**Documentation:** [Configuration Guides](configuration/README.md)

## Troubleshooting

### Can't Access Fidus Writer

- **Check if service is running**: `sudo snap services` (Snap) or `docker-compose ps` (Docker)
- **Check port**: Ensure port 8000 is not blocked by firewall
- **Check logs**: Look for errors in service logs

### Login Issues

- **Create superuser**: Run the createsuperuser command again
- **Reset password**: Use Django's password reset functionality
- **Check database**: Ensure database connection is working

### Performance Issues

- **Use PostgreSQL**: Switch from SQLite to PostgreSQL for better performance
- **Enable Redis**: Configure Redis for caching and session storage
- **Check resources**: Ensure adequate CPU and RAM allocation

### Database Errors

- **Run migrations**: `python manage.py migrate`
- **Check credentials**: Verify database connection settings
- **Restart database**: Restart the database service

## Next Steps

### For Users

- [Configuration Guides](configuration/README.md) - Customize your installation
- [Branding Guide](configuration/branding.md) - Add your organization's logo
- [Login Providers](configuration/login-providers.md) - Set up OAuth/SAML

### For Developers

- [Contributing Guidelines](contributing.md) - Learn how to contribute
- [Development Documentation](development/README.md) - Explore development resources
- [Plugin Development](development/plugin-development.md) - Create custom plugins

## Getting Help

- **Documentation**: [Full Documentation](README.md)
- **Issues**: [GitHub Issues](https://github.com/fiduswriter/fiduswriter/issues)
- **Discussions**: [GitHub Discussions](https://github.com/fiduswriter/fiduswriter/discussions)
- **Website**: [fiduswriter.org](https://fiduswriter.org)

## System Requirements

**Minimum:**
- 2 CPU cores
- 2 GB RAM
- 5 GB disk space

**Recommended:**
- 4+ CPU cores
- 4+ GB RAM
- 20+ GB disk space
- PostgreSQL database
- Redis for caching

## Security Checklist

Before deploying to production:

- [ ] Change default passwords
- [ ] Set secure `SECRET_KEY`
- [ ] Set `DEBUG = False`
- [ ] Configure `ALLOWED_HOSTS`
- [ ] Enable HTTPS/SSL
- [ ] Set up regular backups
- [ ] Configure firewall
- [ ] Keep system updated
- [ ] Review security settings

**Documentation:** [SSL/HTTPS Setup](configuration/ssl.md)

---

**Last Updated:** December 8, 2025

**Questions?** Open an [issue](https://github.com/fiduswriter/fiduswriter/issues) or [discussion](https://github.com/fiduswriter/fiduswriter/discussions)!

**Want more details?** See the [complete documentation](README.md).
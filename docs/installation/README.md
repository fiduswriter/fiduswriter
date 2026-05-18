# Installation Guides

This section provides comprehensive installation guides for Fidus Writer. Choose the method that best fits your use case and technical expertise.

## Quick Start

For most users, we recommend:

- **Ubuntu Users**: [Snap Installation](snap.md) - Easiest way to get started
- **Cross-Platform**: [Docker Installation](docker.md) - Works on any platform with Docker

## Installation Methods

### Easy Setup (Recommended for Production)

#### [Running on Ubuntu Snap](snap.md)
- ✅ Easiest installation method
- ✅ Automatic updates
- ✅ Isolated from system packages
- ✅ Best for production deployments on Ubuntu

**Quick Start:**
```bash
sudo snap install fiduswriter
```

#### [Docker Installation](docker.md)
- ✅ Cross-platform compatibility
- ✅ Easy deployment and scaling
- ✅ Isolated environment
- ✅ Best for containerized environments

**Quick Start:**
```bash
docker pull fiduswriter/fiduswriter
docker run -p 8000:8000 fiduswriter/fiduswriter
```

### Advanced Setup (For Developers)

#### [Ubuntu Virtual Environment Installation](ubuntu-virtualenv.md)
- 🔧 For Fidus Writer core developers
- 🔧 Direct access to source code
- 🔧 Custom configuration options
- 🔧 Required for contributing to Fidus Writer

#### [Developer Installation](developer-install.md)
- 🔧 Complete development environment setup
- 🔧 Includes testing and debugging tools
- 🔧 Plugin development setup
- 🔧 Best for contributing code or creating plugins

## System Requirements

### Minimum Requirements

- **CPU**: 2 cores
- **RAM**: 2 GB
- **Storage**: 5 GB free space
- **OS**: Ubuntu 20.04+, Debian 10+, or any system with Docker

### Recommended for Production

- **CPU**: 4+ cores
- **RAM**: 4+ GB
- **Storage**: 20+ GB free space (depending on usage)
- **Database**: PostgreSQL 12+ or MySQL 8+ (for production)
- **OS**: Ubuntu 22.04 LTS or later

### Supported Platforms

- **Linux**: Ubuntu, Debian, Fedora, CentOS (via snap or source)
- **macOS**: Via Docker or source installation
- **Windows**: Via Docker or WSL2

## Database Support

Fidus Writer supports multiple database backends:

- **SQLite** (default) - Good for development and small deployments
- **PostgreSQL** (recommended for production) - Best performance and features
- **MySQL/MariaDB** - Also supported (MySQL included with snap installation)

**Note:** The snap installation includes a MySQL server, making it easy to use MySQL for production deployments.

See the [Advanced Configuration](../configuration/advanced.md) guide for database setup.

## Web Server Support

For production deployments, Fidus Writer works with:

- **Apache** with mod_wsgi
- **Nginx** with uWSGI or Gunicorn
- **Load balancers** - See [Load Balancer Setup](../configuration/load-balancer.md)

## Next Steps

After installation:

1. **Initial Setup**: Configure admin account and basic settings
2. **Configuration**: See [Configuration Guides](../configuration/) for customization
3. **Security**: Review security best practices (SSL/TLS, firewalls, etc.)
4. **Backup**: Set up regular backups of your data
5. **Updates**: Configure automatic or manual update procedures

## Troubleshooting

### Common Issues

#### Installation fails with permission errors
```bash
# Ensure you have proper permissions
sudo chown -R $USER:$USER /path/to/fiduswriter
```

#### Port 8000 already in use
```bash
# Change the port in configuration or kill the process using it
sudo lsof -i :8000
```

#### Database connection errors
- Check database credentials in configuration
- Ensure database service is running
- Verify network connectivity to database

#### Missing dependencies
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install python3-dev python3-pip nodejs npm

# For Docker, rebuild the image
docker build -t fiduswriter/fiduswriter .
```

### Getting Help

If you encounter issues not covered here:

- Check the [FAQ](../faq.md)
- Search [GitHub Issues](https://github.com/fiduswriter/fiduswriter/issues)
- Ask in [GitHub Discussions](https://github.com/fiduswriter/fiduswriter/discussions)

## Upgrade Guides

- [Upgrading from previous versions](upgrade.md)
- [Migration from development to production](migration.md)

## Platform-Specific Notes

### Ubuntu/Debian
- Use snap for easiest installation
- apt packages available for dependencies

### macOS
- Docker is recommended
- Homebrew can be used for dependencies in source install

### Windows
- Docker Desktop or WSL2 recommended
- Native Windows installation not officially supported

## Security Considerations

- Always use HTTPS in production (see [SSL/TLS Setup](../configuration/ssl.md))
- Keep system and dependencies updated
- Follow Django security best practices
- Configure firewall rules appropriately
- Use strong passwords for admin accounts
- Regular security audits recommended

## Performance Tuning

For large deployments:

- Use PostgreSQL instead of SQLite
- Configure Redis for session storage and caching
- Use CDN for static files
- Enable compression in web server
- Consider horizontal scaling with load balancer

See [Performance Optimization](../configuration/performance.md) for details.

---

**Last Updated:** December 8, 2025

**Need Help?** If you're unsure which installation method to choose, start with [Snap](snap.md) on Ubuntu or [Docker](docker.md) on other platforms.
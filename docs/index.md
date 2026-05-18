# Fidus Writer Documentation

Welcome to the Fidus Writer documentation! This comprehensive guide covers everything you need to know about installing, configuring, and developing with Fidus Writer.

## 🚀 Quick Start

Choose your installation method:

- **Ubuntu Users**: [Install via Snap](installation/snap.md) (Recommended)
- **All Platforms**: [Install with Docker](installation/docker.md)
- **Developers**: [Development Setup](installation/developer-install.md)

## 📚 Documentation Sections

### Installation

Get Fidus Writer up and running:

- [Installation Overview](installation/README.md)
- [Ubuntu Snap Installation](installation/snap.md) - Easiest method for Ubuntu
- [Docker Installation](installation/docker.md) - Cross-platform containerized deployment
- [Developer Installation](installation/developer-install.md) - Set up development environment

### Configuration

Configure and customize your Fidus Writer installation:

- [Configuration Overview](configuration/README.md)
- Login Providers - OAuth/SAML authentication setup
- Branding - Add your organization's logo and styling
- Load Balancer - Set up load balancing for production
- Advanced Configuration - Environment variables and Django settings

### Development

Resources for contributors and plugin developers:

- [Development Overview](development/README.md)
- [Contributing Guidelines](contributing.md) - How to contribute to Fidus Writer
- [Developer Installation](installation/developer-install.md) - Set up your dev environment
- [Devel App - Dependency Management](development/devel-app.md) - Automated dependency updates
- [Devel App Setup Guide](development/devel-setup.md) - Complete setup for devel tools
- Plugin Development - Create custom plugins
- Software Structure - Understanding the architecture
- Testing Guide - Running and writing tests

## 🎯 Common Tasks

### For Users

**Installing Fidus Writer:**
1. Choose your [installation method](installation/README.md)
2. Follow the step-by-step guide
3. Access at `http://localhost:8000`

**Configuring Fidus Writer:**
1. Review [configuration options](configuration/README.md)
2. Edit `configuration.py` or use environment variables
3. Restart the service to apply changes

### For Developers

**Contributing to Fidus Writer:**
1. Read the [Contributing Guidelines](contributing.md)
2. Set up your [development environment](installation/developer-install.md)
3. Create a feature branch
4. Make your changes and add tests
5. Submit a pull request

**Developing Plugins:**
1. Set up [development environment](installation/developer-install.md)
2. Read the plugin development guide
3. Create your plugin
4. Test and document your plugin

## 🔧 Development Tools

### Dependency Management

Fidus Writer includes automated dependency management:

```bash
# Check for outdated dependencies
python manage.py check_dependencies

# Update all dependencies
python manage.py update_dependencies
```

See [Devel App Documentation](development/devel-app.md) for details.

### Testing

```bash
# Run all tests
python manage.py test

# Run specific tests
python manage.py test document.tests.test_editor

# Run with coverage
coverage run --source='.' manage.py test
coverage report
```

## 📖 About Fidus Writer

Fidus Writer is an online collaborative editor especially made for academics who need to use citations and/or formulas. The editor focuses on the content rather than the layout, so that with the same text, you can later on publish it in multiple ways: On a website, as a printed book, or as an ebook.

### Key Features

- **Collaborative Editing** - Real-time collaboration with multiple users
- **Academic Writing** - Built-in citation and bibliography management
- **Mathematical Formulas** - Support for LaTeX math equations
- **Multiple Export Formats** - Export to PDF, EPUB, HTML, and more
- **Track Changes** - See who changed what and when
- **Comments and Discussions** - Discuss changes with collaborators
- **Template System** - Customize document templates
- **Plugin Architecture** - Extend functionality with plugins

## 🆘 Getting Help

### Documentation

- [Installation Guides](installation/README.md)
- [Configuration Guides](configuration/README.md)
- [Development Documentation](development/README.md)
- [Contributing Guidelines](contributing.md)

### Community Support

- **Issues**: [Report bugs or request features](https://github.com/fiduswriter/fiduswriter/issues)
- **Discussions**: [Ask questions and share ideas](https://github.com/fiduswriter/fiduswriter/discussions)
- **Website**: [fiduswriter.org](https://fiduswriter.org)

### Contributing

We welcome contributions! Here's how you can help:

- 🐛 **Report bugs** - Help us identify and fix issues
- ✨ **Suggest features** - Share your ideas for improvements
- 💻 **Contribute code** - Submit pull requests
- 📝 **Improve documentation** - Help make our docs better
- 🌍 **Translate** - Help make Fidus Writer accessible worldwide

See [Contributing Guidelines](contributing.md) to get started.

## 📋 Requirements

### Minimum Requirements

- **CPU**: 2 cores
- **RAM**: 2 GB
- **Storage**: 5 GB
- **OS**: Ubuntu 20.04+, or any system with Docker

### Recommended for Production

- **CPU**: 4+ cores
- **RAM**: 4+ GB
- **Storage**: 20+ GB
- **Database**: PostgreSQL 12+
- **OS**: Ubuntu 22.04 LTS

## 🔒 Security

Fidus Writer takes security seriously:

- Regular security updates
- HTTPS/SSL support
- CSRF protection
- SQL injection prevention
- XSS protection
- Secure session management

For security issues, please see our [Contributing Guidelines](contributing.md) for responsible disclosure.

## 📜 License

Fidus Writer is licensed under the **GNU AFFERO GENERAL PUBLIC LICENSE Version 3**.

See the [LICENSE](../LICENSE) file for details.

## 👥 Credits

Fidus Writer is developed and maintained by:

- **Johannes Wilm** - Project Lead
- **Many Contributors** - See [AUTHORS](../AUTHORS) file

Special thanks to all contributors who have helped make Fidus Writer better!

## 🔗 Links

- **Website**: [fiduswriter.org](https://fiduswriter.org)
- **GitHub**: [github.com/fiduswriter/fiduswriter](https://github.com/fiduswriter/fiduswriter)
- **Snap Store**: [snapcraft.io/fiduswriter](https://snapcraft.io/fiduswriter)
- **Issues**: [GitHub Issues](https://github.com/fiduswriter/fiduswriter/issues)
- **Discussions**: [GitHub Discussions](https://github.com/fiduswriter/fiduswriter/discussions)

## 🗺️ Documentation Status

This documentation is actively maintained and regularly updated. The documentation has been recently reorganized and consolidated from various sources including the GitHub wiki.

**Current Status:**
- ✅ Core documentation structure created
- ✅ Installation guides completed
- ✅ Configuration guides in progress
- ⏳ Migrating content from GitHub wiki
- ⏳ Creating additional guides and tutorials

See [MIGRATION_TODO.md](MIGRATION_TODO.md) for the complete migration status.

---

**Last Updated**: December 8, 2025

**Questions?** Open an [issue](https://github.com/fiduswriter/fiduswriter/issues) or start a [discussion](https://github.com/fiduswriter/fiduswriter/discussions)!
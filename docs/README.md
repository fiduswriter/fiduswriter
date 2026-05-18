# Fidus Writer Documentation

Welcome to the Fidus Writer documentation! This documentation covers installation, configuration, development, and contributing to Fidus Writer.

## About Fidus Writer

Fidus Writer is an online collaborative editor especially made for academics who need to use citations and/or formulas. The editor focuses on the content rather than the layout, so that with the same text, you can later on publish it in multiple ways: On a website, as a printed book, or as an ebook. In each case, you can choose from a number of layouts that are adequate for the medium of choice.

[![Fidus Writer](https://snapcraft.io/fiduswriter/badge.svg)](https://snapcraft.io/fiduswriter)
[![Coverage Status](https://coveralls.io/repos/github/fiduswriter/fiduswriter/badge.svg?branch=main)](https://coveralls.io/github/fiduswriter/fiduswriter?branch=main)

## Documentation Sections

### 📦 Installation

Choose the installation method that best suits your needs:

**Easy Setup:**
- [Running on Ubuntu Snap](installation/snap.md) - Easiest way to get started on Ubuntu
- [Docker Installation](installation/docker.md) - Run Fidus Writer in containers

**Advanced Setup:**
- [Ubuntu Virtual Environment](installation/ubuntu-virtualenv.md) - For Fidus Writer developers
- [Developer Installation](installation/developer-install.md) - Set up a development environment

### ⚙️ Configuration

Configure Fidus Writer for your needs:

- [Setting up Login Providers](configuration/login-providers.md) - OAuth/SAML authentication
- [Branding and Customization](configuration/branding.md) - Add your logo and customize appearance
- [Load Balancer Setup](configuration/load-balancer.md) - Deploy with load balancing
- [Footer Links](configuration/footer-links.md) - Customize footer links
- [Advanced Configuration](configuration/advanced.md) - Environment variables and settings

### 🛠️ Development

Resources for developers and contributors:

- [Development Environment Setup](development/developer-install.md) - Get started with development
- [Devel App - Dependency Management](development/devel-app.md) - Automated dependency updates
- [Devel App Setup Guide](development/devel-setup.md) - Complete setup for dependency management
- [Plugin Development](development/plugin-development.md) - Create plugins for Fidus Writer
- [Software Structure](development/software-structure.md) - Understanding the architecture
- [Testing Guide](development/testing.md) - Running and writing tests

### 🤝 Contributing

- [Contributing Guidelines](contributing.md) - How to contribute to Fidus Writer
- [Code of Conduct](code-of-conduct.md) - Community guidelines

## Quick Start

### Using Snap (Ubuntu)

```bash
sudo snap install fiduswriter
```

### Using Docker

```bash
docker pull fiduswriter/fiduswriter
docker run -p 8000:8000 fiduswriter/fiduswriter
```

Then visit `http://localhost:8000` in your browser.

## Getting Help

- **Issues**: Report bugs or request features on [GitHub Issues](https://github.com/fiduswriter/fiduswriter/issues)
- **Discussions**: Join the conversation on [GitHub Discussions](https://github.com/fiduswriter/fiduswriter/discussions)
- **Website**: Visit [fiduswriter.org](https://fiduswriter.org) for more information

## License

Fidus Writer is licensed under the GNU AFFERO GENERAL PUBLIC LICENSE Version 3. See the [LICENSE](../LICENSE) file for details.

## Credits

Fidus Writer is developed and maintained by Johannes Wilm and [many contributors](../AUTHORS).

---

**Last Updated:** December 8, 2025
# Frequently Asked Questions (FAQ)

## General Questions

### What is Fidus Writer?

Fidus Writer is an online collaborative editor especially made for academics who need to use citations and/or formulas. The editor focuses on the content rather than the layout, so that with the same text, you can later on publish it in multiple ways: On a website, as a printed book, or as an ebook.

### Is Fidus Writer free?

Yes, Fidus Writer is free and open source software licensed under the GNU AFFERO GENERAL PUBLIC LICENSE Version 3. You can use, modify, and distribute it freely according to the license terms.

### Who develops Fidus Writer?

Fidus Writer is primarily developed by Johannes Wilm with contributions from many community members. See the [AUTHORS](../AUTHORS) file for a complete list of contributors.

### What makes Fidus Writer different from other editors?

- **Academic Focus**: Built-in citation and bibliography management
- **Collaborative**: Real-time collaboration with multiple users
- **Format Agnostic**: Focus on content, not layout
- **Multiple Output Formats**: Export to PDF, EPUB, HTML, LaTeX, DOCX, and more
- **Open Source**: Free software you can host yourself
- **Math Support**: Built-in LaTeX formula support with MathLive
- **Track Changes**: See who changed what and when

## Installation Questions

### Which installation method should I choose?

- **Snap (Ubuntu)**: Easiest for production on Ubuntu - [Guide](installation/snap.md)
- **Docker**: Best for cross-platform or containerized deployments - [Guide](installation/docker.md)
- **Development**: For contributors and plugin developers - [Guide](installation/developer-install.md)

### What are the system requirements?

**Minimum:**
- 2 CPU cores
- 2 GB RAM
- 5 GB disk space
- Ubuntu 20.04+ or Docker

**Recommended:**
- 4+ CPU cores
- 4+ GB RAM
- 20+ GB disk space
- PostgreSQL database
- Ubuntu 22.04 LTS

### Can I install Fidus Writer on Windows?

You can try make it work using Docker or the Windows Subsystem for Linux (WSL2). Native Windows installation is not officially supported.

### Can I install Fidus Writer on macOS?

It should work. Use Docker for the easiest setup. You can also install from source using Homebrew for dependencies. This setup has not been tested, so use at your own risk.

### Do I need a domain name?

Not for local use, but for production deployments accessible from the internet, a domain name is recommended (though you can use IP addresses).

### Can I run Fidus Writer without an internet connection?

Yes, once installed, Fidus Writer can run completely offline on your local network.

## Configuration Questions

### How do I change the port Fidus Writer runs on?

**Snap:** Port 4386 is used by default. Configure via `sudo fiduswriter.configure`

**Docker:** Change port mapping in `docker-compose.yml`: `ports: - "8080:8000"`

**Development:** Run with `python manage.py runserver 8080`

### How do I enable HTTPS?

See the [SSL/HTTPS Setup Guide](configuration/ssl.md) for detailed instructions. We recommend using:
- Let's Encrypt with Certbot (free)
- NGINX or Apache reverse proxy
- Always use HTTPS in production

### How do I add my organization's logo?

See the [Branding Guide](configuration/branding.md). Quick steps:
1. Copy logo to static directory
2. Set `BRANDING_LOGO` in configuration
3. Restart service

### How do I enable social login (Google, GitHub, etc.)?

See the [Login Providers Guide](configuration/login-providers.md) for step-by-step instructions for each provider.

### Can I use my own email server?

Yes, configure SMTP settings in your configuration file. See the [Email Configuration Guide](configuration/email.md).

### How do I change the site name?

Edit your configuration file and set:
```python
SITE_NAME = 'Your Site Name'
CONTACT_EMAIL = 'admin@example.com'
```

### Should I use SQLite or PostgreSQL?

- **SQLite**: Fine for development and single-user testing
- **PostgreSQL**: Recommended for production with multiple users
- **MySQL**: Also supported if you prefer

For production, always use PostgreSQL for better performance and reliability.

## Usage Questions

### How many users can collaborate on a document?

Multiple users can collaborate in real-time. The exact number depends on your server resources, but typically 5-10 simultaneous editors per document works well.

### Can I import existing documents?

Yes, Fidus Writer supports importing:
- DOCX (Microsoft Word)
- ODT (OpenDocument)
- A number of other formats by means of Pandoc: HTML, Markdown, LaTeX, Plain text, etc.

### What export formats are supported?

- PDF (By means of Vivliostyle)
- EPUB (ebook format)
- HTML
- LaTeX
- DOCX (Microsoft Word)
- ODT (OpenDocument)
- JATS XML (for academic publishing)
- A number of other formats by means of Pandoc: HTML, Markdown, LaTeX, Plain text, etc.

### Can I use custom citation styles?

Yes, Fidus Writer uses Citation Style Language (CSL) to show citations in the browser. You can use any of the 9,000+ citation styles from the CSL repository or create your own.

### Does Fidus Writer support templates?

Yes, you can create custom document templates and configure which templates are available to users.

### Can I export with my institution's branding?

Yes, export templates can be customized with your institution's logo, colors, and styling.

### How do I add citations and bibliographies?

Fidus Writer has a built-in bibliography manager. You can:
- Add references manually
- Import from BibTeX
- Import from various citation APIs
- Use the citation plugin to insert citations into your document

## Technical Questions

### What technologies does Fidus Writer use?

- **Backend**: Python, Django
- **Frontend**: JavaScript, ProseMirror (editor)
- **Database**: PostgreSQL, MySQL, or SQLite
- **Math**: MathLive (LaTeX rendering)
- **Citations**: Citation Style Language (CSL), BibLaTeX
- **Real-time**: WebSockets (Django Channels)

### Can I develop plugins for Fidus Writer?

Yes! See the [Plugin Development Guide](development/plugin-development.md) for details.

### Is there an API?

Yes, Fidus Writer provides REST APIs for various operations. See the [API Documentation](development/api.md) for details.

### How do I contribute to Fidus Writer?

See our [Contributing Guide](contributing.md). We welcome:
- Code contributions
- Bug reports
- Feature requests
- Documentation improvements
- Translations

### How do I report a bug?

Open an issue on [GitHub Issues](https://github.com/fiduswriter/fiduswriter/issues) with:
- Description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Your environment (OS, browser, Fidus Writer version)

## Performance Questions

### How do I improve performance?

1. Use PostgreSQL instead of SQLite
2. Enable Redis for caching and sessions
3. Use a reverse proxy (NGINX/Apache)
4. Allocate adequate server resources
5. Enable static file caching
6. Use a CDN for static files (optional)

See the [Performance Optimization Guide](configuration/performance.md) for details.

### How many concurrent users can Fidus Writer handle?

This depends on your server resources. A typical setup can handle:
- **Small**: 10-50 concurrent users (2 CPU, 4GB RAM)
- **Medium**: 50-200 concurrent users (4 CPU, 8GB RAM)
- **Large**: 200+ concurrent users (8+ CPU, 16+ GB RAM)

Use load balancing for larger deployments.

### Why is my installation slow?

Common causes:
- Using SQLite instead of PostgreSQL
- Insufficient RAM or CPU
- No caching enabled (Redis)
- Running on shared hosting
- No static file serving optimization

## Security Questions

### Is Fidus Writer secure?

Fidus Writer follows Django security best practices:
- CSRF protection
- SQL injection prevention
- XSS protection
- Secure session management
- Password hashing with PBKDF2

Always use HTTPS in production and keep your installation updated.

### How do I secure my Fidus Writer installation?

1. Always use HTTPS/SSL
2. Use strong passwords
3. Keep software updated
4. Configure firewall properly
5. Use secure database passwords
6. Enable two-factor authentication for admin
7. Regular security audits
8. Regular backups

See security sections in installation guides for details.

### How do I enable two-factor authentication?

For admin accounts, see the [Snap Installation Guide](installation/snap.md#two-factor-authentication-for-admin) for 2FA setup instructions.

### Where is user data stored?

- **Database**: User accounts, document metadata
- **Media directory**: Uploaded images and files
- **Document content**: Stored in database as JSON

Always back up both database and media directory.

## Backup and Recovery Questions

### How do I back up Fidus Writer?

You need to back up:
1. Database (PostgreSQL dump or SQLite file)
2. Media files directory
3. Configuration file

See the [Backup Guide](configuration/backup.md) for detailed instructions.

### How often should I back up?

- **Production**: Daily automated backups recommended
- **Development**: As needed before major changes
- **Critical data**: Consider hourly or continuous backups

### How do I restore from backup?

1. Stop Fidus Writer service
2. Restore database from backup
3. Restore media files
4. Restore configuration
5. Restart service

Test your backup restore procedure regularly.

## Troubleshooting Questions

### I can't access Fidus Writer after installation

Check:
1. Service is running: `sudo snap services` or `docker-compose ps`
2. Correct port is used (4386 for snap, 8000 for docker)
3. Firewall allows the port
4. `ALLOWED_HOSTS` includes your domain/IP
5. Check logs for errors

### I get "Bad Gateway" error

This usually means:
1. Fidus Writer service isn't running
2. Reverse proxy can't connect to Fidus Writer
3. Port mismatch in configuration
4. Check NGINX/Apache error logs

### Static files (CSS/JS) aren't loading

1. Run `collectstatic` command
2. Check web server static file configuration
3. Verify file permissions
4. Clear browser cache

### I forgot my admin password

Reset via command line:
```bash
# Snap
sudo fiduswriter.shell

# Docker
docker-compose exec fiduswriter python manage.py shell

# Development
python manage.py shell
```

Then in Python shell:
```python
from django.contrib.auth import get_user_model
User = get_user_model()
user = User.objects.get(username='admin')
user.set_password('newpassword')
user.save()
```

### Real-time collaboration isn't working

Check:
1. WebSocket support is enabled
2. Reverse proxy configured for WebSocket upgrade
3. Firewall allows WebSocket connections
4. Check browser console for WebSocket errors

See the [Troubleshooting Guide](troubleshooting.md) for more solutions.

## Upgrade and Migration Questions

### How do I upgrade Fidus Writer?

**Snap:** `sudo snap refresh fiduswriter`

**Docker:** 
```bash
docker-compose pull
docker-compose up -d
```

**Development:** 
```bash
git pull
pip install -r requirements.txt
python manage.py migrate
python manage.py transpile
```

See the [Upgrade Guide](installation/upgrade.md) for details.

### Will upgrading break my installation?

Upgrades are designed to be backward compatible. Always:
1. Back up before upgrading
2. Test upgrades in staging first
3. Read release notes for breaking changes
4. Have a rollback plan

### Can I migrate from SQLite to PostgreSQL?

Yes, you can migrate your data. This requires careful planning and testing. Contact the community for assistance with database migrations.

### Can I migrate from Snap to Docker or vice versa?

Yes, the data format is the same. You need to:
1. Back up database and media files
2. Install new version
3. Restore database and media files
4. Update configuration

## Licensing Questions

### Can I use Fidus Writer commercially?

Yes, Fidus Writer is licensed under AGPL v3, which allows commercial use. However, you must:
- Provide source code to users
- License modifications under AGPL v3
- Display prominent notice of AGPL license

### Can I offer Fidus Writer as a service?

Yes, but the AGPL requires you to provide the source code (including any modifications) to your users.

### Can I create a proprietary plugin?

This is a complex legal question. The AGPL is "viral" for modifications to Fidus Writer itself. For plugins, consult with a lawyer familiar with AGPL licensing.

### Do I need to display "Powered by Fidus Writer"?

The AGPL doesn't require this, but it's appreciated and helps the project grow. You can customize branding while respecting the license.

## Getting More Help

### Where can I get support?

- **Documentation**: Start with these docs
- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and discussions
- **Community**: Join our community discussions

### How do I request a feature?

Open a feature request on [GitHub Issues](https://github.com/fiduswriter/fiduswriter/issues) with:
- Clear description of the feature
- Use cases and benefits
- Examples if applicable

### Is there commercial support available?

Check the Fidus Writer website or contact the maintainers for information about commercial support, training, and custom development.

### How can I support the project?

- Contribute code or documentation
- Report bugs and test features
- Help other users in discussions
- Spread the word about Fidus Writer
- Consider financial support (see GitHub Sponsors)

---

**Can't find your answer?** 

- Check the [full documentation](README.md)
- Search [GitHub Issues](https://github.com/fiduswriter/fiduswriter/issues)
- Ask in [GitHub Discussions](https://github.com/fiduswriter/fiduswriter/discussions)

**Last Updated:** December 8, 2025
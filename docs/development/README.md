# Development Documentation

This section contains resources for developers who want to contribute to Fidus Writer or develop plugins and extensions.

## Getting Started

### For Contributors

If you want to contribute code to Fidus Writer:

1. **[Developer Installation](../installation/developer-install.md)** - Set up your development environment
2. **[Contributing Guidelines](../contributing.md)** - Read our contribution guidelines
3. **[Software Structure](software-structure.md)** - Understand the architecture
4. **[Testing Guide](testing.md)** - Learn how to write and run tests

### For Plugin Developers

If you want to create plugins or extensions:

1. **[Developer Installation](../installation/developer-install.md)** - Set up your environment
2. **[Plugin Development](plugin-development.md)** - Create custom plugins
3. **[API Documentation](api.md)** - API reference
4. **[Software Structure](software-structure.md)** - Understand the architecture

## Development Resources

### Tools and Utilities

#### [Devel App - Dependency Management](devel-app.md)

Automated dependency management for Python and JavaScript packages:

- Check for outdated dependencies
- Update dependencies automatically
- Maintain requirements.txt and package.json files

**Quick Start:**
```bash
# Check for updates
python manage.py check_dependencies

# Update all dependencies
python manage.py update_dependencies
```

#### [Devel App Setup Guide](devel-setup.md)

Complete setup guide for the devel app including:

- Installation and configuration
- Automation with cron jobs and GitHub Actions
- Integration with notification systems
- Troubleshooting and best practices

### Architecture and Design

#### [Software Structure](software-structure.md)

Understanding Fidus Writer's architecture:

- Django app structure
- Frontend architecture (ProseMirror, WebSockets)
- Database models
- Plugin system
- API design

#### [API Documentation](api.md)

Reference for Fidus Writer's APIs:

- REST API endpoints
- WebSocket protocol
- Python API for plugins
- JavaScript API for frontend plugins

### Development Guides

#### [Testing Guide](testing.md)

Comprehensive testing documentation:

- Unit tests
- Integration tests
- Browser tests with Selenium
- Coverage reports
- Continuous integration

#### [Plugin Development](plugin-development.md)

Create custom plugins:

- Plugin structure
- Backend plugin development
- Frontend plugin development
- Publishing plugins
- Plugin examples

## Development Workflow

### 1. Set Up Environment

```bash
# Clone repository
git clone https://github.com/YOUR-USERNAME/fiduswriter.git
cd fiduswriter

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install -r dev-requirements.txt
pip install -r test-requirements.txt

# Set up database
python manage.py migrate
python manage.py createsuperuser

# Install frontend dependencies
python manage.py transpile

# Run development server
python manage.py runserver
```

See [Developer Installation Guide](../installation/developer-install.md) for detailed instructions.

### 2. Create Feature Branch

```bash
git checkout -b feature/my-feature
```

### 3. Make Changes

- Follow coding standards (PEP 8 for Python, Biome for JavaScript)
- Write tests for new features
- Update documentation
- Use meaningful commit messages

### 4. Test Your Changes

```bash
# Run tests
python manage.py test

# Run specific tests
python manage.py test document.tests.test_editor

# Check code style
pre-commit run --all-files
```

### 5. Submit Pull Request

- Push to your fork
- Create pull request on GitHub
- Fill out PR template
- Address review feedback

See [Contributing Guidelines](../contributing.md) for details.

## Development Tools

### Pre-commit Hooks

Automatically format and lint code:

```bash
pip install pre-commit
pre-commit install

# Run manually
pre-commit run --all-files
```

### Code Formatters

- **Python**: Black, isort, flake8
- **JavaScript**: Biome (configured in `biome.json`)

### IDEs

#### VS Code

Recommended extensions:
- Python
- Pylance
- Biome
- EditorConfig

#### PyCharm

- Configure Python interpreter
- Enable Django support
- Mark directories as source roots

### Debugging

#### Django Debug Toolbar

```bash
pip install django-debug-toolbar
```

Add to `configuration.py`:
```python
INSTALLED_APPS += ['debug_toolbar']
MIDDLEWARE += ['debug_toolbar.middleware.DebugToolbarMiddleware']
INTERNAL_IPS = ['127.0.0.1']
```

#### Browser DevTools

Use browser developer tools for frontend debugging:
- Console for JavaScript errors
- Network tab for requests
- Sources for debugging JavaScript
- Performance profiling

## Common Tasks

### Database Operations

```bash
# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Reset database
python manage.py flush
python manage.py migrate
```

### Frontend Development

```bash
# Transpile JavaScript
python manage.py transpile

# Watch for changes (if available)
python manage.py transpile --watch

# Collect static files
python manage.py collectstatic
```

### Translations

```bash
# Extract messages
python manage.py makemessages -l de

# Compile messages
python manage.py compilemessages
```

### Cache Management

```bash
# Clear cache
python manage.py clear_cache
```

## Testing

### Run Tests

```bash
# All tests
python manage.py test

# Specific app
python manage.py test document

# With coverage
coverage run --source='.' manage.py test
coverage report
```

### Browser Tests

```bash
# Run browser tests
python manage.py test browser_check base
```

### Continuous Integration

Tests run automatically on GitHub Actions for:
- Pull requests
- Pushes to main/develop branches

See `.github/workflows/main.yml` for CI configuration.

## Code Style

### Python

Follow PEP 8:

```python
def calculate_word_count(document: dict) -> int:
    """
    Calculate word count for a document.
    
    Args:
        document: Document dictionary
        
    Returns:
        Total word count
    """
    return len(document.get('content', '').split())
```

### JavaScript

Use ES6+ syntax:

```javascript
/**
 * Format date for display
 * @param {Date} date - Date to format
 * @returns {string} Formatted date
 */
export function formatDate(date) {
    return new Intl.DateTimeFormat('en-US').format(date)
}
```

### Commit Messages

Use conventional commits format:

```
feat: add collaborative commenting
fix: resolve race condition in document sync
docs: update installation guide
test: add tests for bibliography
refactor: simplify export logic
```

## Performance

### Database Optimization

- Use `.select_related()` and `.prefetch_related()`
- Add database indexes for frequent queries
- Use `.only()` and `.defer()` to limit fields
- Enable query logging in development

### Frontend Optimization

- Minimize DOM manipulations
- Use virtual scrolling for long lists
- Lazy load components
- Optimize bundle size

### Caching

- Use Redis for session storage
- Cache expensive computations
- Use Django's cache framework
- Consider CDN for static files

## Security

### Security Best Practices

- Validate all user input
- Use parameterized queries (Django ORM does this)
- Implement CSRF protection (Django provides this)
- Sanitize HTML output
- Use HTTPS in production
- Keep dependencies updated

### Security Testing

```bash
# Check for security issues
python manage.py check --deploy

# Audit Python packages
pip install safety
safety check

# Audit JavaScript packages
npm audit
```

## Documentation

### Writing Documentation

- Use clear, concise language
- Include code examples
- Add screenshots for UI features
- Keep documentation up-to-date
- Use proper Markdown formatting

### Documentation Location

- **User docs**: `docs/` directory
- **API docs**: Docstrings in code
- **Code comments**: Inline for complex logic

### Building Documentation

```bash
# If using documentation generator
cd docs
make html
```

## Community

### Get Help

- [GitHub Issues](https://github.com/fiduswriter/fiduswriter/issues)
- [GitHub Discussions](https://github.com/fiduswriter/fiduswriter/discussions)
- [Contributing Guide](../contributing.md)

### Stay Updated

- Watch the repository
- Follow release notes
- Join community discussions

## Resources

### Django

- [Django Documentation](https://docs.djangoproject.com/)
- [Django Best Practices](https://django-best-practices.readthedocs.io/)

### Python

- [Python Style Guide (PEP 8)](https://www.python.org/dev/peps/pep-0008/)
- [Python Documentation](https://docs.python.org/)

### JavaScript

- [MDN Web Docs](https://developer.mozilla.org/)
- [ProseMirror Guide](https://prosemirror.net/docs/guide/)

### Testing

- [Django Testing](https://docs.djangoproject.com/en/stable/topics/testing/)
- [Selenium Documentation](https://www.selenium.dev/documentation/)

### Git

- [Git Documentation](https://git-scm.com/doc)
- [GitHub Flow](https://guides.github.com/introduction/flow/)

## Quick Reference

### Useful Commands

```bash
# Development server
python manage.py runserver

# Django shell
python manage.py shell

# Create superuser
python manage.py createsuperuser

# Run tests
python manage.py test

# Check dependencies
python manage.py check_dependencies

# Update dependencies
python manage.py update_dependencies

# Transpile frontend
python manage.py transpile

# Collect static files
python manage.py collectstatic

# Check for issues
python manage.py check
```

### Directory Structure

```
fiduswriter/
├── fiduswriter/              # Main Django project
│   ├── base/                # Base app
│   ├── document/            # Document editor
│   ├── bibliography/        # Bibliography management
│   ├── usermedia/          # User media handling
│   ├── user/               # User management
│   └── devel/              # Development tools
├── docs/                    # Documentation
├── ci/                      # CI configuration
├── requirements.txt         # Python dependencies
├── test-requirements.txt    # Test dependencies
├── dev-requirements.txt     # Development dependencies
└── manage.py               # Django management script
```

## Next Steps

- [Set up your development environment](../installation/developer-install.md)
- [Read the contributing guidelines](../contributing.md)
- [Understand the software structure](software-structure.md)
- [Start with a good first issue](https://github.com/fiduswriter/fiduswriter/labels/good%20first%20issue)

---

**Last Updated:** December 8, 2025

**Questions?** Open an issue or discussion on GitHub!
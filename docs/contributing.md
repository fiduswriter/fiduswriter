# Contributing to Fidus Writer

Thank you for your interest in contributing to Fidus Writer! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [How to Contribute](#how-to-contribute)
4. [Development Workflow](#development-workflow)
5. [Coding Standards](#coding-standards)
6. [Testing](#testing)
7. [Documentation](#documentation)
8. [Pull Request Process](#pull-request-process)
9. [Community](#community)

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. Please be respectful and constructive in all interactions with the community.

## Getting Started

### Contributor License Agreement (CLA)

Before we can accept your contributions, you need to sign our Contributor License Agreement:

👉 **[Sign the CLA](https://cla-assistant.io/fiduswriter/fiduswriter)**

This is a one-time process that ensures we have the rights to use and distribute your contributions.

### Development Environment Setup

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/fiduswriter.git
   cd fiduswriter
   ```
3. **Set up the development environment** - Follow the [Developer Installation Guide](development/developer-install.md)
4. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/my-new-feature
   ```

## How to Contribute

There are many ways to contribute to Fidus Writer:

### 🐛 Report Bugs

- Check if the bug has already been reported in [GitHub Issues](https://github.com/fiduswriter/fiduswriter/issues)
- If not, create a new issue with:
  - Clear, descriptive title
  - Steps to reproduce the problem
  - Expected vs actual behavior
  - Screenshots if applicable
  - Your environment (OS, browser, Fidus Writer version)

### ✨ Suggest Enhancements

- Open an issue with the tag `enhancement`
- Describe the feature and its use cases
- Explain why this enhancement would be useful

### 💻 Code Contributions

Areas where we especially welcome contributions:

- Bug fixes
- New features
- Performance improvements
- Test coverage improvements
- Documentation improvements
- Translations
- Plugin development

### 📝 Documentation

- Fix typos or clarify existing documentation
- Add examples and tutorials
- Translate documentation
- Document undocumented features

### 🌍 Translations

Help make Fidus Writer accessible to more users by contributing translations:

1. Translation files are located in each app's `locale/` directory
2. Use Django's translation framework
3. Test your translations locally before submitting

## Development Workflow

### 1. Keep Your Fork Updated

```bash
# Add the upstream repository
git remote add upstream https://github.com/fiduswriter/fiduswriter.git

# Fetch latest changes
git fetch upstream

# Merge changes into your main branch
git checkout main
git merge upstream/main
```

### 2. Create a Feature Branch

```bash
git checkout -b feature/descriptive-name
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test improvements

### 3. Make Your Changes

- Write clear, concise commit messages
- Keep commits focused and atomic
- Follow the coding standards (see below)
- Add tests for new features
- Update documentation as needed

### 4. Test Your Changes

```bash
# Run the test suite
python manage.py test

# Run specific tests
python manage.py test document.tests.test_editor

# Check code formatting
pre-commit run --all-files
```

### 5. Commit Your Changes

Write meaningful commit messages:

```
feat: add collaborative commenting feature

- Implement real-time comment synchronization
- Add UI for comment threads
- Include tests for comment functionality

Closes #123
```

Commit message format:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Formatting, missing semi-colons, etc.
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

### 6. Push and Create Pull Request

```bash
git push origin feature/descriptive-name
```

Then create a Pull Request on GitHub.

## Coding Standards

### Python Code

- Follow [PEP 8](https://www.python.org/dev/peps/pep-0008/) style guide
- Use meaningful variable and function names
- Add docstrings to functions and classes
- Keep functions focused and small
- Use type hints where appropriate

**Example:**

```python
def calculate_word_count(document: dict) -> int:
    """
    Calculate the total word count of a document.
    
    Args:
        document: Document dictionary containing content nodes
        
    Returns:
        Total number of words in the document
    """
    # Implementation here
    pass
```

### JavaScript Code

- Use modern ES6+ syntax
- Follow the existing code style (enforced by Biome)
- Use meaningful variable and function names
- Add JSDoc comments for complex functions
- Prefer `const` over `let`, avoid `var`

**Example:**

```javascript
/**
 * Format a date for display in the UI
 * @param {Date} date - The date to format
 * @param {string} locale - The locale code
 * @returns {string} Formatted date string
 */
export function formatDate(date, locale = 'en-US') {
    return new Intl.DateTimeFormat(locale).format(date)
}
```

### CSS

- Use BEM naming convention where applicable
- Keep selectors specific but not overly complex
- Use CSS custom properties for theming
- Ensure responsive design

### Pre-commit Hooks

The project uses pre-commit hooks to enforce code quality:

```bash
# Install pre-commit hooks
pip install pre-commit
pre-commit install

# Run manually
pre-commit run --all-files
```

## Testing

### Writing Tests

- Add tests for all new features
- Include both positive and negative test cases
- Test edge cases and error conditions
- Use descriptive test names

**Example:**

```python
class DocumentEditorTests(TestCase):
    def test_create_new_document_with_valid_data(self):
        """Test that a user can create a new document with valid data"""
        # Test implementation
        
    def test_create_document_without_title_fails(self):
        """Test that creating a document without a title raises an error"""
        # Test implementation
```

### Running Tests

```bash
# Run all tests
python manage.py test

# Run specific test module
python manage.py test document.tests.test_editor

# Run with coverage
coverage run --source='.' manage.py test
coverage report
```

### Browser Tests

For Selenium-based browser tests:

```bash
# Ensure ChromeDriver is installed
python manage.py test browser_check base
```

## Documentation

### Documentation Standards

- Use clear, concise language
- Include code examples where helpful
- Add screenshots for UI features
- Keep documentation up-to-date with code changes
- Use proper Markdown formatting

### Documentation Location

- **General docs**: `docs/` directory
- **API docs**: Inline code comments and docstrings
- **User guides**: `docs/` directory organized by topic

### Building Documentation Locally

If we add a documentation generator in the future:

```bash
# Install dependencies
pip install -r docs-requirements.txt

# Build documentation
cd docs
make html
```

## Pull Request Process

### Before Submitting

- ✅ Ensure all tests pass
- ✅ Update documentation if needed
- ✅ Sign the CLA if you haven't already
- ✅ Rebase on latest main branch
- ✅ Write clear PR description

### PR Description Template

```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Closes #123

## How Has This Been Tested?
Describe the tests you ran

## Screenshots (if applicable)
Add screenshots here

## Checklist
- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code where necessary
- [ ] I have updated the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix/feature works
- [ ] New and existing tests pass locally
- [ ] I have signed the CLA
```

### Review Process

1. **Automated Checks**: GitHub Actions will run tests and linters
2. **Code Review**: Maintainers will review your code
3. **Feedback**: Address any requested changes
4. **Approval**: Once approved, your PR will be merged

### After Your PR is Merged

- Delete your feature branch
- Update your local repository
- Celebrate! 🎉

## Community

### Get Help

- **GitHub Discussions**: Ask questions and share ideas
- **GitHub Issues**: Report bugs and request features
- **Website**: Visit [fiduswriter.org](https://fiduswriter.org) for more information

### Stay Updated

- Watch the repository for updates
- Follow [@FidusWriter](https://twitter.com/FidusWriter) on Twitter
- Subscribe to the mailing list (if available)

### Recognition

Contributors are recognized in:
- [AUTHORS](../AUTHORS) file
- Release notes
- Documentation credits

## Financial Support

If you'd like to support Fidus Writer financially, visit our [funding page](https://github.com/fiduswriter/fiduswriter/blob/main/.github/FUNDING.yml).

## Questions?

If you have questions not covered in this guide:

1. Check existing [documentation](README.md)
2. Search [GitHub Issues](https://github.com/fiduswriter/fiduswriter/issues)
3. Ask in [GitHub Discussions](https://github.com/fiduswriter/fiduswriter/discussions)
4. Contact the maintainers

---

## Additional Resources

- [Developer Installation Guide](development/developer-install.md)
- [Plugin Development Guide](development/plugin-development.md)
- [Software Architecture](development/software-structure.md)
- [Testing Guide](development/testing.md)

---

**Last Updated:** December 8, 2025

Thank you for contributing to Fidus Writer! Your contributions help make academic writing more accessible and collaborative for everyone. 🙏

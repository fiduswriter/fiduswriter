# Customizing Footer Links

This guide explains how to customize the footer links that appear on pages before users log in to Fidus Writer.

## Overview

Footer links appear at the bottom of public pages (login, signup, etc.) before users authenticate. You can either:

1. **Use default footer links** - Automatically translated links (default)
2. **Use custom footer links** - Your own links (not automatically translated)

**Note:** You cannot use a combination of both default and custom links.

## Default Footer Links

By default, Fidus Writer displays standard footer links that are automatically translated based on user language:

- About
- Source Code
- License
- Privacy Policy

No configuration needed for default links.

## Custom Footer Links

### Configuration Format

To use custom footer links, set the `FOOTER_LINKS` variable in your configuration file:

```python
FOOTER_LINKS = [
    {
        "text": "Terms and Conditions",
        "link": "/pages/terms/"
    },
    {
        "text": "Privacy Policy",
        "link": "/pages/privacy/"
    },
    {
        "text": "Contact Us",
        "link": "/pages/contact/"
    },
    {
        "text": "External Site",
        "link": "https://example.com",
        "external": True
    }
]
```

### Link Object Properties

Each link object can have the following properties:

- **text** (required): The link text displayed to users
- **link** (required): The URL (absolute or relative)
- **external** (optional): Set to `True` for external links (opens in new tab)

## Configuration by Installation Method

### Snap Installation

1. Open the configuration editor:
   ```bash
   sudo fiduswriter.configure
   ```

2. Add the `FOOTER_LINKS` configuration:
   ```python
   FOOTER_LINKS = [
       {
           "text": "Terms and Conditions",
           "link": "/pages/terms/"
       },
       {
           "text": "Privacy Policy",
           "link": "/pages/privacy/"
       }
   ]
   ```

3. Save and exit (CTRL+X, then Y to confirm)

4. Wait for the site to recompile (this happens automatically)

### Docker Installation

Add to your `docker-compose.yml` environment variables or configuration file:

```yaml
services:
  fiduswriter:
    environment:
      - FOOTER_LINKS=[{"text":"Terms","link":"/pages/terms/"},{"text":"Privacy","link":"/pages/privacy/"}]
```

Or mount a configuration file with the `FOOTER_LINKS` setting.

### Development Installation

Edit `fiduswriter/configuration.py` and add:

```python
FOOTER_LINKS = [
    {
        "text": "Terms and Conditions",
        "link": "/pages/terms/"
    },
    {
        "text": "Privacy Policy",
        "link": "/pages/privacy/"
    }
]
```

Restart the development server after making changes.

## Common Use Cases

### Internal Pages (Flat Pages)

Link to Django flat pages you've created:

```python
FOOTER_LINKS = [
    {
        "text": "About Us",
        "link": "/pages/about/"
    },
    {
        "text": "Impressum",
        "link": "/pages/impressum/"
    },
    {
        "text": "Terms of Service",
        "link": "/pages/terms/"
    },
    {
        "text": "Privacy Policy",
        "link": "/pages/privacy/"
    }
]
```

### External Links

Link to external websites (opens in new tab):

```python
FOOTER_LINKS = [
    {
        "text": "Documentation",
        "link": "https://docs.example.com",
        "external": True
    },
    {
        "text": "Support Forum",
        "link": "https://forum.example.com",
        "external": True
    },
    {
        "text": "GitHub Repository",
        "link": "https://github.com/your-org/your-repo",
        "external": True
    }
]
```

### Technology Credits

Give credit to underlying technologies:

```python
FOOTER_LINKS = [
    {
        "text": "Terms and Conditions",
        "link": "/pages/terms/"
    },
    {
        "text": "Privacy Policy",
        "link": "/pages/privacy/"
    },
    {
        "text": "Equations with MathLive",
        "link": "https://github.com/arnog/mathlive#readme",
        "external": True
    },
    {
        "text": "Citations with CSL",
        "link": "https://citationstyles.org/",
        "external": True
    },
    {
        "text": "Editing with ProseMirror",
        "link": "https://prosemirror.net/",
        "external": True
    }
]
```

### Mixed Internal and External

Combine internal pages and external links:

```python
FOOTER_LINKS = [
    # Internal pages
    {
        "text": "About",
        "link": "/pages/about/"
    },
    {
        "text": "Contact",
        "link": "/pages/contact/"
    },
    # External links
    {
        "text": "Support",
        "link": "https://support.example.com",
        "external": True
    },
    {
        "text": "Documentation",
        "link": "https://docs.example.com",
        "external": True
    }
]
```

## Creating Flat Pages

To create internal pages for your footer links, use Django's flatpages:

### Via Admin Interface

1. Log in to the admin panel at `/admin/`
2. Navigate to **Sites** → **Flat pages**
3. Click **Add flat page**
4. Fill in:
   - **URL**: `/pages/terms/` (must match your footer link)
   - **Title**: "Terms and Conditions"
   - **Content**: Your page content (supports HTML)
5. Select your site
6. Save

### Via Management Command

```bash
# Snap
sudo fiduswriter.shell

# Docker
docker-compose exec fiduswriter python manage.py shell

# Development
python manage.py shell
```

Then in the Python shell:

```python
from django.contrib.flatpages.models import FlatPage
from django.contrib.sites.models import Site

site = Site.objects.get_current()

page = FlatPage.objects.create(
    url='/pages/terms/',
    title='Terms and Conditions',
    content='<h1>Terms and Conditions</h1><p>Your terms here...</p>',
)
page.sites.add(site)
page.save()
```

## Best Practices

### 1. Keep It Concise

Limit footer links to 4-6 items for better user experience:

```python
FOOTER_LINKS = [
    {"text": "About", "link": "/pages/about/"},
    {"text": "Terms", "link": "/pages/terms/"},
    {"text": "Privacy", "link": "/pages/privacy/"},
    {"text": "Contact", "link": "/pages/contact/"},
]
```

### 2. Legal Pages First

Place important legal pages first:

```python
FOOTER_LINKS = [
    {"text": "Terms of Service", "link": "/pages/terms/"},
    {"text": "Privacy Policy", "link": "/pages/privacy/"},
    # ... other links
]
```

### 3. Use Clear Link Text

Use descriptive, clear link text:

✅ Good:
- "Privacy Policy"
- "Terms of Service"
- "Contact Us"

❌ Avoid:
- "Click here"
- "More info"
- "Page"

### 4. Mark External Links

Always set `"external": True` for external links:

```python
{
    "text": "External Site",
    "link": "https://example.com",
    "external": True  # Opens in new tab
}
```

### 5. Use HTTPS for External Links

Always use HTTPS for external links when available:

```python
# Good
{"text": "GitHub", "link": "https://github.com/fiduswriter/fiduswriter", "external": True}

# Avoid
{"text": "GitHub", "link": "http://github.com/fiduswriter/fiduswriter", "external": True}
```

## Internationalization

### Custom Links Are Not Auto-Translated

Custom footer links use the exact text you specify and are not automatically translated.

### Providing Translations Manually

If you need multilingual footer links, you have two options:

**Option 1: Use Django's translation system**

```python
from django.utils.translation import gettext_lazy as _

FOOTER_LINKS = [
    {
        "text": _("Terms and Conditions"),
        "link": "/pages/terms/"
    },
    {
        "text": _("Privacy Policy"),
        "link": "/pages/privacy/"
    }
]
```

Then create translation files with Django's makemessages command.

**Option 2: Use default links**

If you need automatic translation, don't set `FOOTER_LINKS` and use the default footer links instead.

## Styling

Footer links use the default Fidus Writer styling. Custom CSS can be added via themes or custom CSS files, but this is an advanced topic.

The footer links are rendered in the `footer.html` template.

## Troubleshooting

### Links Not Appearing

**Problem:** Footer links don't show after configuration

**Solution:**
1. Verify `FOOTER_LINKS` syntax is correct (valid Python list/dict)
2. Restart the service:
   ```bash
   # Snap
   sudo snap restart fiduswriter
   
   # Docker
   docker-compose restart fiduswriter
   
   # Development
   # Restart development server
   ```
3. Clear browser cache
4. Check logs for syntax errors

### Internal Links 404

**Problem:** Internal links return 404 errors

**Solution:**
1. Verify flat pages are created in admin
2. Ensure URLs match exactly (including leading slash and trailing slash)
3. Check that flat pages are associated with the correct site

### External Links Not Opening in New Tab

**Problem:** External links open in same tab

**Solution:**
Ensure `"external": True` is set:

```python
{
    "text": "External Site",
    "link": "https://example.com",
    "external": True  # Required for new tab
}
```

### Configuration Syntax Errors

**Problem:** Site won't start after adding footer links

**Solution:**
1. Check Python syntax (commas, quotes, brackets)
2. Validate JSON-like structure
3. Review error logs:
   ```bash
   # Snap
   sudo snap logs fiduswriter
   
   # Docker
   docker-compose logs fiduswriter
   ```

### Changes Not Reflecting

**Problem:** Footer link changes don't appear

**Solution:**
1. Restart service (see above)
2. Clear static files cache:
   ```bash
   # Snap
   sudo fiduswriter.collectstatic --noinput
   
   # Docker
   docker-compose exec fiduswriter python manage.py collectstatic --noinput
   
   # Development
   python manage.py collectstatic --noinput
   ```
3. Force-refresh browser (Ctrl+Shift+R or Cmd+Shift+R)

## Complete Examples

### Academic Institution

```python
FOOTER_LINKS = [
    {
        "text": "About the Library",
        "link": "/pages/about/"
    },
    {
        "text": "Terms of Use",
        "link": "/pages/terms/"
    },
    {
        "text": "Privacy Policy",
        "link": "/pages/privacy/"
    },
    {
        "text": "Accessibility Statement",
        "link": "/pages/accessibility/"
    },
    {
        "text": "University Homepage",
        "link": "https://www.university.edu",
        "external": True
    }
]
```

### Research Organization

```python
FOOTER_LINKS = [
    {
        "text": "About",
        "link": "/pages/about/"
    },
    {
        "text": "Privacy",
        "link": "/pages/privacy/"
    },
    {
        "text": "Data Protection",
        "link": "/pages/data-protection/"
    },
    {
        "text": "Research Ethics",
        "link": "https://ethics.example.org",
        "external": True
    },
    {
        "text": "Contact",
        "link": "/pages/contact/"
    }
]
```

### Publishing Platform

```python
FOOTER_LINKS = [
    {
        "text": "Terms of Service",
        "link": "/pages/terms/"
    },
    {
        "text": "Privacy Policy",
        "link": "/pages/privacy/"
    },
    {
        "text": "Copyright Policy",
        "link": "/pages/copyright/"
    },
    {
        "text": "Help Center",
        "link": "https://help.example.com",
        "external": True
    },
    {
        "text": "Blog",
        "link": "https://blog.example.com",
        "external": True
    }
]
```

## Removing Footer Links

To remove all footer links (show none):

```python
FOOTER_LINKS = []
```

To revert to default footer links, simply remove or comment out the `FOOTER_LINKS` setting:

```python
# FOOTER_LINKS = [...]  # Commented out = use defaults
```

## Related Documentation

- [Branding and Customization](branding.md)
- [Advanced Configuration](advanced.md)
- [Snap Installation](../installation/snap.md)

## Getting Help

- [GitHub Issues](https://github.com/fiduswriter/fiduswriter/issues)
- [GitHub Discussions](https://github.com/fiduswriter/fiduswriter/discussions)

---

**Last Updated:** December 8, 2025

**Questions?** Open an [issue](https://github.com/fiduswriter/fiduswriter/issues) or [discussion](https://github.com/fiduswriter/fiduswriter/discussions)!
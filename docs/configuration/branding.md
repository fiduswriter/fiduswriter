# Branding and Logo Customization

This guide explains how to add your organization's branding, logo, and custom styling to Fidus Writer.

## Overview

You can customize Fidus Writer's appearance by:

- Adding your organization's logo to login pages
- Customizing site name and contact information
- Adding custom CSS for styling
- Modifying color schemes
- Customizing favicon and other branding elements

## Adding a Logo to Login Pages

### For Snap Installations

#### 1. Prepare Your Logo

Recommended specifications:
- **Format**: PNG, SVG, or JPG
- **Size**: 200x200px to 400x400px recommended
- **Background**: Transparent (PNG/SVG) or white
- **File size**: Under 200KB for fast loading

#### 2. Create Static Files Directory

Create a directory for your logo file type:

```bash
# For PNG logos
sudo mkdir -p /var/snap/fiduswriter/current/static-libs/png

# For SVG logos
sudo mkdir -p /var/snap/fiduswriter/current/static-libs/svg

# For JPG logos
sudo mkdir -p /var/snap/fiduswriter/current/static-libs/jpg
```

#### 3. Copy Logo File

Copy your logo to the appropriate directory:

```bash
# Example for PNG logo
sudo cp branding_logo.png /var/snap/fiduswriter/current/static-libs/png/

# Example for SVG logo
sudo cp branding_logo.svg /var/snap/fiduswriter/current/static-libs/svg/
```

#### 4. Configure Logo Path

Open the Fidus Writer configuration:

```bash
sudo fiduswriter.configure
```

Add the `BRANDING_LOGO` setting at the end of the configuration file:

```python
# For PNG logo
BRANDING_LOGO = "png/branding_logo.png"

# For SVG logo (recommended for scalability)
BRANDING_LOGO = "svg/branding_logo.svg"

# For JPG logo
BRANDING_LOGO = "jpg/branding_logo.jpg"
```

#### 5. Save and Restart

Save the configuration (CTRL+X, then Y) and the service will automatically restart.

### For Docker Installations

#### 1. Prepare Logo Directory

Create a directory for static assets in your Docker project:

```bash
mkdir -p ./static-libs/png
cp your_logo.png ./static-libs/png/branding_logo.png
```

#### 2. Mount Volume in Docker Compose

Edit `docker-compose.yml`:

```yaml
services:
  fiduswriter:
    image: fiduswriter/fiduswriter:latest
    volumes:
      - ./static-libs:/app/static-libs:ro
      - media_files:/app/media
      - static_files:/app/static
    environment:
      - BRANDING_LOGO=png/branding_logo.png
```

#### 3. Restart Services

```bash
docker-compose down
docker-compose up -d
```

### For Development Installations

#### 1. Add Logo to Static Directory

```bash
mkdir -p fiduswriter/static-libs/png
cp your_logo.png fiduswriter/static-libs/png/branding_logo.png
```

#### 2. Configure in configuration.py

Edit `fiduswriter/configuration.py`:

```python
BRANDING_LOGO = "png/branding_logo.png"
```

#### 3. Collect Static Files

```bash
python manage.py collectstatic --noinput
```

#### 4. Restart Development Server

Stop and restart your development server.

## Site Name and Contact Information

### Configure Site Identity

Edit your configuration to set the site name and contact email:

```python
# Site name (appears in page titles and emails)
SITE_NAME = 'University Writing Portal'

# Contact email (shown to users for support)
CONTACT_EMAIL = 'support@university.edu'

# Site domain (for absolute URLs in emails)
SITE_DOMAIN = 'fidus.university.edu'
```

### For Snap Installation

```bash
sudo fiduswriter.configure
```

Add these settings:

```python
SITE_NAME = 'Your Organization Name'
CONTACT_EMAIL = 'admin@yourdomain.com'
```

### For Docker Installation

Add to environment variables in `docker-compose.yml`:

```yaml
environment:
  - SITE_NAME=Your Organization Name
  - CONTACT_EMAIL=admin@yourdomain.com
```

## Favicon Customization

### Add Custom Favicon

#### 1. Prepare Favicon Files

Create favicons in multiple sizes:
- `favicon.ico` (16x16, 32x32, 48x48)
- `favicon-16x16.png`
- `favicon-32x32.png`
- `favicon-96x96.png`
- `apple-touch-icon.png` (180x180)

Use a tool like [favicon.io](https://favicon.io/) or [RealFaviconGenerator](https://realfavicongenerator.net/).

#### 2. Copy Favicon Files

**Snap:**
```bash
sudo cp favicon.ico /var/snap/fiduswriter/current/static-libs/
sudo cp favicon-*.png /var/snap/fiduswriter/current/static-libs/png/
```

**Docker:**
```bash
cp favicon.ico ./static-libs/
cp favicon-*.png ./static-libs/png/
```

**Development:**
```bash
cp favicon.ico fiduswriter/static-libs/
cp favicon-*.png fiduswriter/static-libs/png/
```

#### 3. Configure Favicon Path

Add to configuration:

```python
FAVICON = "favicon.ico"
```

## Custom CSS Styling

### Create Custom Stylesheet

#### 1. Create CSS File

Create a custom CSS file with your branding:

```css
/* custom-branding.css */

/* Primary brand color */
:root {
    --brand-primary: #0066cc;
    --brand-secondary: #004499;
    --brand-accent: #ff6600;
}

/* Customize header */
.header {
    background-color: var(--brand-primary);
}

/* Customize buttons */
.btn-primary {
    background-color: var(--brand-primary);
    border-color: var(--brand-primary);
}

.btn-primary:hover {
    background-color: var(--brand-secondary);
    border-color: var(--brand-secondary);
}

/* Customize links */
a {
    color: var(--brand-primary);
}

a:hover {
    color: var(--brand-secondary);
}

/* Logo sizing on login page */
.branding-logo {
    max-width: 300px;
    max-height: 150px;
    margin-bottom: 20px;
}
```

#### 2. Add CSS File

**Snap:**
```bash
sudo mkdir -p /var/snap/fiduswriter/current/static-libs/css
sudo cp custom-branding.css /var/snap/fiduswriter/current/static-libs/css/
```

**Docker:**
```bash
mkdir -p ./static-libs/css
cp custom-branding.css ./static-libs/css/
```

#### 3. Configure Custom CSS

Add to configuration:

```python
CUSTOM_STYLESHEETS = [
    "css/custom-branding.css"
]
```

## Complete Branding Example

### For Academic Institution

```python
# Site identity
SITE_NAME = 'University of Example Academic Writing Platform'
CONTACT_EMAIL = 'writing-support@example.edu'

# Branding
BRANDING_LOGO = "png/university-logo.png"
FAVICON = "favicon.ico"

# Custom styling
CUSTOM_STYLESHEETS = [
    "css/university-theme.css"
]

# Footer links
FOOTER_LINKS = [
    {
        "text": "About",
        "link": "/pages/about/"
    },
    {
        "text": "University Homepage",
        "link": "https://www.example.edu",
        "external": True
    },
    {
        "text": "Privacy Policy",
        "link": "/pages/privacy/"
    },
    {
        "text": "Accessibility",
        "link": "/pages/accessibility/"
    }
]
```

### For Research Organization

```python
# Site identity
SITE_NAME = 'Research Institute Collaborative Writing'
CONTACT_EMAIL = 'it-support@research.org'

# Branding
BRANDING_LOGO = "svg/institute-logo.svg"
FAVICON = "favicon.ico"

# Custom styling
CUSTOM_STYLESHEETS = [
    "css/research-theme.css"
]

# Footer
FOOTER_LINKS = [
    {
        "text": "About the Institute",
        "link": "https://www.research.org/about",
        "external": True
    },
    {
        "text": "Terms of Use",
        "link": "/pages/terms/"
    },
    {
        "text": "Data Protection",
        "link": "/pages/data-protection/"
    }
]
```

## Advanced Customization

### Custom Templates

For more extensive customization, you can override Django templates:

1. Create a custom app or use a templates directory
2. Override specific templates
3. Add to `TEMPLATES` configuration

This is an advanced topic requiring Django knowledge.

### Custom JavaScript

Add custom JavaScript for advanced features:

```python
CUSTOM_SCRIPTS = [
    "js/custom-analytics.js",
    "js/custom-features.js"
]
```

### White Label Configuration

For complete white labeling:

```python
# Remove Fidus Writer branding
HIDE_POWERED_BY = True

# Custom branding
SITE_NAME = 'Your Platform Name'
BRANDING_LOGO = "svg/your-logo.svg"
FAVICON = "favicon.ico"

# Custom styling
CUSTOM_STYLESHEETS = [
    "css/white-label-theme.css"
]

# Custom footer
FOOTER_LINKS = [
    # Your custom links
]

# Custom about text
ABOUT_TEXT = "Your custom about text for the platform"
```

## Logo Best Practices

### 1. File Format

- **SVG**: Best for scalability and small file size (recommended)
- **PNG**: Good for complex logos with transparency
- **JPG**: Use only if transparency not needed

### 2. Size Guidelines

- **Width**: 200-400px (will scale to fit)
- **Height**: 100-200px recommended
- **Aspect ratio**: Maintain original aspect ratio
- **File size**: Keep under 200KB

### 3. Background

- Transparent background (PNG/SVG) works best
- If using solid background, match your site's background color
- Ensure good contrast with login page background

### 4. Design Considerations

- Logo should be clear and readable at small sizes
- Avoid very detailed logos that don't scale well
- Test appearance on different screen sizes
- Consider both light and dark backgrounds

## Troubleshooting

### Logo Not Appearing

**Problem:** Logo doesn't show on login page

**Solutions:**

1. Verify file path is correct in configuration:
   ```python
   BRANDING_LOGO = "png/logo.png"  # Not /png/logo.png
   ```

2. Check file exists in correct location:
   ```bash
   # Snap
   ls -la /var/snap/fiduswriter/current/static-libs/png/
   
   # Docker
   docker-compose exec fiduswriter ls -la /app/static-libs/png/
   ```

3. Verify file permissions:
   ```bash
   sudo chmod 644 /var/snap/fiduswriter/current/static-libs/png/logo.png
   ```

4. Collect static files:
   ```bash
   # Snap
   sudo fiduswriter.collectstatic --noinput
   
   # Docker
   docker-compose exec fiduswriter python manage.py collectstatic --noinput
   ```

5. Restart service:
   ```bash
   # Snap
   sudo snap restart fiduswriter
   
   # Docker
   docker-compose restart fiduswriter
   ```

6. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)

### Logo Too Large or Too Small

**Problem:** Logo appears at wrong size

**Solution:**

Add custom CSS to control logo size:

```css
.branding-logo {
    max-width: 300px;      /* Adjust as needed */
    max-height: 150px;     /* Adjust as needed */
    width: auto;
    height: auto;
}
```

### Favicon Not Updating

**Problem:** Old favicon still appears

**Solutions:**

1. Clear browser cache completely
2. Force refresh with Ctrl+Shift+R (or Cmd+Shift+R on Mac)
3. Try in incognito/private browsing mode
4. Check browser console for 404 errors
5. Verify favicon path in configuration

### Custom CSS Not Applied

**Problem:** Custom styles don't appear

**Solutions:**

1. Verify CSS file is in correct location
2. Check `CUSTOM_STYLESHEETS` configuration
3. Collect static files
4. Check browser console for CSS errors
5. Verify CSS syntax is valid
6. Clear browser cache

## Testing Checklist

After adding branding:

- [ ] Logo appears on login page
- [ ] Logo appears on signup page
- [ ] Logo has correct size and proportions
- [ ] Favicon shows in browser tab
- [ ] Favicon shows in bookmarks
- [ ] Site name appears in page titles
- [ ] Site name appears in email notifications
- [ ] Custom CSS applies correctly
- [ ] Footer links work as expected
- [ ] Branding looks good on mobile devices
- [ ] Branding works across different browsers

## Related Documentation

- [Footer Links Customization](footer-links.md)
- [Advanced Configuration](advanced.md)
- [Snap Installation](../installation/snap.md)

## Getting Help

- [GitHub Issues](https://github.com/fiduswriter/fiduswriter/issues)
- [GitHub Discussions](https://github.com/fiduswriter/fiduswriter/discussions)

---

**Last Updated:** December 8, 2025

**Questions?** Open an [issue](https://github.com/fiduswriter/fiduswriter/issues) or [discussion](https://github.com/fiduswriter/fiduswriter/discussions)!
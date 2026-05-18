# Setting Up Login Providers

This guide explains how to configure external authentication providers (OAuth, SAML) for Fidus Writer using Django-allauth.

## Overview

Fidus Writer uses [Django-allauth](https://django-allauth.readthedocs.io/) for social authentication. You can enable login via:

- Google
- GitHub
- Facebook
- Twitter/X
- Microsoft
- ORCID
- And many more providers

## General Setup Process

### 1. Install Required Provider

Most social authentication providers are already included with Fidus Writer. Check the Django-allauth documentation for provider-specific requirements.

### 2. Configure the Provider

Edit your Fidus Writer configuration file:

**Snap:**
```bash
sudo fiduswriter.configure
```

**Docker:**
Edit `docker-compose.yml` environment variables or mount a configuration file.

**Development:**
Edit `fiduswriter/configuration.py`

### 3. Add Provider Configuration

Add the provider to `INSTALLED_APPS` and configure credentials in `SOCIALACCOUNT_PROVIDERS`.

### 4. Configure Redirect URI

The redirect URI format for Fidus Writer is:

```
https://yourdomain.com/api/{provider}/{provider}/login/callback/
```

Examples:
- GitHub: `https://yourdomain.com/api/github/github/login/callback/`
- Google: `https://yourdomain.com/api/google/google/login/callback/`
- ORCID: `https://yourdomain.com/api/orcid/orcid/login/callback/`

**Note:** The provider name appears twice in the URL path.

## Provider-Specific Setup

### GitHub

#### 1. Register OAuth App on GitHub

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name**: Your Fidus Writer instance name
   - **Homepage URL**: `https://yourdomain.com`
   - **Authorization callback URL**: `https://yourdomain.com/api/github/github/login/callback/`
4. Click "Register application"
5. Note the **Client ID** and generate a **Client Secret**

#### 2. Configure Fidus Writer

Add to your configuration file:

```python
INSTALLED_APPS += [
    'allauth.socialaccount.providers.github',
]

SOCIALACCOUNT_PROVIDERS = {
    'github': {
        'APP': {
            'client_id': 'your-github-client-id',
            'secret': 'your-github-client-secret',
            'key': ''
        },
        'SCOPE': [
            'user:email',
        ],
    }
}
```

#### 3. Restart and Test

Restart Fidus Writer and test the GitHub login button on the login page.

---

### Google

#### 1. Create OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to Credentials → Create Credentials → OAuth client ID
5. Configure OAuth consent screen if prompted
6. Application type: Web application
7. Add authorized redirect URI:
   ```
   https://yourdomain.com/api/google/google/login/callback/
   ```
8. Note the **Client ID** and **Client Secret**

#### 2. Configure Fidus Writer

```python
INSTALLED_APPS += [
    'allauth.socialaccount.providers.google',
]

SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'APP': {
            'client_id': 'your-google-client-id.apps.googleusercontent.com',
            'secret': 'your-google-client-secret',
            'key': ''
        },
        'SCOPE': [
            'profile',
            'email',
        ],
        'AUTH_PARAMS': {
            'access_type': 'online',
        }
    }
}
```

---

### ORCID

ORCID is popular in academic settings for researcher authentication.

#### 1. Register Application with ORCID

1. Go to [ORCID Developer Tools](https://orcid.org/developer-tools)
2. Register for a public API
3. Fill in application details
4. Redirect URI: `https://yourdomain.com/api/orcid/orcid/login/callback/`
5. Note your **Client ID** and **Client Secret**

#### 2. Configure Fidus Writer

```python
INSTALLED_APPS += [
    'allauth.socialaccount.providers.orcid',
]

SOCIALACCOUNT_PROVIDERS = {
    'orcid': {
        'APP': {
            'client_id': 'APP-XXXXXXXXXXXX',
            'secret': 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
            'key': ''
        },
        'BASE_DOMAIN': 'orcid.org',  # or 'sandbox.orcid.org' for testing
    }
}
```

---

### Microsoft

#### 1. Register App in Azure Portal

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to Azure Active Directory → App registrations
3. Click "New registration"
4. Name your application
5. Supported account types: Choose based on your needs
6. Redirect URI: `https://yourdomain.com/api/microsoft/microsoft/login/callback/`
7. Register and note the **Application (client) ID**
8. Go to Certificates & secrets → New client secret
9. Note the **Client secret value** immediately (it won't be shown again)

#### 2. Configure Fidus Writer

```python
INSTALLED_APPS += [
    'allauth.socialaccount.providers.microsoft',
]

SOCIALACCOUNT_PROVIDERS = {
    'microsoft': {
        'APP': {
            'client_id': 'your-application-client-id',
            'secret': 'your-client-secret',
            'key': ''
        },
        'SCOPE': [
            'User.Read',
        ],
    }
}
```

---

### Facebook

#### 1. Create Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add Facebook Login product
4. Configure OAuth redirect URIs:
   ```
   https://yourdomain.com/api/facebook/facebook/login/callback/
   ```
5. Note the **App ID** and **App Secret**

#### 2. Configure Fidus Writer

```python
INSTALLED_APPS += [
    'allauth.socialaccount.providers.facebook',
]

SOCIALACCOUNT_PROVIDERS = {
    'facebook': {
        'APP': {
            'client_id': 'your-facebook-app-id',
            'secret': 'your-facebook-app-secret',
            'key': ''
        },
        'METHOD': 'oauth2',
        'SCOPE': ['email', 'public_profile'],
        'FIELDS': [
            'id',
            'email',
            'name',
            'first_name',
            'last_name',
        ],
    }
}
```

---

### Twitter/X

#### 1. Create Twitter App

1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Create a new app
3. Enable OAuth 2.0
4. Add callback URL:
   ```
   https://yourdomain.com/api/twitter/twitter/login/callback/
   ```
5. Note the **Client ID** and **Client Secret**

#### 2. Configure Fidus Writer

```python
INSTALLED_APPS += [
    'allauth.socialaccount.providers.twitter_oauth2',
]

SOCIALACCOUNT_PROVIDERS = {
    'twitter_oauth2': {
        'APP': {
            'client_id': 'your-twitter-client-id',
            'secret': 'your-twitter-client-secret',
            'key': ''
        },
    }
}
```

---

## Advanced Configuration

### Email Verification

Control email verification requirements:

```python
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_EMAIL_VERIFICATION = 'mandatory'  # or 'optional', 'none'
```

### Auto-Signup

Allow automatic account creation on first social login:

```python
SOCIALACCOUNT_AUTO_SIGNUP = True
```

### Email as Username

Use email addresses as usernames:

```python
ACCOUNT_USERNAME_REQUIRED = False
ACCOUNT_AUTHENTICATION_METHOD = 'email'
```

### Multiple Providers

You can enable multiple providers simultaneously:

```python
INSTALLED_APPS += [
    'allauth.socialaccount.providers.github',
    'allauth.socialaccount.providers.google',
    'allauth.socialaccount.providers.orcid',
]

SOCIALACCOUNT_PROVIDERS = {
    'github': {
        'APP': {
            'client_id': 'github-client-id',
            'secret': 'github-secret',
            'key': ''
        },
    },
    'google': {
        'APP': {
            'client_id': 'google-client-id',
            'secret': 'google-secret',
            'key': ''
        },
    },
    'orcid': {
        'APP': {
            'client_id': 'orcid-client-id',
            'secret': 'orcid-secret',
            'key': ''
        },
    },
}
```

### Query on Signup

Ask additional questions during social signup:

```python
SOCIALACCOUNT_QUERY_EMAIL = True
ACCOUNT_EMAIL_REQUIRED = True
```

## Security Best Practices

### 1. Use Environment Variables

Don't hardcode secrets in configuration files:

```python
import os

SOCIALACCOUNT_PROVIDERS = {
    'github': {
        'APP': {
            'client_id': os.environ.get('GITHUB_CLIENT_ID'),
            'secret': os.environ.get('GITHUB_CLIENT_SECRET'),
            'key': ''
        },
    },
}
```

### 2. Restrict Redirect URIs

Only add the exact redirect URIs you need in the provider's configuration.

### 3. Use HTTPS

Always use HTTPS in production. Social login will not work properly over HTTP.

```python
ACCOUNT_DEFAULT_HTTP_PROTOCOL = 'https'
```

### 4. Review Permissions/Scopes

Only request the minimum scopes/permissions needed:
- ✅ Good: `['email', 'profile']`
- ❌ Bad: `['email', 'profile', 'repo', 'admin']`

### 5. Rotate Secrets Regularly

Periodically regenerate client secrets and update your configuration.

## Troubleshooting

### Provider Not Showing on Login Page

**Possible causes:**
1. Provider not added to `INSTALLED_APPS`
2. Service not restarted after configuration change
3. Static files not collected

**Solution:**
```bash
# Snap
sudo snap restart fiduswriter

# Docker
docker-compose restart fiduswriter
docker-compose exec fiduswriter python manage.py collectstatic

# Development
python manage.py collectstatic
# Then restart server
```

### Redirect URI Mismatch

**Error:** "Redirect URI mismatch" or "Invalid redirect_uri"

**Solution:**
- Double-check the redirect URI format: `/api/{provider}/{provider}/login/callback/`
- Ensure the URI in provider settings exactly matches your domain
- Include protocol (https://) and trailing slash

### Invalid Client Error

**Error:** "Invalid client" or "Client authentication failed"

**Solution:**
- Verify client ID and secret are correct
- Check for extra spaces or characters
- Regenerate secret if necessary

### Email Already Exists

**Error:** User tries to login with social account but email already exists

**Solution:**
Configure account linking:
```python
SOCIALACCOUNT_EMAIL_REQUIRED = True
SOCIALACCOUNT_AUTO_SIGNUP = False
ACCOUNT_EMAIL_VERIFICATION = 'mandatory'
```

Or enable auto-connection:
```python
SOCIALACCOUNT_AUTO_SIGNUP = True
```

### Social Account Not Connected

**Problem:** Users can't connect social accounts after signup

**Solution:**
Ensure these settings are enabled:
```python
SOCIALACCOUNT_STORE_TOKENS = True
```

Users can connect additional accounts from their profile settings.

## Testing

### Test with Provider's Sandbox

Many providers offer sandbox/test environments:
- **ORCID:** Use `sandbox.orcid.org` instead of `orcid.org`
- **PayPal:** Use sandbox credentials

### Test Locally with HTTPS

Social login requires HTTPS. For local testing:

1. Use a service like [ngrok](https://ngrok.com/):
   ```bash
   ngrok http 8000
   ```

2. Use the ngrok HTTPS URL as your domain in provider settings

3. Add ngrok URL to ALLOWED_HOSTS and CSRF_TRUSTED_ORIGINS

### Test Different User Scenarios

- [ ] New user signup via social login
- [ ] Existing user login via social login
- [ ] Email conflict handling
- [ ] Account linking (multiple providers)
- [ ] Logout and re-login

## Additional Providers

Django-allauth supports 50+ providers. See the [complete list](https://django-allauth.readthedocs.io/en/latest/socialaccount/providers/index.html):

- Amazon
- Apple
- Atlassian
- Auth0
- Azure
- Bitbucket
- Discord
- Dropbox
- GitLab
- LinkedIn
- Reddit
- Salesforce
- Slack
- Spotify
- Telegram
- Twitch
- And many more...

Configuration follows the same pattern for all providers.

## SAML/LDAP Authentication

For enterprise single sign-on (SSO) with SAML or LDAP, additional configuration is required. These are typically used in institutional settings.

### SAML Setup

Requires additional packages:
```bash
pip install python3-saml
```

This is an advanced topic. Consult your IT department and see Django SAML2 authentication documentation.

### LDAP Setup

Requires additional packages:
```bash
pip install django-auth-ldap
```

Example LDAP configuration:
```python
import ldap
from django_auth_ldap.config import LDAPSearch

AUTH_LDAP_SERVER_URI = "ldap://ldap.example.com"
AUTH_LDAP_BIND_DN = "cn=admin,dc=example,dc=com"
AUTH_LDAP_BIND_PASSWORD = "password"
AUTH_LDAP_USER_SEARCH = LDAPSearch(
    "ou=users,dc=example,dc=com",
    ldap.SCOPE_SUBTREE,
    "(uid=%(user)s)"
)
```

Contact your system administrator for LDAP connection details.

## Related Documentation

- [Advanced Configuration](advanced.md)
- [Security Best Practices](../installation/snap.md#security-best-practices)
- [Django-allauth Documentation](https://django-allauth.readthedocs.io/)

## Getting Help

- [GitHub Issues](https://github.com/fiduswriter/fiduswriter/issues)
- [GitHub Discussions](https://github.com/fiduswriter/fiduswriter/discussions)
- [Django-allauth Issues](https://github.com/pennersr/django-allauth/issues)

---

**Last Updated:** December 8, 2025

**Questions?** Open an [issue](https://github.com/fiduswriter/fiduswriter/issues) or [discussion](https://github.com/fiduswriter/fiduswriter/discussions)!
# Email Configuration Guide

Configure email sending for notifications, password resets, and user registration.

## SMTP Configuration

### Gmail

```python
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'your-email@gmail.com'
EMAIL_HOST_PASSWORD = 'your-app-password'  # Use App Password, not account password
DEFAULT_FROM_EMAIL = 'noreply@yourdomain.com'
```

**Note:** For Gmail, you must use an [App Password](https://support.google.com/accounts/answer/185833).

### SendGrid

```python
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.sendgrid.net'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'apikey'
EMAIL_HOST_PASSWORD = 'your-sendgrid-api-key'
DEFAULT_FROM_EMAIL = 'noreply@yourdomain.com'
```

### Amazon SES

```python
EMAIL_BACKEND = 'django_ses.SESBackend'
AWS_ACCESS_KEY_ID = 'your-access-key'
AWS_SECRET_ACCESS_KEY = 'your-secret-key'
AWS_SES_REGION_NAME = 'us-east-1'
AWS_SES_REGION_ENDPOINT = 'email.us-east-1.amazonaws.com'
DEFAULT_FROM_EMAIL = 'noreply@yourdomain.com'
```

### Custom SMTP Server

```python
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'mail.example.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'username'
EMAIL_HOST_PASSWORD = 'password'
DEFAULT_FROM_EMAIL = 'noreply@yourdomain.com'
SERVER_EMAIL = 'server@yourdomain.com'
```

## Testing Email

```bash
python manage.py shell
```

```python
from django.core.mail import send_mail

send_mail(
    'Test Subject',
    'Test message',
    'from@example.com',
    ['to@example.com'],
    fail_silently=False,
)
```

## Troubleshooting

### Emails Not Sending

1. Check SMTP credentials
2. Verify firewall allows SMTP port
3. Check email logs
4. Test SMTP connection manually

### Gmail "Less Secure Apps"

Use App Passwords instead of regular password.

## Related Documentation

- [Advanced Configuration](advanced.md)

---

**Last Updated:** December 8, 2025

# SSL/HTTPS Setup Guide

This guide explains how to configure SSL/HTTPS for Fidus Writer using Let's Encrypt or other certificate providers.

## Why HTTPS?

- **Security**: Encrypts data in transit
- **Authentication**: Verifies server identity
- **Integrity**: Prevents data tampering
- **Required**: For social login providers
- **SEO**: Better search engine ranking
- **Trust**: Browser security indicators

## Prerequisites

- Domain name pointing to your server
- Ports 80 and 443 open in firewall
- Reverse proxy (NGINX or Apache) configured
- Fidus Writer running

## Let's Encrypt (Free Certificate)

### Using Certbot with NGINX

#### 1. Install Certbot

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx
```

**Fedora/CentOS:**
```bash
sudo dnf install certbot python3-certbot-nginx
```

#### 2. Configure NGINX

Ensure NGINX is properly configured (see [Snap Installation Guide](../installation/snap.md#nginx-reverse-proxy-setup)).

#### 3. Obtain Certificate

```bash
sudo certbot --nginx -d yourdomain.com
```

For multiple domains:
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

#### 4. Answer Prompts

- Enter email address
- Agree to terms of service
- Choose whether to redirect HTTP to HTTPS (recommended: yes)

#### 5. Verify Certificate

Visit `https://yourdomain.com` - should show secure connection.

### Using Certbot with Apache

```bash
sudo apt install certbot python3-certbot-apache
sudo certbot --apache -d yourdomain.com
```

### Manual Certificate Renewal

```bash
sudo certbot renew
```

### Automatic Renewal

Certbot sets up automatic renewal. Test it:

```bash
sudo certbot renew --dry-run
```

## Custom SSL Certificate

### Using Your Own Certificate

#### 1. Obtain Certificate Files

You need:
- Certificate file (`.crt` or `.pem`)
- Private key (`.key`)
- CA bundle/chain (optional, `.ca-bundle`)

#### 2. Install Certificate

Copy files to secure location:
```bash
sudo mkdir -p /etc/ssl/fiduswriter
sudo cp your-cert.crt /etc/ssl/fiduswriter/
sudo cp your-key.key /etc/ssl/fiduswriter/
sudo chmod 600 /etc/ssl/fiduswriter/your-key.key
```

#### 3. Configure NGINX

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /etc/ssl/fiduswriter/your-cert.crt;
    ssl_certificate_key /etc/ssl/fiduswriter/your-key.key;
    
    # Additional SSL settings below...
}
```

## Fidus Writer Configuration

After setting up SSL, update Fidus Writer configuration:

```bash
sudo fiduswriter.configure  # Snap
```

Add/verify:
```python
ACCOUNT_DEFAULT_HTTP_PROTOCOL = 'https'
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
```

## SSL Best Practices

### Strong SSL Configuration

```nginx
# SSL protocols and ciphers
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
ssl_prefer_server_ciphers off;

# SSL session caching
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;

# OCSP stapling
ssl_stapling on;
ssl_stapling_verify on;
ssl_trusted_certificate /path/to/chain.pem;

# Security headers
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
```

## Testing SSL Configuration

### Online Tools

- [SSL Labs SSL Test](https://www.ssllabs.com/ssltest/)
- [Security Headers](https://securityheaders.com/)

### Command Line

```bash
# Check certificate
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Check expiry
echo | openssl s_client -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates
```

## Troubleshooting

### Certificate Not Trusted

**Solutions:**
1. Ensure ca-bundle is included
2. Check certificate chain order
3. Verify intermediate certificates

### Mixed Content Warnings

**Solutions:**
1. Ensure all resources use HTTPS
2. Update hardcoded HTTP URLs
3. Set `ACCOUNT_DEFAULT_HTTP_PROTOCOL = 'https'`

### Certificate Renewal Fails

**Solutions:**
1. Check port 80 is accessible
2. Verify DNS is correct
3. Check certbot logs: `/var/log/letsencrypt/`

## Related Documentation

- [Snap Installation](../installation/snap.md)
- [Docker Installation](../installation/docker.md)
- [Advanced Configuration](advanced.md)

---

**Last Updated:** December 8, 2025

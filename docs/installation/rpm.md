# RPM Installation (RHEL / Rocky Linux / AlmaLinux / Fedora)

Fidus Writer provides self-contained RPM packages that include a bundled Python interpreter and all Python dependencies. No external Python or Node.js installation is required.

## Requirements

- RHEL 9+ / Rocky Linux 9+ / AlmaLinux 9+ / Fedora 39+
- `x86_64` or `aarch64` architecture
- systemd (for the included service file)

## YUM/DNF Repository (Recommended)

The easiest way to install and keep Fidus Writer up to date on RHEL-based systems is via the YUM repository hosted on GitHub Pages. The repository metadata is stored on GitHub Pages, while the actual RPM files are served from GitHub Releases.

```bash
# Add the repository
sudo tee /etc/yum.repos.d/fiduswriter.repo <<'EOF'
[fiduswriter]
name=Fidus Writer
baseurl=https://fiduswriter.github.io/fiduswriter/yum
enabled=1
gpgcheck=0
EOF

# Refresh package cache
sudo dnf makecache

# Install Fidus Writer
sudo dnf install fiduswriter-server
```

## Upgrade

When a new stable release is published, upgrade with:

```bash
sudo dnf upgrade
```

Only **stable** releases are published to the YUM repository. Beta and release-candidate tags are built and attached to GitHub Releases for testing, but they are not pushed to the YUM repo.

## Manual installation from GitHub Releases

If you prefer not to use the YUM repository, you can download the RPM directly from the [GitHub Releases page](https://github.com/fiduswriter/fiduswriter/releases) and install it manually:

```bash
# For x86_64
sudo dnf install ./fiduswriter-server-*_x86_64.rpm

# For aarch64
sudo dnf install ./fiduswriter-*_aarch64.rpm
```

`dnf` will automatically resolve and install any required system libraries (OpenSSL, zlib, libjpeg, etc.).

## After installation

1. The default configuration is created at `/etc/fiduswriter/configuration.py`. Edit it to configure your site.
2. Start and enable the service:
   ```bash
   sudo systemctl start fiduswriter
   sudo systemctl enable fiduswriter
   ```
3. Create an admin user:
   ```bash
   sudo fiduswriter initadmin
   ```

## Package contents

The RPM installs:

- `/opt/fiduswriter/python3.14/` — Bundled Python 3.14 interpreter and all Python packages
- `/usr/bin/fiduswriter` — Wrapper script that sets up the environment
- `/etc/fiduswriter/` — Configuration directory
- `/var/lib/fiduswriter/` — Data directory (documents, media)
- `/var/log/fiduswriter/` — Log directory
- `/usr/lib/systemd/system/fiduswriter.service` — systemd service file

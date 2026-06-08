# APT Repository Installation (Debian / Ubuntu / Linux Mint)

The easiest way to install Fidus Writer on Debian-based systems is via the official APT repository. Packages are built for both `amd64` and `arm64` architectures.

## Requirements

- Debian 10+ / Ubuntu 20.04+ / Linux Mint 20+
- `amd64` or `arm64` architecture
- systemd (for the included service file)

## Add the repository and install

### Traditional format (works on all versions)

```bash
# Add the APT repository
echo "deb [trusted=yes] https://fiduswriter.github.io/fiduswriter/apt stable main" | sudo tee /etc/apt/sources.list.d/fiduswriter.list

# Update package index
sudo apt-get update

# Install Fidus Writer
sudo apt-get install fiduswriter-server
```

### Modern DEB822 format (Ubuntu 24.04+, Debian 13+, Mint 22+)

If your system supports the newer `.sources` format, you can use this instead:

```bash
sudo tee /etc/apt/sources.list.d/fiduswriter.sources <<'EOF'
Types: deb
URIs: https://fiduswriter.github.io/fiduswriter/apt
Suites: stable
Components: main
Trusted: yes
Architectures: amd64 arm64
EOF

sudo apt-get update
sudo apt-get install fiduswriter-server
```

## Upgrade

When a new stable release is published, upgrade with:

```bash
sudo apt-get update
sudo apt-get upgrade
```

Only **stable** releases are published to the APT repository. Beta and release-candidate tags are built and attached to GitHub Releases for testing, but they are not pushed to the APT repo.

## Manual `.deb` installation

If you prefer not to use the APT repository, you can download the `.deb` package directly from the [GitHub Releases page](https://github.com/fiduswriter/fiduswriter/releases) and install it manually:

```bash
sudo dpkg -i fiduswriter-server_*_amd64.deb
sudo apt-get install -f
```

## After installation

1. Edit `/etc/fiduswriter/configuration.py` to configure your site.
2. Start the service:
   ```bash
   sudo systemctl start fiduswriter
   sudo systemctl enable fiduswriter
   ```
3. Create an admin user:
   ```bash
   sudo fiduswriter initadmin
   ```

## Building from source

If you want to build the Debian package yourself, see the [Debian Packaging Guide](../debian-packaging.md).

Name:           fiduswriter-server
Version:        %{?fw_version}
Release:        1%{?dist}
Summary:        Collaborative academic word processor (bundled)
License:        AGPL-3.0-or-later
URL:            https://www.fiduswriter.org
Source0:        %{name}-%{version}.tar.gz

# Python 3.14.2 configuration
%global python_version 3.14.2
%global python_major_minor 3.14
%global python_prefix /opt/fiduswriter/python%{python_major_minor}
%global python_url https://www.python.org/ftp/python/%{python_version}/Python-%{python_version}.tar.xz

BuildRequires:  gcc, make, wget
BuildRequires:  openssl-devel, libffi-devel, bzip2-devel, readline-devel
BuildRequires:  sqlite-devel, ncurses-devel, xz-devel, tk-devel
BuildRequires:  zlib-devel, libjpeg-turbo-devel
BuildRequires:  python3, python3-pip, python3-setuptools
BuildRequires:  systemd-rpm-macros

Requires:       shadow-utils, gettext, file-libs, libjpeg-turbo
Requires:       openssl-libs, libffi, bzip2-libs, readline, sqlite-libs
Requires:       ncurses-libs, xz-libs, zlib
Recommends:     nginx, httpd
Recommends:     postgresql-server, mariadb-server

%description
Fidus Writer is an online collaborative editor especially made for academics
who need to use citations and/or formulas. The editor focuses on the content
rather than the layout, so that with the same text, you can later on publish
it in multiple ways: On a website, as a printed book, or as an ebook.
.
This package includes Python compiled from source and all Python
dependencies bundled, making it self-contained and working on different
versions of RHEL-compatible distributions without requiring a modern system Python.
.
This package includes all optional modules:
  * fiduswriter-books - Book document type support
  * fiduswriter-citation-api-import - Import citations from external APIs
  * fiduswriter-languagetool - Grammar and spell checking
  * fiduswriter-ojs - Open Journal Systems integration
  * fiduswriter-pandoc - Additional export formats via Pandoc
  * fiduswriter-phplist - PHPList newsletter integration
  * fiduswriter-gitrepo-export - Export to Git repositories
  * fiduswriter-payment-paddle - Paddle payment processing
  * fiduswriter-website - Static website generation

%prep
%setup -q -n %{name}-%{version}

%build
# Download and build Python from source
wget -q %{python_url} || curl -sLO %{python_url}
tar -xf Python-%{python_version}.tar.xz
cd Python-%{python_version}
./configure \
    --prefix=%{python_prefix} \
    --enable-optimizations \
    --with-lto \
    --enable-shared \
    --with-system-ffi \
    --with-computed-gotos \
    --enable-loadable-sqlite-extensions \
    LDFLAGS="-Wl,-rpath=%{python_prefix}/lib"
make -j$(nproc)

%install
# Install Python to buildroot
cd Python-%{python_version}
make install DESTDIR=%{buildroot}

# Set up library path for build-time Python
PYTHON_BUILDLIB=%{buildroot}%{python_prefix}/lib
PYTHON_BIN=%{buildroot}%{python_prefix}/bin/python%{python_major_minor}

# Install setuptools, wheel, and babel
LD_LIBRARY_PATH=$PYTHON_BUILDLIB:$LD_LIBRARY_PATH $PYTHON_BIN -m pip install --no-cache-dir setuptools wheel babel

# Compile message catalogs
LD_LIBRARY_PATH=$PYTHON_BUILDLIB:$LD_LIBRARY_PATH $PYTHON_BIN setup.py compile_catalog || true

# Upgrade pip
LD_LIBRARY_PATH=$PYTHON_BUILDLIB:$LD_LIBRARY_PATH $PYTHON_BIN -m pip install --no-cache-dir --upgrade pip setuptools wheel

# Install all dependencies from requirements.txt
LD_LIBRARY_PATH=$PYTHON_BUILDLIB:$LD_LIBRARY_PATH $PYTHON_BIN -m pip install --no-cache-dir -r fiduswriter/requirements.txt

# Install Node.js via nodejs-wheel (required for transpile)
LD_LIBRARY_PATH=$PYTHON_BUILDLIB:$LD_LIBRARY_PATH $PYTHON_BIN -m pip install --no-cache-dir nodejs-wheel

# Install database adapters (PostgreSQL and MySQL)
LD_LIBRARY_PATH=$PYTHON_BUILDLIB:$LD_LIBRARY_PATH $PYTHON_BIN -m pip install --no-cache-dir psycopg2-binary mysqlclient

# Install all optional dependencies (plugins)
PLUGIN_PKGS=$(grep '"fiduswriter-' pyproject.toml | sed 's/.*"\(fiduswriter-[^"]*\)".*/\1/' | tr -d ' ' | tr '\n' ' ')
LD_LIBRARY_PATH=$PYTHON_BUILDLIB:$LD_LIBRARY_PATH $PYTHON_BIN -m pip install --no-cache-dir --upgrade $PLUGIN_PKGS

# Install fiduswriter package itself
LD_LIBRARY_PATH=$PYTHON_BUILDLIB:$LD_LIBRARY_PATH $PYTHON_BIN -m pip install --no-cache-dir --no-deps .

# Fix all shebang lines in bin directory
find %{buildroot}%{python_prefix}/bin -type f -exec \
    sed -i '1s|^#!.*python.*|#!%{python_prefix}/bin/python%{python_major_minor}|' {} +

# Create wrapper script
mkdir -p %{buildroot}/usr/bin
cat > %{buildroot}/usr/bin/fiduswriter << 'EOF'
#!/bin/sh
export PATH=%{python_prefix}/bin:/usr/local/bin:/usr/bin:/bin
export LD_LIBRARY_PATH=%{python_prefix}/lib:$LD_LIBRARY_PATH
export PROJECT_PATH=/var/lib/fiduswriter
export SRC_PATH=%{python_prefix}/lib/python%{python_major_minor}/site-packages/fiduswriter
cd /var/lib/fiduswriter
exec %{python_prefix}/bin/python%{python_major_minor} -m fiduswriter.manage --pythonpath /etc/fiduswriter "$@"
EOF
chmod +x %{buildroot}/usr/bin/fiduswriter

# Install configuration template
install -D -m 644 fiduswriter/configuration-default.py \
    %{buildroot}/etc/fiduswriter/configuration.py.template

# Install requirements.txt for reference
install -D -m 644 fiduswriter/requirements.txt \
    %{buildroot}/usr/share/fiduswriter/requirements.txt

# Create necessary directories
mkdir -p %{buildroot}/var/lib/fiduswriter
mkdir -p %{buildroot}/var/lib/fiduswriter/media
mkdir -p %{buildroot}/var/log/fiduswriter
mkdir -p %{buildroot}/usr/share/fiduswriter

# Install systemd service file
mkdir -p %{buildroot}%{_unitdir}
sed 's|python3\.14|python%{python_major_minor}|g' debian/fiduswriter.service > \
    %{buildroot}%{_unitdir}/fiduswriter.service
chmod 644 %{buildroot}%{_unitdir}/fiduswriter.service

# Install documentation
install -D -m 644 debian/README.Debian %{buildroot}/usr/share/doc/fiduswriter-server/README.RPM
install -D -m 644 debian/nginx-example.conf %{buildroot}/usr/share/doc/fiduswriter-server/nginx-example.conf
install -D -m 644 debian/fiduswriter.service.override.example %{buildroot}/usr/share/doc/fiduswriter-server/fiduswriter.service.override.example

%pre
getent group fiduswriter >/dev/null || groupadd -r fiduswriter
getent passwd fiduswriter >/dev/null || useradd -r -g fiduswriter -d /var/lib/fiduswriter -M -s /sbin/nologin -c "Fidus Writer" fiduswriter

%post
# Set up directory permissions
install -d -o fiduswriter -g fiduswriter -m 0750 /var/lib/fiduswriter
install -d -o fiduswriter -g fiduswriter -m 0750 /var/lib/fiduswriter/media
install -d -o fiduswriter -g fiduswriter -m 0750 /var/log/fiduswriter
install -d -o root -g root -m 0755 /etc/fiduswriter

# Copy default configuration if it doesn't exist
if [ ! -f /etc/fiduswriter/configuration.py ]; then
    if [ -f /etc/fiduswriter/configuration.py.template ]; then
        cp /etc/fiduswriter/configuration.py.template /etc/fiduswriter/configuration.py
        chmod 640 /etc/fiduswriter/configuration.py
        chown root:fiduswriter /etc/fiduswriter/configuration.py
        echo "Default configuration created at /etc/fiduswriter/configuration.py"
        echo "Please edit this file to configure your Fidus Writer installation."
    fi
fi

# Ensure configuration.py exists (create minimal one if template is missing)
if [ ! -f /etc/fiduswriter/configuration.py ]; then
    cat > /etc/fiduswriter/configuration.py << 'EOF'
# Fidus Writer Configuration
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': '/var/lib/fiduswriter/fiduswriter.db',
    }
}
ALLOWED_HOSTS = ['localhost', '127.0.0.1']
CSRF_TRUSTED_ORIGINS = ['http://localhost', 'http://127.0.0.1']
EOF
    chmod 640 /etc/fiduswriter/configuration.py
    chown root:fiduswriter /etc/fiduswriter/configuration.py
    echo "Minimal configuration created at /etc/fiduswriter/configuration.py"
fi

# Generate SECRET_KEY if not present
if [ -f /etc/fiduswriter/configuration.py ]; then
    if ! grep -q "^SECRET_KEY" /etc/fiduswriter/configuration.py; then
        SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(50))")
        echo "" >> /etc/fiduswriter/configuration.py
        echo "# Auto-generated secret key" >> /etc/fiduswriter/configuration.py
        echo "SECRET_KEY = '$SECRET_KEY'" >> /etc/fiduswriter/configuration.py
        echo "Generated SECRET_KEY in configuration file."
    fi
fi

# Set proper ownership
chown -R fiduswriter:fiduswriter /var/lib/fiduswriter
chown -R fiduswriter:fiduswriter /var/log/fiduswriter
chmod -R a+rX /opt/fiduswriter

# Ensure Python shared libraries are accessible
if [ ! -f /etc/ld.so.conf.d/fiduswriter.conf ]; then
    PYTHON_LIB=$(ls -d /opt/fiduswriter/python*/lib 2>/dev/null | head -1)
    if [ -n "$PYTHON_LIB" ]; then
        echo "$PYTHON_LIB" > /etc/ld.so.conf.d/fiduswriter.conf
        ldconfig
    fi
fi

%systemd_post fiduswriter.service

%preun
%systemd_preun fiduswriter.service

%postun
%systemd_postun_with_restart fiduswriter.service
if [ "$1" -eq 0 ]; then
    # Complete removal (not upgrade)
    rm -rf /opt/fiduswriter
    rm -f /etc/ld.so.conf.d/fiduswriter.conf
    ldconfig
    userdel fiduswriter 2>/dev/null || true
    groupdel fiduswriter 2>/dev/null || true
fi

%files
%attr(750, fiduswriter, fiduswriter) /var/lib/fiduswriter
%attr(750, fiduswriter, fiduswriter) /var/log/fiduswriter
%dir %attr(755, root, root) /etc/fiduswriter
%config(noreplace) %attr(640, root, fiduswriter) /etc/fiduswriter/configuration.py.template
%attr(755, root, root) /opt/fiduswriter
%attr(755, root, root) /usr/bin/fiduswriter
%{_unitdir}/fiduswriter.service
%doc /usr/share/doc/fiduswriter-server/*
%doc /usr/share/fiduswriter/requirements.txt

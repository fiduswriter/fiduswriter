#!/bin/bash
# Script to build Fidus Writer RPM packages with bundled dependencies
# Usage: ./build-rpm.sh
#
# The Python/Django source now lives in the fiduswriter-server-backend
# repository; this repository only holds packaging, docs and dev-scripts.
# This script stages the backend source together with the local rpm/
# packaging directory into a scratch tree and builds there.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Locate (or clone) the backend checkout.
if [ -n "${FIDUSWRITER_BACKEND_DIR:-}" ]; then
    BACKEND_DIR="$FIDUSWRITER_BACKEND_DIR"
else
    BACKEND_DIR="$SCRIPT_DIR/fiduswriter-server-backend"
fi
if [ ! -d "$BACKEND_DIR" ]; then
    echo "Cloning fiduswriter-server-backend into $BACKEND_DIR..."
    git clone --depth 1 https://github.com/fiduswriter/fiduswriter-server-backend.git "$BACKEND_DIR"
fi

# Stage backend source + rpm/ packaging into a scratch tree.
STAGE_DIR="$SCRIPT_DIR/rpm-build/stage"
rm -rf "$STAGE_DIR"
mkdir -p "$STAGE_DIR"
cp -a "$BACKEND_DIR"/. "$STAGE_DIR"/
cp -a "$SCRIPT_DIR/rpm" "$STAGE_DIR/rpm"
# The spec's %install section customizes the systemd unit that lives next
# to the Debian packaging files.
cp -a "$SCRIPT_DIR/debian" "$STAGE_DIR/debian"
cd "$STAGE_DIR"

echo "======================================"
echo "Fidus Writer RPM Package Builder"
echo "Bundled Dependencies Approach"
echo "======================================"
echo ""

# Check if we're in the right directory
if [ ! -f "pyproject.toml" ] || [ ! -d "rpm" ]; then
    echo "Error: This script must be run from the fiduswriter root directory"
    echo "       (the directory containing pyproject.toml and rpm/)"
    exit 1
fi

# Check for required tools
command -v rpmbuild >/dev/null 2>&1 || {
    echo "Error: rpmbuild not found. Install with:"
    echo "  dnf install rpm-build"
    exit 1
}

# Create build output directory
BUILD_DIR="rpm-build"
mkdir -p "$BUILD_DIR"
echo "Build artifacts will be placed in: $BUILD_DIR/"
echo ""

# Clean previous builds
echo "Cleaning previous build artifacts..."
rm -rf "$BUILD_DIR"/*.rpm 2>/dev/null || true
rm -rf ~/rpmbuild/BUILD/fiduswriter-server-* 2>/dev/null || true
rm -rf ~/rpmbuild/BUILDROOT/fiduswriter-server-* 2>/dev/null || true
echo "Build artifacts cleaned."
echo ""

# Sync version from fiduswriter/version.txt
echo "Syncing version information..."
FW_VERSION=$(tr -d '[:space:]' < fiduswriter/version.txt)
RPM_VERSION="$FW_VERSION"

echo "  Upstream version : $FW_VERSION"
echo "  RPM version      : $RPM_VERSION"

# Set up rpmbuild directory structure
mkdir -p ~/rpmbuild/{SPECS,SOURCES,BUILD,RPMS,SRPMS}

# Create source tarball
echo ""
echo "Creating source tarball..."
TARBALL="$HOME/rpmbuild/SOURCES/fiduswriter-server-${RPM_VERSION}.tar.gz"
if [ -f "$TARBALL" ]; then
    rm -f "$TARBALL"
fi
# Create tarball with the directory name matching what %setup expects
tar czf "$TARBALL" \
    --exclude='.git' \
    --exclude='debian-build' \
    --exclude='rpm-build' \
    --exclude='debian/fiduswriter' \
    --exclude='debian/.debhelper' \
    --exclude='debian/tmp' \
    --exclude='*.egg-info' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='.python-build-cache' \
    --exclude='fiduswriter/.transpile' \
    --exclude='fiduswriter/static-transpile' \
    --exclude='fiduswriter/static-collected' \
    --exclude='fiduswriter/static-libs' \
    --exclude='fiduswriter/node_modules' \
    --exclude='build' \
    --exclude='dist' \
    --exclude='.pybuild' \
    --exclude='Python-*' \
    --exclude='.coverage*' \
    --exclude='screenshots' \
    --transform "s|^|fiduswriter-server-${RPM_VERSION}/|" \
    .
echo "Source tarball created: $TARBALL"

# Copy spec file
cp rpm/fiduswriter-server.spec ~/rpmbuild/SPECS/

# Build packages
echo ""
echo "Building RPM package..."
echo ""

rpmbuild -bb \
    --define "fw_version ${RPM_VERSION}" \
    ~/rpmbuild/SPECS/fiduswriter-server.spec

# Move packages to build directory
echo ""
echo "Moving packages to $BUILD_DIR/..."
find ~/rpmbuild/RPMS -name "fiduswriter-server-*.rpm" -exec mv {} "$BUILD_DIR/" \;

echo ""
echo "======================================"
echo "Build Complete!"
echo "======================================"
echo ""
echo "Packages created in $BUILD_DIR/:"
ls -lh "$BUILD_DIR"/*.rpm 2>/dev/null || echo "No .rpm files found"
echo ""
echo "To install:"
echo "  sudo dnf install $BUILD_DIR/fiduswriter-server-*.rpm"
echo ""
echo "Documentation:"
echo "  Build guide: docs/debian-packaging.md"
echo "  User guide:  /usr/share/doc/fiduswriter-server/README.RPM (after install)"
echo ""
echo "Package includes all optional modules: books, ojs, pandoc, languagetool, etc."
echo ""

# Copy build artifacts back into this repository's build directory.
mkdir -p "$SCRIPT_DIR/rpm-build"
find "$STAGE_DIR"/rpm-build -name "*.rpm" -exec cp {} "$SCRIPT_DIR/rpm-build/" \; 2>/dev/null || true
echo "Artifacts copied to $SCRIPT_DIR/rpm-build/"

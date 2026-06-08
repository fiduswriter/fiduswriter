#!/bin/bash
# Script to build Fidus Writer RPM packages with bundled dependencies
# Usage: ./build-rpm.sh

set -e

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

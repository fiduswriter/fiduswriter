#!/bin/bash
# Script to build Fidus Writer Debian packages with bundled dependencies
# Usage: ./build-deb.sh

set -e

echo "======================================"
echo "Fidus Writer Debian Package Builder"
echo "Bundled Dependencies Approach"
echo "======================================"
echo ""

# Check if we're in the right directory
if [ ! -f "pyproject.toml" ] || [ ! -d "debian" ]; then
    echo "Error: This script must be run from the fiduswriter root directory"
    echo "       (the directory containing pyproject.toml and debian/)"
    exit 1
fi

# Check for required tools
command -v dpkg-buildpackage >/dev/null 2>&1 || {
    echo "Error: dpkg-buildpackage not found. Install with:"
    echo "  sudo apt install dpkg-dev debhelper dh-python"
    exit 1
}

command -v dh_virtualenv >/dev/null 2>&1 || {
    echo "Error: dh-virtualenv not found. Install with:"
    echo "  sudo apt install dh-virtualenv"
    exit 1
}

command -v python3 >/dev/null 2>&1 || {
    echo "Error: python3 not found"
    exit 1
}

# Create build output directory
BUILD_DIR="debian-build"
mkdir -p "$BUILD_DIR"
echo "Build artifacts will be placed in: $BUILD_DIR/"
echo ""

# Ensure debian/rules is executable
chmod +x debian/rules

# Clean previous builds
echo "Cleaning previous build artifacts..."
rm -rf debian/fiduswriter 2>/dev/null || sudo rm -rf debian/fiduswriter
rm -rf debian/.debhelper 2>/dev/null || sudo rm -rf debian/.debhelper
rm -rf debian/tmp 2>/dev/null || sudo rm -rf debian/tmp
rm -rf debian/fiduswriter-*/ 2>/dev/null || true
rm -f debian/files
rm -f debian/*.substvars
rm -f debian/*.debhelper.log
find debian -name "*.debhelper" -delete 2>/dev/null || true
rm -rf build dist *.egg-info
rm -rf fiduswriter/.transpile fiduswriter/static-transpile fiduswriter/static-collected
rm -rf .pybuild
rm -rf Python-3.14.2 Python-3.14.2.tar.xz
find . -name "*.pyc" -delete
find . -name "*.mo" -delete
find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true

# Clean old packages from build directory
rm -f "$BUILD_DIR"/*.deb 2>/dev/null || true
rm -f "$BUILD_DIR"/*.changes 2>/dev/null || true
rm -f "$BUILD_DIR"/*.buildinfo 2>/dev/null || true

echo "Build artifacts cleaned."
echo ""

# All modules are now included in the main package
echo "Building single package with all modules included..."
echo ""

# Check and install build dependencies
echo "Checking build dependencies..."
if ! dpkg-checkbuilddeps 2>/dev/null; then
    echo ""
    echo "Missing build dependencies. Installing..."
    sudo apt-get update
    sudo mk-build-deps -i -r -t "apt-get -y --no-install-recommends" debian/control || {
        echo "Error: Failed to install build dependencies"
        echo "You may need to run manually:"
        echo "  sudo apt install build-essential debhelper dh-python dh-virtualenv"
        echo "  sudo apt install python3-all python3-dev python3-venv python3-pip"
        echo "  sudo apt install libjpeg-dev zlib1g-dev libmagic1 nodejs npm"
        exit 1
    }
fi

echo "Build dependencies satisfied."
echo ""

# Build packages
echo "Building binary packages..."
dpkg-buildpackage -b -us -uc

# Move packages to build directory
echo ""
echo "Moving packages to $BUILD_DIR/..."
mv ../*.deb "$BUILD_DIR/" 2>/dev/null || true
mv ../*.changes "$BUILD_DIR/" 2>/dev/null || true
mv ../*.buildinfo "$BUILD_DIR/" 2>/dev/null || true

# Final cleanup
echo "Cleaning up build artifacts..."
rm -f Python-3.14.2.tar.xz
rm -rf Python-3.14.2
echo "Done!"
echo ""

echo ""
echo "======================================"
echo "Build Complete!"
echo "======================================"
echo ""
echo "Packages created in $BUILD_DIR/:"
ls -lh "$BUILD_DIR"/*.deb 2>/dev/null || echo "No .deb files found"
echo ""
echo "To install:"
echo "  Main package:     sudo dpkg -i $BUILD_DIR/fiduswriter_*.deb"
echo "  Fix dependencies: sudo apt-get install -f"
echo ""

echo ""
echo "Documentation:"
echo "  Build guide: docs/debian-packaging.md"
echo "  User guide:  /usr/share/doc/fiduswriter/README.Debian (after install)"
echo ""
echo "Package includes all optional modules (books, ojs, pandoc, languagetool, etc.)"
echo ""
echo "Works on all versions of Ubuntu and Debian that have not reacehd EOL."
echo ""

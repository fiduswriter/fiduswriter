#!/usr/bin/env bash
#
# Build the Linux installers (AppImage, deb, rpm) for the Fidus Writer desktop
# application.
#
# Tauri's bundler produces all three, so this is a thin wrapper that keeps the
# repository's conventions: the version comes from version.txt, artifacts land
# in `desktop-build/`, and the .desktop entry with the real `Exec` line is
# installed alongside the app.
#
# Usage:
#     desktop/linux/build-linux.sh [--appimage] [--deb] [--rpm]
#
# With no arguments all three are built.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"

DESKTOP_DIR="${FIDUSWRITER_DESKTOP_DIR:-$REPO/../fiduswriter-desktop}"
OUT_DIR="$REPO/desktop-build"

BUILD_APPIMAGE=0
BUILD_DEB=0
BUILD_RPM=0
if [[ $# -eq 0 ]]; then
    BUILD_APPIMAGE=1
    BUILD_DEB=1
    BUILD_RPM=1
else
    for arg in "$@"; do
        case "$arg" in
            --appimage) BUILD_APPIMAGE=1 ;;
            --deb) BUILD_DEB=1 ;;
            --rpm) BUILD_RPM=1 ;;
            *) echo "Unknown option: $arg" >&2; exit 2 ;;
        esac
    done
fi

VERSION="$("$HERE/../version.sh")"
echo "Fidus Writer desktop version: $VERSION"

if [[ ! -d "$DESKTOP_DIR" ]]; then
    cat >&2 <<EOF
Desktop application not found at:
  $DESKTOP_DIR
Set FIDUSWRITER_DESKTOP_DIR to the fiduswriter-desktop checkout.
EOF
    exit 1
fi

# --- Bundle the frontend and the Tauri application --------------------------
echo "Building the application (this also runs the esbuild bundle)..."
cd "$DESKTOP_DIR"
pnpm install --frozen-lockfile
pnpm run build

TARGETS=()
(( BUILD_APPIMAGE )) && TARGETS+=("appimage")
(( BUILD_DEB ))      && TARGETS+=("deb")
(( BUILD_RPM ))      && TARGETS+=("rpm")

if [[ ${#TARGETS[@]} -eq 0 ]]; then
    echo "No Linux targets selected."
    exit 0
fi

ARGS=()
for target in "${TARGETS[@]}"; do
    ARGS+=("--bundles" "$target")
done

echo "Running: pnpm run tauri build ${ARGS[*]}"
pnpm run tauri build "${ARGS[@]}"

# --- Collect artifacts ------------------------------------------------------
BUNDLE="$DESKTOP_DIR/src-tauri/target/release/bundle"
mkdir -p "$OUT_DIR"

for target in appimage deb rpm; do
    if [[ -d "$BUNDLE/$target" ]]; then
        cp -v "$BUNDLE/$target"/* "$OUT_DIR/" 2>/dev/null || true
    fi
done

# --- .desktop entry ---------------------------------------------------------
#
# The app installs its own .desktop entry whose Exec is the real binary. The
# `fiduswriter-file-types` package provides the MIME definitions and the icons;
# this entry provides the executable, so the two do not conflict.
DESKTOP_ENTRY="$HERE/fiduswriter-desktop.desktop"
if [[ -f "$DESKTOP_ENTRY" ]]; then
    # Validate before shipping: a malformed entry silently disables
    # double-click-to-open.
    if command -v desktop-file-validate >/dev/null 2>&1; then
        desktop-file-validate "$DESKTOP_ENTRY" || {
            echo "ERROR: $DESKTOP_ENTRY failed validation." >&2
            exit 1
        }
    fi
    mkdir -p "$OUT_DIR/linux"
    cp -v "$DESKTOP_ENTRY" "$OUT_DIR/linux/"
    echo "Wrote $OUT_DIR/linux/$(basename "$DESKTOP_ENTRY")"
fi

echo ""
echo "Artifacts in $OUT_DIR:"
ls -la "$OUT_DIR"
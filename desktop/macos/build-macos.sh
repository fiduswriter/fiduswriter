#!/usr/bin/env bash
#
# Build the macOS .app and .dmg for the Fidus Writer desktop application, then
# sign and notarize it.
#
# Requires macOS with Xcode command line tools. The Tauri application must be
# built first:
#
#     cd ../fiduswriter-desktop && pnpm install && pnpm run tauri build
#
# Usage:
#     desktop/macos/build-macos.sh [--sign]
#
# With --sign, the bundle is signed with a Developer ID identity and submitted
# for notarization. Both require credentials in the environment:
#
#     SIGNING_IDENTITY   "Developer ID Application: Your Name (TEAMID)"
#     NOTARY_PROFILE     a `xcrun notarytool store-credentials` profile name
#     NOTARY_TEAM_ID     the Apple team id
#
# Without --sign the script still produces a working, unsigned bundle, which is
# useful for local testing but is blocked by Gatekeeper on other machines.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"

DESKTOP_DIR="${FIDUSWRITER_DESKTOP_DIR:-$REPO/../fiduswriter-desktop}"
BUNDLE_DIR="$DESKTOP_DIR/src-tauri/target/release/bundle/macos"
APP_NAME="Fidus Writer.app"
APP_PATH="$BUNDLE_DIR/$APP_NAME"

SIGN=0
for arg in "$@"; do
    case "$arg" in
        --sign) SIGN=1 ;;
        *) echo "Unknown option: $arg" >&2; exit 2 ;;
    esac
done

if [[ ! -d "$APP_PATH" ]]; then
    cat >&2 <<EOF
Application bundle not found at:
  $APP_PATH

Build it first:
  cd "$DESKTOP_DIR" && pnpm install && pnpm run tauri build
EOF
    exit 1
fi

# --- File type declarations -------------------------------------------------
#
# Fidus Writer owns its own formats, so the bundle declares them as *exported*
# UTIs and takes Owner rank in LaunchServices. The declarations are maintained in
# the fiduswriter-file-types repository and merged here rather than duplicated,
# so the two cannot drift. See that repository's macos/INTEGRATION.md.
UTI_PLIST="$REPO/../fiduswriter-file-types/macos/UTI-declarations.plist"
if [[ -f "$UTI_PLIST" ]]; then
    echo "Merging file type declarations into Info.plist"
    /usr/libexec/PlistBuddy -c "Merge $UTI_PLIST" "$APP_PATH/Contents/Info.plist"
else
    echo "WARNING: $UTI_PLIST not found; skipping UTI declarations." >&2
    echo "The app will build but double-clicking a .fidus file will not open it." >&2
fi

# --- Icon ------------------------------------------------------------------
ICNS_SRC="$REPO/../fiduswriter-file-types/icons/hicolor/512x512/apps/fiduswriter.png"
if [[ -f "$ICNS_SRC" ]]; then
    ICONSET="$(mktemp -d)/FidusWriter.iconset"
    mkdir -p "$ICONSET"
    for spec in "16 icon_16x16" "32 icon_16x16@2x" "32 icon_32x32" \
                "64 icon_32x32@2x" "128 icon_128x128" "256 icon_128x128@2x" \
                "256 icon_256x256" "512 icon_256x256@2x" "512 icon_512x512" \
                "1024 icon_512x512@2x"; do
        size="${spec%% *}"
        name="${spec##* }"
        sips -z "$size" "$size" "$ICNS_SRC" --out "$ICONSET/$name.png" >/dev/null
    done
    iconutil -c icns "$ICONSET" -o "$APP_PATH/Contents/Resources/fiduswriter.icns"
    /usr/libexec/PlistBuddy -c "Set :CFBundleIconFile fiduswriter" \
        "$APP_PATH/Contents/Info.plist" 2>/dev/null || \
        /usr/libexec/PlistBuddy -c "Add :CFBundleIconFile string fiduswriter" \
            "$APP_PATH/Contents/Info.plist"
    echo "Wrote application icon"
fi

# Refresh LaunchServices so the new declarations take effect locally.
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister \
    -f "$APP_PATH" || true

# --- Create the disk image --------------------------------------------------
DMG_DIR="$REPO/desktop-build"
mkdir -p "$DMG_DIR"
DMG_PATH="$DMG_DIR/fiduswriter-desktop-$(${HERE}/../version.sh).dmg"
rm -f "$DMG_PATH"

echo "Creating $DMG_PATH"
hdiutil create \
    -volname "$APP_NAME" \
    -srcfolder "$APP_PATH" \
    -ov -format UDZO "$DMG_PATH"

# --- Sign and notarize ------------------------------------------------------
if [[ "$SIGN" == "1" ]]; then
    : "${SIGNING_IDENTITY:?SIGNING_IDENTITY must be set when using --sign}"
    : "${NOTARY_PROFILE:?NOTARY_PROFILE must be set when using --sign}"
    : "${NOTARY_TEAM_ID:?NOTARY_TEAM_ID must be set when using --sign}"

    echo "Signing with: $SIGNING_IDENTITY"
    # Sign the inner bundle first, then the outer one: a nested signature is
    # invalid when the outer container changes.
    codesign --force --deep --options runtime --timestamp \
        --sign "$SIGNING_IDENTITY" "$APP_PATH"
    codesign --verify --deep --strict --verbose=2 "$APP_PATH"

    echo "Submitting for notarization"
    xcrun notarytool submit "$DMG_PATH" \
        --keychain-profile "$NOTARY_PROFILE" \
        --team-id "$NOTARY_TEAM_ID" \
        --wait

    echo "Stapling ticket"
    xcrun stapler staple "$DMG_PATH"
    xcrun stapler staple "$APP_PATH"
else
    echo "Built unsigned. Pass --sign (with the credentials above) to sign and notarize."
fi

echo "Done: $DMG_PATH"
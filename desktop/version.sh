#!/usr/bin/env bash
#
# Print the Fidus Writer version.
#
# `fiduswriter-server-backend/fiduswriter/version.txt` is the single source of
# truth for every Fidus Writer distribution (server, deb, rpm, snap, docker and
# the desktop application), exactly as `build-deb.sh` and `build-rpm.sh` use it.
# Reading it here keeps the desktop artifacts on the same version as the server
# without introducing a second place to bump it.
#
# Honours FIDUSWRITER_BACKEND_DIR, like the other build scripts in this
# repository.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_DIR="${FIDUSWRITER_BACKEND_DIR:-$REPO/fiduswriter-server-backend}"
VERSION_FILE="$BACKEND_DIR/fiduswriter/version.txt"

if [[ ! -f "$VERSION_FILE" ]]; then
    echo "Could not read the Fidus Writer version." >&2
    echo "Expected: $VERSION_FILE" >&2
    echo "Set FIDUSWRITER_BACKEND_DIR to the backend checkout." >&2
    exit 1
fi

tr -d '[:space:]' < "$VERSION_FILE"
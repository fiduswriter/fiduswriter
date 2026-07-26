#!/usr/bin/env bash
#
# Publish the @fiduswriter sibling npm packages from their local checkouts.
#
# Usage:
#   ./dev-scripts/publish-sibling-packages.sh
#   ./dev-scripts/publish-sibling-packages.sh --dry-run
#
# The script looks for sibling repositories in the parent directory of the
# Fidus Writer repository. Override with FIDUSWRITER_SIBLINGS_DIR.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && git rev-parse --show-toplevel)"

SIBLINGS_DIR="${FIDUSWRITER_SIBLINGS_DIR:-$REPO_ROOT/..}"

DRY_RUN="${1:-}"
NPM_ARGS=()
if [[ "$DRY_RUN" == "--dry-run" ]]; then
    NPM_ARGS+=("--dry-run")
    echo "Dry-run mode: no packages will actually be published."
fi

PACKAGES=(
    fiduswriter-editor-js
    fiduswriter-frontend-js
    fiduswriter-document-template-editor-js
    fiduswriter-bibliography-manager-js
    fiduswriter-image-manager-js
    fiduswriter-books-document-js
)

for pkg in "${PACKAGES[@]}"; do
    pkg_dir="$SIBLINGS_DIR/$pkg"
    if [[ ! -d "$pkg_dir" ]]; then
        echo "Warning: $pkg_dir not found, skipping $pkg" >&2
        continue
    fi
    echo "Publishing $pkg..."
    (cd "$pkg_dir" && npm publish "${NPM_ARGS[@]}")
done

echo "Done."

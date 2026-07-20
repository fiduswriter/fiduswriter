#!/usr/bin/env bash
#
# Switch @fiduswriter dependencies in the Fidus Writer package.json5 files
# between published npm versions and local sibling package sources.
#
# Usage:
#   ./dev-scripts/switch-local-deps.sh local
#   ./dev-scripts/switch-local-deps.sh npm
#
# Environment variables:
#   FIDUSWRITER_SIBLINGS_DIR      Directory containing the sibling @fiduswriter
#                                 package repositories.
#                                 Default: parent directory of this git repo.
#
#   FIDUSWRITER_INSTALL_DIR       Directory where pnpm/npm install is run
#                                 (the merged package.json location).
#                                 Default: <repo-root>/fiduswriter/.transpile

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && git rev-parse --show-toplevel)"

SIBLINGS_DIR="${FIDUSWRITER_SIBLINGS_DIR:-$REPO_ROOT/..}"
INSTALL_DIR="${FIDUSWRITER_INSTALL_DIR:-$REPO_ROOT/fiduswriter/.transpile}"

MODE="${1:-}"

if [[ "$MODE" != "local" && "$MODE" != "npm" ]]; then
    cat >&2 <<EOF
Usage: $(basename "$0") [local|npm]

Switch @fiduswriter dependencies between local file: paths and npm versions.

Environment variables:
  FIDUSWRITER_SIBLINGS_DIR      Sibling package directory.
                                Current: $SIBLINGS_DIR
  FIDUSWRITER_INSTALL_DIR       Merged package.json directory.
                                Current: $INSTALL_DIR
EOF
    exit 1
fi

declare -A PACKAGE_DIRS=(
    ["@fiduswriter/bibliography-manager"]="fiduswriter-bibliography-manager-js"
    ["@fiduswriter/document"]="fiduswriter-document-js"
    ["@fiduswriter/document-template-editor"]="fiduswriter-document-template-editor-js"
    ["@fiduswriter/editor"]="fiduswriter-editor-js"
    ["@fiduswriter/frontend"]="fiduswriter-common-js"
)

MAIN_FILES=(
    "$REPO_ROOT/fiduswriter/document/package.json5"
    "$REPO_ROOT/fiduswriter/base/package.json5"
)

# Sibling packages that depend on other sibling packages.
# Format: "sibling-dir:dep1,dep2,..."
SIBLING_PACKAGES=(
    "fiduswriter-document-js:@fiduswriter/bibliography-manager"
    "fiduswriter-document-template-editor-js:@fiduswriter/document"
    "fiduswriter-editor-js:@fiduswriter/bibliography-manager,@fiduswriter/document"
    "fiduswriter-common-js:@fiduswriter/bibliography-manager,@fiduswriter/document,@fiduswriter/document-template-editor,@fiduswriter/editor"
)

update_file() {
    local file="$1"
    local pkg="$2"
    local new_value="$3"

    python3 - "$file" "$pkg" "$new_value" <<'PY'
import sys, re
path, pkg, new_value = sys.argv[1:4]
with open(path) as fh:
    content = fh.read()
pattern = rf'("{re.escape(pkg)}")\s*:\s*"[^"]*"'
replacement = rf'\1: "{new_value}"'
new_content, n = re.subn(pattern, replacement, content)
if n:
    with open(path, "w") as fh:
        fh.write(new_content)
    print(f"  {path}: {pkg} -> {new_value}")
PY
}

switch_main_file() {
    local file="$1"
    local pkg="$2"
    local dir_name="$3"
    local sibling_path="$SIBLINGS_DIR/$dir_name"

    if [[ "$MODE" == "local" ]]; then
        if [[ ! -d "$sibling_path" ]]; then
            return
        fi
        local rel_path
        rel_path="$(python3 -c "import os,sys; print(os.path.relpath(sys.argv[1], sys.argv[2]))" "$sibling_path" "$INSTALL_DIR")"
        update_file "$file" "$pkg" "file:$rel_path"
    else
        if [[ ! -f "$sibling_path/package.json" ]]; then
            return
        fi
        local version
        version="$(python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['version'])" "$sibling_path/package.json")"
        update_file "$file" "$pkg" "^$version"
    fi
}

handle_bibliography_manager() {
    # The bibliography app does not directly import @fiduswriter/bibliography-manager,
    # but it must be a root dependency in local mode so pnpm installs the local
    # package at the top level. The sibling package.json files then ensure the
    # transitive dependency chain also uses the local copy.
    local file="$REPO_ROOT/fiduswriter/bibliography/package.json5"
    local pkg="@fiduswriter/bibliography-manager"
    local dir_name="${PACKAGE_DIRS[$pkg]}"
    local sibling_path="$SIBLINGS_DIR/$dir_name"

    if [[ "$MODE" == "local" ]]; then
        if [[ ! -d "$sibling_path" ]]; then
            return
        fi
        if grep -q "\"$pkg\"" "$file" 2>/dev/null; then
            return
        fi
        local rel_path
        rel_path="$(python3 -c "import os,sys; print(os.path.relpath(sys.argv[1], sys.argv[2]))" "$sibling_path" "$INSTALL_DIR")"
        python3 - "$file" "$pkg" "$rel_path" <<'PY'
import sys, re
path, pkg, rel = sys.argv[1:4]
with open(path) as fh:
    content = fh.read()
pattern = r'(dependencies:\s*\{\s*\n)'
replacement = rf'\1        "{pkg}": "file:{rel}",\n'
new_content, n = re.subn(pattern, replacement, content)
if n:
    with open(path, "w") as fh:
        fh.write(new_content)
PY
    else
        if grep -q "\"$pkg\"" "$file" 2>/dev/null; then
            python3 - "$file" "$pkg" <<'PY'
import sys, re
path, pkg = sys.argv[1:3]
with open(path) as fh:
    content = fh.read()
pattern = rf'^\s*"{re.escape(pkg)}":\s*"[^"]*",?\s*\n'
new_content, n = re.subn(pattern, '', content, flags=re.MULTILINE)
if n:
    with open(path, "w") as fh:
        fh.write(new_content)
    print(f"  {path}: {pkg} removed")
PY
        fi
    fi
}

switch_sibling_file() {
    local sibling_dir_name="$1"
    local deps_spec="$2"
    local sibling_path="$SIBLINGS_DIR/$sibling_dir_name"
    local pkg_file="$sibling_path/package.json"

    if [[ ! -f "$pkg_file" ]]; then
        echo "Warning: sibling package.json not found: $pkg_file" >&2
        return
    fi

    IFS=',' read -ra deps <<< "$deps_spec"
    for pkg in "${deps[@]}"; do
        local dep_dir_name="${PACKAGE_DIRS[$pkg]}"
        local dep_path="$SIBLINGS_DIR/$dep_dir_name"

        if [[ "$MODE" == "local" ]]; then
            if [[ ! -d "$dep_path" ]]; then
                continue
            fi
            local rel_path
            rel_path="$(python3 -c "import os,sys; print(os.path.relpath(sys.argv[1], sys.argv[2]))" "$dep_path" "$sibling_path")"
            update_file "$pkg_file" "$pkg" "file:$rel_path"
        else
            if [[ ! -f "$dep_path/package.json" ]]; then
                continue
            fi
            local version
            version="$(python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['version'])" "$dep_path/package.json")"
            update_file "$pkg_file" "$pkg" "^$version"
        fi
    done
}

echo "Switching @fiduswriter dependencies to $MODE mode..."

handle_bibliography_manager

for file in "${MAIN_FILES[@]}"; do
    if [[ ! -f "$file" ]]; then
        echo "Warning: file not found: $file" >&2
        continue
    fi
    for pkg in "${!PACKAGE_DIRS[@]}"; do
        switch_main_file "$file" "$pkg" "${PACKAGE_DIRS[$pkg]}"
    done
done

for entry in "${SIBLING_PACKAGES[@]}"; do
    sibling_dir_name="${entry%%:*}"
    deps_spec="${entry#*:}"
    switch_sibling_file "$sibling_dir_name" "$deps_spec"
done

echo "Done."

if [[ "$MODE" == "local" ]]; then
    cat <<EOF

Next steps:
  1. Run npm install in any sibling packages whose transitive deps changed
     (fiduswriter-document-js, fiduswriter-editor-js, fiduswriter-common-js)
     if you will be building them directly.
  2. Rebuild any sibling packages you modified (e.g. npm run build in
     fiduswriter-bibliography-manager-js).
  3. Run python fiduswriter/manage.py transpile --force
  4. Hard-reload the browser (disable cache in dev tools).
EOF
fi

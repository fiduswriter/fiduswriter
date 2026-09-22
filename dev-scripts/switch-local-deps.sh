#!/usr/bin/env bash
#
# Switch @fiduswriter dependencies in the Fidus Writer package.json5 files
# between published npm versions and local sibling package sources.
#
# Usage:
#   ./dev-scripts/switch-local-deps.sh local
#   ./dev-scripts/switch-local-deps.sh npm
#
# Covers:
#   - the Django backend's core apps (fiduswriter-server-backend) and the
#     Django plugin apps (plugin repos under the siblings dir),
#   - the sibling packages' own package.json files (file: deps between
#     siblings, including fiduswriter-dav-ts),
#   - the standalone repos fiduswriter-nextcloud and fiduswriter-wordpress,
#     whose package.json lives in the repo root and is installed there,
#   - the pagination packages (paged-with-floats, pages-to-pdf,
#     vivliostyle-pdf) in fiduswriter-document-ts and in the
#     fiduswriter-vivliostyle plugin repo, from the pagination dir.
#
# Whenever a package.json is rewritten, `pnpm install` is run in that package
# afterwards so its lockfile stays in sync with package.json. (The Django
# apps' package.json5 files are merged and installed through
# `manage.py transpile` instead.)
#
# Environment variables:
#   FIDUSWRITER_SIBLINGS_DIR      Directory containing the sibling @fiduswriter
#                                 package repositories.
#                                 Default: parent directory of this git repo.
#
#   FIDUSWRITER_BACKEND_DIR       Directory of the fiduswriter-server-backend
#                                 checkout. Its core app package.json5 files
#                                 (e.g. base) are updated.
#                                 Default: <siblings-dir>/fiduswriter-server-backend
#
#   Plugin app package.json5 files are resolved from their sibling plugin
#   repos under $SIBLINGS_DIR (e.g. fiduswriter-tum-plugin/fiduswriter/tum),
#   independent of whether the app is symlinked into the backend repo.
#
#   FIDUSWRITER_INSTALL_DIR       Directory where pnpm install is run
#                                 for the merged Django backend package.json.
#                                 Default: <backend-root>/.transpile
#                                 (Not used by the standalone repos, which
#                                 install in their own root.)
#
#   FIDUSWRITER_PAGINATION_DIR    Directory containing the pagination package
#                                 checkouts (paged-with-floats, pages-to-pdf,
#                                 vivliostyle-pdf).
#                                 Default: <siblings-dir>/../pagination

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && git rev-parse --show-toplevel)"

SIBLINGS_DIR="${FIDUSWRITER_SIBLINGS_DIR:-$REPO_ROOT/..}"
BACKEND_DIR="${FIDUSWRITER_BACKEND_DIR:-$SIBLINGS_DIR/fiduswriter-server-backend}"
INSTALL_DIR="${FIDUSWRITER_INSTALL_DIR:-$BACKEND_DIR/fiduswriter/.transpile}"
PAGINATION_DIR="${FIDUSWRITER_PAGINATION_DIR:-$SIBLINGS_DIR/../pagination}"

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

# Directories whose package.json was rewritten. After switching, `pnpm
# install` runs in each (in dependency order) so the lockfile and
# package.json stay in sync.
CHANGED_DIRS_FILE="$(mktemp)"
trap 'rm -f "$CHANGED_DIRS_FILE"' EXIT

record_changed_dir() {
    local dir="$1"
    [[ -n "$dir" ]] || return 0
    if ! grep -qxF -- "$dir" "$CHANGED_DIRS_FILE" 2>/dev/null; then
        printf '%s\n' "$dir" >> "$CHANGED_DIRS_FILE"
    fi
}

is_changed_dir() {
    grep -qxF -- "$1" "$CHANGED_DIRS_FILE" 2>/dev/null
}

# Local-install order: dependencies before dependents, so a package's
# `prepare` script can build against packages that were installed first.
INSTALL_ORDER=(
    "fwtoolkit"
    "fiduswriter-document-ts"
    "fiduswriter-image-manager-ts"
    "fiduswriter-bibliography-manager-ts"
    "fiduswriter-document-template-editor-ts"
    "fiduswriter-editor-ts"
    "fiduswriter-dav-ts"
    "fiduswriter-frontend-ts"
    "fiduswriter-books-plugin-ts"
    "fiduswriter-pandoc-plugin-ts"
    "fiduswriter-cli-ts"
    "fiduswriter-nextcloud"
    "fiduswriter-wordpress"
)

declare -A PACKAGE_DIRS=(
    ["@fiduswriter/bibliography-manager"]="fiduswriter-bibliography-manager-ts"
    ["@fiduswriter/books-document"]="fiduswriter-books-plugin-ts"
    ["@fiduswriter/dav"]="fiduswriter-dav-ts"
    ["@fiduswriter/document"]="fiduswriter-document-ts"
    ["@fiduswriter/cli"]="fiduswriter-cli-ts"
    ["@fiduswriter/document-template-editor"]="fiduswriter-document-template-editor-ts"
    ["@fiduswriter/editor"]="fiduswriter-editor-ts"
    ["@fiduswriter/frontend"]="fiduswriter-frontend-ts"
    ["@fiduswriter/image-manager"]="fiduswriter-image-manager-ts"
    ["@fiduswriter/pandoc"]="fiduswriter-pandoc-plugin-ts"
    ["fwtoolkit"]="fwtoolkit"
)

# Core backend apps whose package.json5 lives directly in the backend repo.
MAIN_FILES=(
    "$BACKEND_DIR/fiduswriter/base/package.json5"
)

# Django plugin apps and their sibling plugin repos. Each plugin's package.json5
# lives in its own sibling repo under <repo>/fiduswriter/<app>/package.json5,
# independent of whether the app is currently symlinked into the backend repo.
PLUGIN_APPS=(
    "book:fiduswriter-books-plugin"
    "citation_api_import:fiduswriter-citation-api-import-plugin"
    "gitrepo_export:fiduswriter-gitrepo-export-plugin"
    "languagetool:fiduswriter-languagetool-plugin"
    "llm:fiduswriter-llm-plugin"
    "ojs:fiduswriter-ojs-plugin"
    "pandoc:fiduswriter-pandoc-plugin"
    "payment:fiduswriter-payment-plugin"
    "phplist:fiduswriter-phplist-plugin"
    "tum:fiduswriter-tum-plugin"
    "vivliostyle:fiduswriter-vivliostyle-plugin"
    "website:fiduswriter-website-plugin"
)

PLUGIN_FILES=()
for entry in "${PLUGIN_APPS[@]}"; do
    app="${entry%%:*}"
    repo="${entry#*:}"
    PLUGIN_FILES+=("$SIBLINGS_DIR/$repo/fiduswriter/$app/package.json5")
done

# Sibling packages that depend on other sibling packages.
# Format: "sibling-dir:dep1,dep2,..."
SIBLING_PACKAGES=(
    "fiduswriter-bibliography-manager-ts:fwtoolkit"
    "fiduswriter-books-plugin-ts:@fiduswriter/document,fwtoolkit"
    "fiduswriter-dav-ts:@fiduswriter/document,@fiduswriter/editor,@fiduswriter/image-manager,fwtoolkit"
    "fiduswriter-document-ts:fwtoolkit"
    "fiduswriter-cli-ts:fwtoolkit,@fiduswriter/document,@fiduswriter/books-document"
    "fiduswriter-document-template-editor-ts:@fiduswriter/document,fwtoolkit"
    "fiduswriter-editor-ts:@fiduswriter/bibliography-manager,@fiduswriter/document,@fiduswriter/image-manager,fwtoolkit"
    "fiduswriter-frontend-ts:@fiduswriter/bibliography-manager,@fiduswriter/document,@fiduswriter/document-template-editor,@fiduswriter/editor,@fiduswriter/image-manager,fwtoolkit"
    "fiduswriter-image-manager-ts:fwtoolkit"
    "fiduswriter-pandoc-plugin-ts:@fiduswriter/document,@fiduswriter/books-document,fwtoolkit"
)

# Standalone repos with a plain package.json that is installed in its own
# root (pnpm install runs inside the repo, not through the Django
# backend's merged .transpile install): the Nextcloud app and the WordPress
# plugin.
STANDALONE_REPOS=(
    "fiduswriter-nextcloud"
    "fiduswriter-wordpress"
)

# Pagination packages (npm dependencies of @fiduswriter/document and, for
# vivliostyle-pdf, of the fiduswriter-vivliostyle plugin) that can be
# switched to the local checkouts in $PAGINATION_DIR.
PAGINATION_PACKAGES=(
    "paged-with-floats"
    "pages-to-pdf"
    "vivliostyle-pdf"
)

# Files that may declare pagination-package dependencies, with the directory
# pnpm install runs in for that file (used to compute relative file: paths):
#   "file:install-context-dir"
# The backend's own package.json5 declares no pagination packages (they come
# transitively through @fiduswriter/document); switching document-ts to the
# local checkouts is what makes the backend bundle use them.
PAGINATION_TARGETS=(
    "$SIBLINGS_DIR/fiduswriter-vivliostyle-plugin/fiduswriter/vivliostyle/package.json5:$INSTALL_DIR"
    "$SIBLINGS_DIR/fiduswriter-document-ts/package.json:$SIBLINGS_DIR/fiduswriter-document-ts"
)

update_file() {
    local file="$1"
    local pkg="$2"
    local new_value="$3"

    if python3 - "$file" "$pkg" "$new_value" <<'PY'
import sys, re
path, pkg, new_value = sys.argv[1:4]
with open(path) as fh:
    content = fh.read()
pattern = rf'("{re.escape(pkg)}"\s*:\s*)"([^"]*)"'
changed = False


def repl(match):
    global changed
    if match.group(2) == new_value:
        return match.group(0)
    changed = True
    return match.group(1) + '"' + new_value + '"'


new_content = re.sub(pattern, repl, content)
if changed:
    with open(path, "w") as fh:
        fh.write(new_content)
sys.exit(0 if changed else 1)
PY
    then
        echo "  $file: $pkg -> $new_value"
        if [[ "$(basename "$file")" == "package.json" ]]; then
            record_changed_dir "$(dirname "$file")"
        fi
    fi
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
        version="$(python3 -c "
        import sys
        try:
            import json5 as json_mod
        except ImportError:
            import json as json_mod
        path = sys.argv[1]
        try:
            with open(path) as fh:
                data = json_mod.load(fh)
            print(data['version'])
        except Exception as e:
            sys.stderr.write(f'ERROR reading {path}: {e}\n')
            sys.exit(1)
        " "$sibling_path/package.json")"
        update_file "$file" "$pkg" "^$version"
    fi
}

handle_bibliography_manager() {
    # The bibliography app does not directly import @fiduswriter/bibliography-manager,
    # but it must be a root dependency in local mode so pnpm installs the local
    # package at the top level. The sibling package.json files then ensure the
    # transitive dependency chain also uses the local copy.
    local file="$BACKEND_DIR/bibliography/package.json5"
    local pkg="@fiduswriter/bibliography-manager"
    local dir_name="${PACKAGE_DIRS[$pkg]}"
    local sibling_path="$SIBLINGS_DIR/$dir_name"

    if [[ ! -f "$file" ]]; then
        return
    fi

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

# Same switching as switch_sibling_file, but for the standalone repos:
# the file: path must be relative to the consuming repo's own root, because
# pnpm install runs there (not in the backend's merged .transpile dir).
switch_standalone_repo() {
    local repo_dir_name="$1"
    local repo_path="$SIBLINGS_DIR/$repo_dir_name"
    local pkg_file="$repo_path/package.json"

    if [[ ! -f "$pkg_file" ]]; then
        echo "Warning: standalone package.json not found: $pkg_file" >&2
        return
    fi

    for pkg in "${!PACKAGE_DIRS[@]}"; do
        local dep_dir_name="${PACKAGE_DIRS[$pkg]}"
        local dep_path="$SIBLINGS_DIR/$dep_dir_name"

        if [[ "$MODE" == "local" ]]; then
            if [[ ! -d "$dep_path" ]]; then
                continue
            fi
            local rel_path
            rel_path="$(python3 -c "import os,sys; print(os.path.relpath(sys.argv[1], sys.argv[2]))" "$dep_path" "$repo_path")"
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

# Switch the pagination-package dependencies (see PAGINATION_PACKAGES) in
# the files listed in PAGINATION_TARGETS. In local mode the file: paths are
# computed relative to each file's install context; in npm mode the version
# is read from the pagination checkout's package.json.
switch_pagination_deps() {
    local file="$1"
    local install_dir="$2"

    if [[ ! -f "$file" ]]; then
        return
    fi

    for pkg in "${PAGINATION_PACKAGES[@]}"; do
        local dep_path="$PAGINATION_DIR/$pkg"
        if [[ ! -f "$dep_path/package.json" ]]; then
            continue
        fi
        if [[ "$MODE" == "local" ]]; then
            local rel_path
            rel_path="$(python3 -c "import os,sys; print(os.path.relpath(sys.argv[1], sys.argv[2]))" "$dep_path" "$install_dir")"
            update_file "$file" "$pkg" "file:$rel_path"
        else
            local version
            version="$(python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['version'])" "$dep_path/package.json")"
            update_file "$file" "$pkg" "^$version"
        fi
    done
}

echo "Switching @fiduswriter dependencies to $MODE mode..."

handle_bibliography_manager

for file in "${MAIN_FILES[@]}" "${PLUGIN_FILES[@]}"; do
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

for repo_dir_name in "${STANDALONE_REPOS[@]}"; do
    switch_standalone_repo "$repo_dir_name"
done

for target in "${PAGINATION_TARGETS[@]}"; do
    file="${target%%:*}"
    install_dir="${target#*:}"
    switch_pagination_deps "$file" "$install_dir"
done

# Keep package.json and the lockfile in sync: run pnpm install in every
# package whose package.json was rewritten (dependencies before dependents).
if [[ -s "$CHANGED_DIRS_FILE" ]]; then
    if ! command -v pnpm >/dev/null 2>&1; then
        echo "ERROR: pnpm is required to sync lockfiles after switching dependencies." >&2
        exit 1
    fi

    echo
    echo "Running pnpm install in changed packages (lockfile sync)..."

    install_failed=0
    declare -A installed_dirs=()

    install_dir() {
        local dir="$1"
        if [[ ! -f "$dir/package.json" ]]; then
            return 0
        fi
        echo "  -> $dir"
        if ! (cd "$dir" && pnpm install); then
            echo "ERROR: pnpm install failed in $dir" >&2
            install_failed=1
        fi
    }

    for dir_name in "${INSTALL_ORDER[@]}"; do
        candidate="$SIBLINGS_DIR/$dir_name"
        if is_changed_dir "$candidate"; then
            installed_dirs["$candidate"]=1
            install_dir "$candidate"
        fi
    done

    # Defensive: install anything recorded outside INSTALL_ORDER as well, so
    # no rewritten package.json is left without a lockfile refresh.
    while IFS= read -r changed_dir; do
        if [[ -z "$changed_dir" ]]; then
            continue
        fi
        if [[ -n "${installed_dirs[$changed_dir]:-}" ]]; then
            continue
        fi
        install_dir "$changed_dir"
    done < "$CHANGED_DIRS_FILE"

    if [[ "$install_failed" -ne 0 ]]; then
        echo "ERROR: some pnpm installs failed; lockfiles may be out of sync." >&2
        exit 1
    fi
fi

echo "Done."

if [[ "$MODE" == "local" ]]; then
    cat <<EOF

Next steps:
  1. Rebuild any packages you modified (e.g. pnpm run build in
     fiduswriter-editor-ts).
  2. Run python fiduswriter/manage.py transpile --force
  3. Hard-reload the browser (disable cache in dev tools).
EOF
else
    cat <<EOF

Next steps:
  1. Rebuild any packages you modified (pnpm run build).
EOF
fi

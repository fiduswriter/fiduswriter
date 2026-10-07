# AGENTS.md — main fiduswriter repository

## What this repository is

This is the **packaging, documentation, development-tooling, and CI** home for
Fidus Writer. It deliberately contains **no Python/Django source code** — the
server backend lives in the `fiduswriter-server-backend` repository (published
on PyPI as `fiduswriter`), and the frontend lives in standalone npm packages
(`fwtoolkit`, `@fiduswriter/document`, `@fiduswriter/editor`,
`@fiduswriter/frontend`, …).

See the `AGENTS.md` in the parent directory that contains all the sibling
repositories for the full map of the monorepo, the dependency flow between the
packages, and the release/propagation workflow.

## Repository contents

| Path | Purpose |
|------|---------|
| `debian/`, `build-deb.sh` | Debian packaging (builds from the backend repo) |
| `rpm/`, `build-rpm.sh` | RPM packaging (builds from the backend repo) |
| `snap/`, `build_clean.sh` | Snap packaging (builds from the backend repo) |
| `docker/` | Docker image build + compose |
| `desktop/` | **Desktop application** packaging: Linux AppImage/deb + `.desktop` entry, macOS `.dmg` (+ sign/notarize), Windows Inno Setup script |
| `docs/` | User + developer documentation, plans |
| `dev-scripts/` | `switch-local-deps.sh`, `publish-sibling-packages.sh` |
| `.github/workflows/` | CI/CD: tests + releases (orchestrate the backend repo) |
| `ci/` | CI helpers (`retry.bash`) |

## Desktop application

The desktop app's **source** lives in its own repository,
`fiduswriter-desktop/`, next to this one (it is a TypeScript/Rust project and
needs its own toolchain). This repository owns only its **packaging**, in
`desktop/`:

| File | Purpose |
|------|---------|
| `desktop/version.sh` | Prints the version from the backend's `version.txt` — the single source of truth |
| `desktop/linux/build-linux.sh` | Builds AppImage + deb, validates and emits the `.desktop` entry |
| `desktop/linux/fiduswriter-desktop.desktop` | `.desktop` entry whose `Exec` is the real binary |
| `desktop/macos/build-macos.sh` | Merges the UTI declarations, builds the icon and `.dmg`, optionally signs + notarizes |
| `desktop/windows/fiduswriter-desktop.iss` | Inno Setup script: installs the app and registers the file types |

Notes:

- **File-type declarations are not duplicated.** The macOS script merges
  `fiduswriter-file-types/macos/UTI-declarations.plist` into `Info.plist`, and
  the Inno Setup script's registry rows are copied from
  `fiduswriter-file-types/windows/fiduswriter.iss`. Change them there.
- **Linux builds against Ubuntu 22.04**, the oldest supported baseline, because
  Tauri 2 requires WebKitGTK **4.1** (`libwebkit2gtk-4.1-dev`), which 22.04
  provides. Building on the oldest supported system keeps the AppImage
  portable. Do not target anything older.
- `desktop/` deb and rpm packages should `Depends: fiduswriter-file-types` for
  the MIME definitions and icons; the `.desktop` entry here provides the
  executable.
- Snap packaging (`snap/`) is **currently stale**: `snapcraft.yaml` references
  `src/fiduswriter/`, `src/npm/` and `src/mysql/`, which do not exist in this
  repository. It is not built by CI. Do not use it as a template.

## Build / test commands

- **Backend tests** are run from the `fiduswriter-server-backend` checkout
  (the CI in `.github/workflows/main.yml` clones it, symlinks plugin app dirs
  into `fiduswriter-server-backend/fiduswriter/`, and runs the Django tests).
- **Debian build**: `./build-deb.sh` (stages the backend source + `debian/`
  into `debian-build/stage/` and copies artifacts back to `debian-build/`).
- **RPM build**: `./build-rpm.sh` (same pattern, artifacts in `rpm-build/`).
- **Docker build**: `cd docker && make build` (the `Dockerfile` clones the
  backend repo at build time).
- **Snap build**: `snapcraft` from the `snap/` directory (the
  `snapcraft.yaml` fetches the backend repo).
- **Desktop build**: `./desktop/linux/build-linux.sh` (Linux),
  `./desktop/macos/build-macos.sh [--sign]` (macOS),
  `iscc desktop\windows\fiduswriter-desktop.iss` (Windows). Artifacts land in
  `desktop-build/`.

## Environment variables

- `FIDUSWRITER_BACKEND_DIR` — where the backend checkout is expected
  (defaults to `<this-repo>/fiduswriter-server-backend`). Used by
  `build-deb.sh`, `build-rpm.sh`, `desktop/version.sh` and
  `dev-scripts/switch-local-deps.sh`.
- `FIDUSWRITER_SIBLINGS_DIR` — sibling npm package directory (defaults to the
  parent directory of this repo).
- `FIDUSWRITER_DESKTOP_DIR` — the `fiduswriter-desktop` checkout (defaults to
  `<parent>/fiduswriter-desktop`). Used by the desktop build scripts.

## Notes

- `dev-scripts/switch-local-deps.sh` rewrites `package.json5`/`package.json`
  dependency specs in the **backend repo** and sibling packages between
  published npm versions and local `file:` paths.
- The backend repo keeps the PyPI name `fiduswriter` (the repository name
  differs from the package name).

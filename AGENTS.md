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
| `docs/` | User + developer documentation, plans |
| `dev-scripts/` | `switch-local-deps.sh`, `publish-sibling-packages.sh` |
| `.github/workflows/` | CI/CD: tests + releases (orchestrate the backend repo) |
| `ci/` | CI helpers (`retry.bash`) |

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

## Environment variables

- `FIDUSWRITER_BACKEND_DIR` — where the backend checkout is expected
  (defaults to `<this-repo>/fiduswriter-server-backend`). Used by
  `build-deb.sh`, `build-rpm.sh`, and `dev-scripts/switch-local-deps.sh`.
- `FIDUSWRITER_SIBLINGS_DIR` — sibling npm package directory (defaults to the
  parent directory of this repo).

## Notes

- `dev-scripts/switch-local-deps.sh` rewrites `package.json5`/`package.json`
  dependency specs in the **backend repo** and sibling packages between
  published npm versions and local `file:` paths.
- The backend repo keeps the PyPI name `fiduswriter` (the repository name
  differs from the package name).

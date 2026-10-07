# Release Process

How to cut a Fidus Writer release (server, packages, and desktop). The release
pipeline is data-driven: one version file and one tag name per release, and
GitHub Actions does the rest.

## Where things live

| Piece | Location |
|-------|----------|
| Version number (single source of truth) | `fiduswriter-server-backend/fiduswriter/version.txt` |
| Release pipeline | `.github/workflows/release.yml` in this repository (`fiduswriter/`, the packaging/CI home) |
| Server source | `fiduswriter-server-backend` repository |
| Desktop source | `fiduswriter-desktop` repository |

`version.txt` holds the version in PEP 440 form (e.g. `5.0.0a1`). Everything
derives from it:

- **PyPI**: `pyproject.toml` reads it via `[tool.setuptools.dynamic]`.
- **deb/rpm**: `build-deb.sh` / `build-rpm.sh` read it (the Debian version
  becomes `5.0.0~alpha1-1`).
- **Docker**: the image tag is the `version.txt` content.
- **Desktop**: `desktop/version.sh` reads it at packaging time, so the desktop
  apps carry the same version as the server automatically.

There is no changelog to edit by hand: `build-deb.sh` rewrites
`debian/changelog` from `version.txt` during the build.

## Version numbers and tag names

Two spellings of the same release:

- `version.txt`: PEP 440 — `5.0.0a2`
- git tag: `v5.0.0-alpha2` (`v` prefix, `-alphaN` suffix)

The same tag name is used in **every** repository that gets tagged. Past
releases: `v5.0.0-alpha1`, `v4.1.21`, …

## What a tag push triggers

Pushing a tag to `github.com/fiduswriter/fiduswriter` runs `release.yml`:

- **Debian + RPM packages** — built from the backend source; the version comes
  from that source's `version.txt`.
- **PyPI** — clones `fiduswriter-server-backend` at `--branch <tag>`, falling
  back to `main` if the tag does not exist there, builds the sdist/wheel and
  publishes with `skip-existing: true`. **The backend tag is therefore
  required**: if it is missing, the build silently uses `main`, and if
  `main`'s `version.txt` is an already-published version, nothing is
  published at all.
- **Docker image** — same clone pattern; multi-arch (`amd64`, `arm64`).
- **Desktop (Linux AppImage+deb, macOS dmg, Windows installer)** — clones
  `fiduswriter-desktop` from `git.fiduswriter.org` and checks out the same tag
  **if it exists**, otherwise builds `main` with a warning. Tag the desktop
  repo only when you want the binaries pinned to a specific desktop commit;
  otherwise they track `main`.
- **GitHub Release** — all artifacts attached. Desktop artifacts are
  best-effort (`continue-on-error`) so a desktop failure never blocks the
  server release.

Pre-release tags (`alpha`, `beta`, `rc`, `dev` in the tag name) additionally:

- are marked **prerelease** on GitHub,
- do **not** move the `latest` / `major` / `major.minor` Docker tags,
- are **not** published to the APT/YUM repositories
  (the `update-repos` job is skipped).

The workflow also supports `workflow_dispatch` for a manual test run from a
branch; that skips GitHub Release creation.

## Cutting a release, step by step

Example: `5.0.0a2` → tag `v5.0.0-alpha2`.

1. **Bump the version in the backend** and push:

   ```bash
   cd fiduswriter-server-backend
   # fiduswriter/version.txt: 5.0.0a1 -> 5.0.0a2
   git commit -am "Bump version to 5.0.0a2"
   git push <remote> <branch>
   ```

2. **(Optional) Tag the desktop repo** — only if the desktop binaries should
   be built from a specific commit instead of `main`:

   ```bash
   cd fiduswriter-desktop
   git tag -a v5.0.0-alpha2 -m "Fidus Writer 5.0.0 alpha 2"
   git push <remote> v5.0.0-alpha2
   ```

3. **Tag the backend** on the version-bump commit:

   ```bash
   cd fiduswriter-server-backend
   git tag -a v5.0.0-alpha2 -m "Fidus Writer 5.0.0 alpha 2"
   git push <remote> v5.0.0-alpha2
   ```

4. **Tag this repository and push the tag to GitHub** — this triggers the
   pipeline:

   ```bash
   cd fiduswriter
   git tag -a v5.0.0-alpha2 -m "Fidus Writer 5.0.0 alpha 2"
   git push <remote> v5.0.0-alpha2
   ```

Order matters: the backend and desktop tags must exist **before** step 4,
because the workflow clones those repositories at the tag as soon as it runs.

The tag must reach `github.com/fiduswriter/fiduswriter`, where the Actions
workflow lives. Pushing to `git.fiduswriter.org` works too — the GitHub
mirror updates automatically. Pushing the tag only to a personal fork
triggers nothing.

## Prerequisites on GitHub

The workflow needs these repository secrets (see `release.yml`):

- `PYPI_API_TOKEN` — required for the PyPI publish.
- `DOCKER_USERNAME` / `DOCKER_PASSWORD` — optional; without them the image
  is pushed to GHCR only.
- `MACOS_CERTIFICATE`, `KEYCHAIN_PASSWORD`, `SIGNING_IDENTITY`,
  `NOTARY_PROFILE`, `NOTARY_TEAM_ID` — optional; without them the macOS dmg
  ships unsigned.
- `APT_GPG_PRIVATE_KEY` / `APT_GPG_PASSPHRASE` — optional; only used by the
  stable-release APT repo update.

## Not covered by this pipeline: Nextcloud and WordPress apps

The [Nextcloud app](../plans/NEXTCLOUD_INTEGRATION.md) (`fiduswriter-nextcloud`)
and the WordPress plugin (`fiduswriter-wordpress`) are **not** part of
`release.yml`. They are separate apps with their own 0.x version lines, their
own tags, and manual release processes that run **after** the Fidus Writer
release (they consume the `@fiduswriter/*` npm packages, so those must be
published first):

- **Nextcloud**: see the "Release checklist (Nextcloud app store)" in
  `fiduswriter-nextcloud/AGENTS.md` — bump `<version>` in `appinfo/info.xml`,
  run `scripts/build-release.sh`, upload the tarball manually at
  https://apps.nextcloud.com, then tag `v<version>`.
- **WordPress**: no automated release pipeline; builds two plugins
  (`fiduswriter/`, `fiduswriter-pandoc/`) via `scripts/build.js` and
  `scripts/package.js`, released manually with the `build/` directories as
  assets.

## After the release

- Watch the Actions run on the tag; the GitHub Release is created only after
  the deb, PyPI, Docker, and desktop jobs succeed (RPM and desktop failures
  don't block it).
- For stable releases, verify the APT/YUM repository update job ran and the
  `latest` Docker tag moved.
- If a desktop tag was created, confirm the desktop binaries in the release
  were built from the tagged commit (the workflow logs the checked-out
  commit as "Desktop source: …").

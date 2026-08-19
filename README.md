Fidus Writer — main repository
==============================

This repository is the **packaging, documentation and development-tooling
home** for Fidus Writer. It does **not** contain the Python/Django source
anymore — that lives in the
[fiduswriter-server-backend](https://git.fiduswriter.org/fiduswriter/fiduswriter-server-backend)
repository (published on PyPI as `fiduswriter`).

Fidus Writer is an online collaborative editor especially made for academics
who need to use citations and/or formulas. The editor focuses on the content
rather than the layout, so that with the same text, you can later on publish it
in multiple ways: on a website, as a printed book, or as an ebook.

## What lives here

- **Packaging**: Debian (`debian/`, `build-deb.sh`), RPM (`rpm/`,
  `build-rpm.sh`), Snap (`snap/`, `build_clean.sh`), Docker (`docker/`).
- **Documentation**: `docs/`.
- **Development tooling**: `dev-scripts/` (`switch-local-deps.sh`,
  `publish-sibling-packages.sh`).
- **CI**: `.github/workflows/` (tests and releases orchestrate the backend
  repository).

## Repository map

| Repository | Contents |
|---|---|
| `fiduswriter/` (this repo) | Packaging, docs, dev-scripts, CI |
| `fiduswriter-server-backend/` | Django/Python server (`fiduswriter` on PyPI) |
| `fwtoolkit/` | Shared UI toolkit (`fwtoolkit` npm package) |
| `fiduswriter-document-ts/` | `@fiduswriter/document` |
| `fiduswriter-editor-ts/` | `@fiduswriter/editor` |
| `fiduswriter-frontend-ts/` | `@fiduswriter/frontend` |
| `fiduswriter-bibliography-manager-ts/` | `@fiduswriter/bibliography-manager` |
| `fiduswriter-image-manager-ts/` | `@fiduswriter/image-manager` |
| `fiduswriter-document-template-editor-ts/` | `@fiduswriter/document-template-editor` |
| `fiduswriter-*-plugin/` + `fiduswriter-*-plugin-ts/` | Django plugins + their npm packages |

## Quick start (development)

Development happens with all repositories checked out next to one another.
Check out `fiduswriter-server-backend` as a sibling, then:

```bash
# Backend setup
cd ../fiduswriter-server-backend
cp fiduswriter/configuration-default.py fiduswriter/configuration.py
python fiduswriter/manage.py setup
python fiduswriter/manage.py runserver
```

To build and test the packaging in this repository, see
`docs/debian-packaging.md` and the per-directory READMEs.

License
-------

All of Fidus Writer's original code is licensed under the GNU AFFERO GENERAL
PUBLIC LICENSE, for details see LICENSE. Some third party libraries are
licensed under other, compatible open source libraries. Licensing information
is included in those files.

# Reorganization Handoff — July 2026

## Summary

The Fidus Writer frontend was reorganized to decouple the SPA shell
from Django and to make UI modules (`editor`, `bibliography-manager`,
`image-manager`) standalone, backend-agnostic packages.

**Plan document**: `PLAN-reorganization.md` at the repository root.

## What was done

### Goal 1: Move `state_plugins` → `@fiduswriter/document`

ProseMirror NodeViews for `tags_part` and `contributors_part` were moved
from `@fiduswriter/common` into `@fiduswriter/document`, where they belong
with the document schema. Consumer (`@fiduswriter/editor`) imports were
updated.

- **Package**: `@fiduswriter/document` (v0.2.26)
- **Files**: `state_plugins/tag_input/`, `state_plugins/contributor_input/`
- **Types**: `PartNodeAttrs`, `TagInputRefs`, `CreateTagEditor`, etc.

### Goal 2: Move `BibliographyImportWorker` → `@fiduswriter/bibliography-manager`

The bibliography file import worker was TypeScript-ified and moved into
the bibliography-manager package. The worker URL is now injectable
(defaulting to `import.meta.url`).

- **Package**: `@fiduswriter/bibliography-manager` (v0.1.16)
- **Files**: `src/import/workers/bibliography.ts`, `bibliography_import_worker.ts`
- **Note**: The worker was made self-contained (all imports inlined) to work
  around rspack's module worker chunk import resolution.

### Goal 3a/3b: Decouple Bibliography/Image overviews

`BibliographyOverview` and `ImageOverview` were made standalone:
- Removed all imports from `@fiduswriter/common` (now `@fiduswriter/frontend`)
- Added `container: HTMLElement` constructor parameter — pages render into
  a provided container instead of taking over `document.body`
- Page chrome (`baseBodyTemplate`, `SiteMenu`, `FeedbackTab`) is set up
  by the SPA shell's route handlers before instantiation
- Standalone demos added at `demo/standalone/`

- **Packages**: `@fiduswriter/bibliography-manager` (v0.1.16),
  `@fiduswriter/image-manager` (v0.1.13)

### Goal 3c: Decouple Editor

`@fiduswriter/editor` was fully decoupled:
- Removed `FeedbackTab` import and instantiation
- Defined local `EditorApp` and `EditorUser` interfaces (no longer extending
  `@fiduswriter/common` types)
- Zero imports from `@fiduswriter/frontend`

- **Package**: `@fiduswriter/editor` (v0.1.46)

### Goal 4a: Rename `@fiduswriter/common` → `@fiduswriter/frontend`

The package was renamed to reflect its true purpose: the Fidus Writer SPA
frontend shell. All consumers (main app, Django plugins) were updated.

### Goal 4b: Absorb SPA shell into `@fiduswriter/frontend`

The following modules were moved from the main Django app into the
`@fiduswriter/frontend` package:

| Module | Source (main app) | Destination (frontend) |
|--------|-------------------|----------------------|
| App router | `base/static/js/modules/app/index.js` | `src/app/index.ts` |
| IndexedDB | `base/static/js/modules/indexed_db/index.js` | `src/indexed_db/index.ts` |
| Prelogin pages | `base/static/js/modules/prelogin/` | `src/prelogin/` |
| Utility pages | `base/static/js/modules/404/`, `offline/`, `setup/`, `flatpage/` | `src/pages/` |
| Admin console | `base/static/js/modules/admin_console/` | `src/admin_console/` |
| Error hook | `base/static/js/modules/error_hook/` | `src/error_hook/` |
| Document overview | `document/static/js/modules/documents/overview/` | `src/documents/overview/` |
| Document importers | `document/static/js/modules/importer/` | `src/documents/importer/` |
| Document tools | `document/static/js/modules/documents/tools.js` | `src/documents/tools.ts` |
| Document revisions | `document/static/js/modules/documents/revisions/` | `src/documents/revisions/` |
| Maintenance | `document/static/js/modules/maintenance/` | `src/maintenance/` |
| Worker | `document/static/js/workers/document_template/adjust_doc.js` | `src/workers/` |
| Profile | `user/static/js/modules/profile/` | `src/user/profile/` |
| Auth pages | `user/static/js/modules/login/`, `signup/`, `password_reset/`, `email_confirm/`, `two_factor/` | `src/user/auth/` |
| Contacts | `user/static/js/modules/contacts/` | `src/user/contacts/` |
| Templates | `user_template_manager/static/js/modules/user_template_manager/` | `src/document_templates/` |

### API Connector Pattern

All 55 direct `postJson`/`getJson` calls in `@fiduswriter/frontend` were
replaced with injectable `ApiConnectors`. The connector interfaces are
defined in `src/api/index.ts`. The Django implementations are in
`base/static/js/modules/api_adapters/index.js`.

The App router sets `this.config.apiConnectors` so all page constructors
that receive `this.config` as their `app` parameter can access connectors
via `(this.app as any).apiConnectors.xxx.method()`.

## Current state

### CI results (run 29685378801)

| Status | Tests |
|--------|-------|
| ✅ Pass | pre-commit, browser_check, feedback, usermedia, test_views_unit, test_helpers, test_paste_template_filter, test_track_changes, test_crossrefs, test_merge, test_share_link_access, test_memory_leak |
| ❌ Fail | **bibliography** (Selenium timeout on import) |
| ⏸️ Skip | user, export, user_template_manager, collaboration, e2ee, offline, admin (cascade from bib failure) |

### Remaining issue: Bibliography import worker

The bibliography import test (`bibliography.tests.test_overview`) times out
at line 209 waiting for `.fw-data-table tr:nth-child(2) .edit-bib` after
uploading a `.bib` file via the import dialog.

**Root cause**: The `BibliographyImportWorker` is loaded as a module worker
via `new Worker(url, {type: "module"})`. rspack emits the worker script as
a separate chunk (`b2fc3b7f03619994.js`) but does not correctly resolve the
`import` statements within the worker chunk. The relative import
`import { BibliographyImportWorker } from "./bibliography.js"` is not
replaced with the hashed chunk filename, causing a 404.

**Fix attempts**:
1. ✅ Changed from `makeWorker()` (classic `importScripts`) to
   `new Worker(url, {type: "module"})` — avoids `importScripts` error.
2. ✅ Made worker self-contained (inlined `BibliographyImportWorker` class
   into `bibliography_import_worker.ts`) — avoids internal `import` between
   worker files.
3. ❌ Worker still imports from `bibliojson` (npm package), which rspack
   cannot resolve in the worker chunk context.

**Potential solutions**:
- Add the worker script as an rspack entry point in the rspack config
  (`base/rspack.config.template.js`), as it was before Goal 2.
- Use a different worker loading pattern that rspack handles better.
- Bundle the worker code into the main app bundle instead of a separate chunk.

### Other known issues

- **`@fiduswriter/frontend` v0.1.23 not pushed to codeberg**: SSH problems
  prevented pushing. The npm package was published manually.
- **`@fiduswriter/bibliography-manager` v0.1.16 not pushed to codeberg**:
  Same SSH issue. Published manually to npm.

## Key files for debugging

| File | Purpose |
|------|---------|
| `fiduswriter-common-js/src/app/index.ts` | SPA router — route definitions, page instantiation |
| `fiduswriter-common-js/src/api/index.ts` | API connector interfaces |
| `fiduswriter/fiduswriter/base/static/js/modules/api_adapters/index.js` | Django implementations of API connectors |
| `fiduswriter-common-js/src/documents/overview/` | Document overview page |
| `fiduswriter-common-js/src/user/` | Profile, auth, contacts |
| `fiduswriter-bibliography-manager-js/src/import/workers/` | Bibliography import worker |
| `fiduswriter-bibliography-manager-js/src/overview/index.ts` | Bibliography overview |
| `fiduswriter-image-manager-js/src/overview/index.ts` | Image overview |

## Architecture decisions

1. **Page components receive `container: HTMLElement`** instead of taking
   over `document.body`. The SPA shell (router) sets up page chrome
   (SiteMenu, FeedbackTab, baseBodyTemplate) and passes the content
   container to the page component.

2. **Event listeners on `document.body`** with cleanup in `close()`.
   Because dialogs created by `fwtoolkit` are appended to `document.body`
   (outside the content container), click/keydown events must be
   captured at the body level. Listeners are removed when the page is
   closed via `this.page.close()` in `selectPage()`.

3. **`this.config` as shared context**. The App constructor sets
   `config.app = this`, `config.goTo`, `config.menuPlugins`, and
   `config.apiConnectors` so any page receiving `this.config` can
   access app-level functionality.

4. **Deduplicated `package.json5` dependencies**. Each `@fiduswriter`
   dependency appears in exactly one `package.json5` file since they
   are merged during build:
   - `base/`: `@fiduswriter/frontend`, `@fiduswriter/image-manager`
   - `document/`: `@fiduswriter/document`, `@fiduswriter/document-template-editor`, `@fiduswriter/editor`
   - `bibliography/`: `@fiduswriter/bibliography-manager`

## Remaining direct network calls to route through API adapters

The API-connector migration replaced all direct `postJson`/`getJson` calls in
`@fiduswriter/frontend`. The following backend-agnostic packages still call
`fwtoolkit`'s `postJson`/`getJson` directly. These should be refactored to
accept injectable connectors (or at least reviewed) so the packages stay
backend-agnostic.

### `@fiduswriter/editor`

| File | Endpoint(s) | Note |
|------|-------------|------|
| `src/index.ts` | `/api/document/create_doc/`, `/api/document/get_ws_base/`, `/api/document/get_doc_data/` | Document creation / loading |
| `src/no_collab_save/index.ts` | `/api/document/save/` | Non-collaborative save |
| `src/databases/images.ts` | `/api/document/e2ee_image/`, `/api/usermedia/save/`, `/api/usermedia/images/` | Image DB sync |
| `src/exporter/native/copy.ts` | `/api/document/import/create/`, `/api/document/import/` | Import/copy flow |
| `src/documents/access_rights/index.ts` | `/api/document/get_access_rights/`, `/api/document/share_token/*` | Access rights & share tokens |
| `src/menus/headerbar/model.ts` | `/api/document/request_access/` | Access request |
| `src/contacts/add_dialog.ts` | `/api/user/invites/add/` | Contact invite |
| `src/document_template/exporter.ts` | (dynamic `this.getUrl`) | Template export |

### `@fiduswriter/bibliography-manager`

| File | Endpoint(s) | Note |
|------|-------------|------|
| `src/database/server_connector.ts` | `/api/bibliography/biblist/`, `/api/bibliography/save/`, `/api/bibliography/save_category/` | Main server connector |

### `@fiduswriter/image-manager`

| File | Endpoint(s) | Note |
|------|-------------|------|
| `src/database.ts` | `/api/usermedia/images/`, `/api/usermedia/save/` | Image DB |
| `src/overview/categories.ts` | `/api/usermedia/save_category/` | Category save |

### `@fiduswriter/document-template-editor`

| File | Endpoint(s) | Note |
|------|-------------|------|
| `src/export_template_dialog.ts` | `/api/style/delete_export_template/`, `/api/style/save_export_template/` | Export templates |
| `src/document_style_dialog.ts` | `/api/style/delete_document_style/`, `/api/style/save_document_style/` | Document styles |
| `src/importer.ts` | `/api/style/import_document_style/` | Style import |
| `src/exporter.ts` | (dynamic `this.getUrl`) | Style export |
| `src/change_admin.ts` | `/api/document/admin/get_template/extras/` | Admin extras |

### Lower-level utilities (likely acceptable)

`fwtoolkit` itself still exposes `postJson`/`getJson` and uses them internally
for E2EE passphrase management (`src/e2ee/passphrase-manager.ts`) and file
move helpers (`src/file/tools.ts`). These are foundational utilities, not
page-level code, so they do not need adapter injection.

## Lessons learned

1. **rspack worker bundling**: The `new URL("./worker.js", import.meta.url)`
   + `new Worker(url, {type: "module"})` pattern has limitations with
   rspack. Worker entry points are better handled as explicit rspack config
   entries.

2. **`file:` protocol linking**: When testing locally with `file:` protocol
   in `package.json5`, transitive npm dependencies can pull in the published
   version instead of the local one if they share the dependency. Use pnpm
   overrides or `file:` for all packages in the chain.

3. **Adapter unwrapping**: The Django API adapters should consistently
   unwrap `{json}` from `postJson` responses so the frontend receives raw
   data. Methods needing `{json, status}` (like `login`) should keep the
   wrapper explicitly.

4. **Separate entry points**: Files loaded via separate rspack entries
   (`admin_console.mjs`, `maintenance.mjs`, `error_hook.mjs`) don't go
   through the App router and need `apiConnectors` passed directly.

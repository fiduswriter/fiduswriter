# Software Structure

Understanding Fidus Writer's architecture.

## Overview

Fidus Writer is built with:
- **Backend**: Python, Django
- **Frontend**: JavaScript, ProseMirror
- **Database**: PostgreSQL (or MySQL/SQLite)
- **Real-time**: WebSockets (Django Channels)

### JavaScript Build
ES6 modules compiled by TypeScript and bundled with rspack via
`django-npm-mjs`. npm dependencies are declared per Django app in
`package.json5` files and merged during the build. See
[Upgrade 4.1 to 5.0](upgrade-4.1-to-5.0.md) for the npm package
migration guide.

## Directory Structure

```
fiduswriter/
├── fiduswriter/           # Main Django project
│   ├── base/             # Base app, SPA router wrapper, API adapters
│   ├── document/         # Document editing
│   ├── bibliography/     # Bibliography management
│   ├── usermedia/        # File uploads / image manager
│   ├── user/             # User management
│   └── ...               # Other apps
├── fiduswriter-common-js/    # @fiduswriter/frontend npm package
├── fiduswriter-document-js/  # @fiduswriter/document npm package
├── fiduswriter-editor-js/    # @fiduswriter/editor npm package
├── fwtoolkit/                # fwtoolkit npm package
├── fiduswriter-bibliography-manager-js/
├── fiduswriter-image-manager-js/
├── docs/                 # Documentation
├── requirements.txt      # Python dependencies
└── manage.py            # Django management script
```

## Apps

### Base App
Core functionality and common utilities.

### Document App
Document creation, editing, and collaboration.
- Models: Document, AccessRight
- Real-time collaboration via WebSockets
- ProseMirror editor integration

### Bibliography App
Citation and reference management.
- BibTeX import/export
- CSL style support

### User App
User authentication and management.

### Usermedia App
File upload and management.

## Frontend Architecture

### SPA Shell (`@fiduswriter/frontend`)

The SPA shell lives in the `@fiduswriter/frontend` npm package (repository:
`fiduswriter-common-js/`). It contains:

- **App router** (`src/app/`) — Client-side URL routing that maps paths to page
  modules. Each route defines which Django app a page belongs to, whether login
  is required, and a factory function that instantiates the page.
- **Page chrome** (`src/common/`, `src/menu/`, `src/feedback/`) — HTML body
  template, top navigation (`SiteMenu`), and feedback sidebar tab.
- **SPA pages** — Document overview, user profile, login/signup, password reset,
  contacts, document templates, prelogin pages (404, offline, setup, flat page).
- **API connector interfaces** (`src/api/`) — Injectable interfaces that all
  backend API calls go through, making the SPA shell backend-agnostic.

The main Django app provides the Django implementations of these connectors in
`base/static/js/modules/api_adapters/index.js`.

### Decoupled UI Modules

| Package | Purpose |
|---------|---------|
| `fwtoolkit` | Shared UI toolkit (dialogs, menus, network helpers, CSS) |
| `@fiduswriter/document` | Document schema, importers, exporters, ProseMirror state plugins |
| `@fiduswriter/editor` | Browser-based ProseMirror editor (collaboration, comments, track changes, E2EE) |
| `@fiduswriter/bibliography-manager` | Bibliography manager UI and import/export |
| `@fiduswriter/image-manager` | Image/media manager UI |

These modules are backend-agnostic — they receive API connectors or DOM
containers from the SPA shell rather than calling Django endpoints directly.

### ProseMirror
Rich text editor with collaborative editing support.

### WebSocket Communication
Real-time updates via Django Channels.

## Database Schema

Key models:
- User
- Document
- Bibliography
- AccessRight
- Image

## Export System

Multiple export formats:
- PDF
- EPUB
- HTML
- LaTeX
- DOCX

## Plugin System

Extend functionality through Django apps. Plugins declare npm dependencies in
their own `package.json5` file. See [Plugin Development](plugin-development.md).

## Related Documentation

- [Plugin Development](plugin-development.md)
- [API Documentation](api.md)
- [Upgrade 4.1 to 5.0](upgrade-4.1-to-5.0.md)
- [Contributing Guide](../contributing.md)

---

**Last Updated:** July 19, 2026

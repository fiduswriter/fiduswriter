# AGENTS.md

## Project Overview

**Fidus Writer** is an online collaborative editor designed for academics who need to use citations and/or formulas. The editor focuses on content rather than layout, allowing users to publish the same text in multiple formats (website, printed book, or ebook) with different appropriate layouts.

- **Repository**: https://github.com/fiduswriter/fiduswriter
- **License**: GNU AFFERO GENERAL PUBLIC LICENSE
- **Website**: http://fiduswriter.org

## Technology Stack

### Backend
- **Framework**: Django 5.2.9
- **ASGI Server**: Daphne 4.1.2
- **WebSockets**: Django Channels 4.3.2
- **Python Version**: Python 3.x
- **Database**: SQLite (default), with support for PostgreSQL and MySQL
- **Authentication**: django-allauth with social account support

### Frontend
- **JavaScript**: ES2015+ (transpiled automatically)
- **Module System**: ES6 modules (.mjs files)
- **Build Tool**: Rspack (via django-npm-mjs)
- **Editor**: ProseMirror (collaborative editing engine)
- **Math Rendering**: MathLive 0.104.0
- **Citations**: Citation Style Language (citeproc-plus)
- **Package Manager**: npm

### Key Dependencies
- `django-npm-mjs==3.3.0` - Handles JavaScript transpilation and npm integration
- `prosemirror==0.5.0` - Python bindings for ProseMirror
- `channels==4.3.2` - WebSocket support for real-time collaboration
- `Pillow==11.3.0` - Image processing
- `bleach==6.1.0` - HTML sanitization

## Project Structure

```
fiduswriter/
├── fiduswriter/                    # Main project directory
│   ├── base/                       # Core application (settings, management commands)
│   │   ├── management/commands/    # Django management commands
│   │   ├── static/                 # Static files (CSS, images)
│   │   ├── templates/              # Django templates
│   │   ├── package.json5           # npm dependencies for base app
│   │   ├── rspack.config.template.js
│   │   └── settings.py             # Base Django settings
│   ├── document/                   # Document management app
│   │   ├── static/js/              # JavaScript modules
│   │   ├── consumers.py            # WebSocket consumers
│   │   └── package.json5           # Document-specific npm dependencies
│   ├── bibliography/               # Bibliography/citations management
│   ├── user/                       # User management
│   ├── usermedia/                  # User-uploaded media
│   ├── style/                      # Document styles
│   ├── .transpile/                 # Transpiled JavaScript (auto-generated)
│   ├── static-transpile/           # Transpiled output directory
│   ├── static-libs/                # Third-party static libraries
│   ├── manage.py                   # Django management script
│   ├── configuration.py            # User configuration (not in git)
│   └── configuration-default.py    # Default configuration template
├── README.md
└── setup.py                        # Package setup for pip installation
```

## JavaScript Build System

### Source files vs. bundled files
The project uses **rspack** to bundle frontend JavaScript. The `npm_mjs` Django app overrides
the default `{% static %}` template tag so that requests for `.mjs` files are transparently
rewritten to `.js` and served from `fiduswriter/static-transpile/js/` (the pre-built bundle).

**Critical implication:** Editing source files under `fiduswriter/*/static/js/**/*.js` is
**not enough** — the browser loads the bundled output, not the sources. You must run:

```bash
python fiduswriter/manage.py transpile --force
```

After any JS change that should be visible in the browser (including Selenium tests).

The `manage.py transpile` command:
1. Copies source `.mjs`/`.js` files into `fiduswriter/.transpile/js/`
2. Runs rspack to produce the bundle in `fiduswriter/static-transpile/js/`
3. Updates the version hash used for cache-busting query strings

### How to verify which file the browser loads
If a test passes despite introducing an intentional syntax error in a source file,
the browser is loading the old bundle. Run `manage.py transpile --force` and re-test.

### Key Commands

- `python manage.py npm_install` - Install npm dependencies from all package.json5 files
- `python manage.py transpile` - Transpile JavaScript files
- `python manage.py transpile --force` - Force transpilation even if no changes detected
- `python manage.py collectstatic` - Collect static files (runs transpile first)
- `python manage.py setup` - Complete setup (migrate, transpile, load fixtures)

## Development Setup

### Prerequisites
- Python 3.x
- Node.js and npm (managed automatically by django-npm-mjs)
- Git

### Initial Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/fiduswriter/fiduswriter.git
   cd fiduswriter
   ```

2. **Install Python dependencies**:
   ```bash
   cd fiduswriter
   pip install -r requirements.txt
   pip install -r dev-requirements.txt  # For development
   ```

3. **Create configuration file**:
   ```bash
   cp configuration-default.py configuration.py
   # Edit configuration.py with your settings
   ```

4. **Run setup command** (performs migrations, npm install, transpilation):
   ```bash
   python manage.py setup
   ```

5. **Create admin user**:
   ```bash
   python manage.py initadmin
   ```

6. **Run development server**:
   ```bash
   python manage.py runserver
   ```
   The server will be available at http://localhost:8000

## Running Tests

### Selenium / E2EE tests
Run via Django's test runner (not pytest directly):

```bash
python fiduswriter/manage.py test document.tests.test_e2ee.E2EEBasicTest --noinput
```

Use `--noinput` to skip the interactive prompt about deleting `testdb.sqlite3`.
If a previous run left the test DB in a bad state, delete `testdb.sqlite3` first.

### Test database
The E2EE tests use a file-based SQLite test DB (`testdb.sqlite3`). Django asks for
confirmation before overwriting it unless `--noinput` is passed.

### Test Framework
- **Framework**: Django's built-in test framework
- **Live Server**: ChannelsLiveServerTestCase (for WebSocket support)
- **Browser Testing**: Selenium WebDriver
- **Test Requirements**: Install with `pip install -r test-requirements.txt`

## Frontend Routing Architecture

Fidus Writer is a single-page application (SPA). The Django backend serves the same HTML shell for all non-API paths; client-side JavaScript then decides what to render based on the URL.

### Client-Side Router

**File:** `base/static/js/modules/app/index.js`

This file is the client-side router. It maps URL path segments to page modules:

```javascript
// Example route definition
document: {
    app: "document",           // Which Django app the page belongs to
    requireLogin: true,        // If true, redirect unauthenticated users to login
    open: pathnameParts => {   // Function to load and instantiate the page
        return import("../editor")
            .then(({Editor}) => new Editor(this.config, path, id))
    }
}
```

### Key Points

1. **Django `urls.py` files are for API endpoints only** — they handle AJAX/fetch requests from the browser, not page navigation.

2. **Page navigation is entirely client-side** — the router in `app/index.js` reads `window.location.pathname` and dynamically imports the appropriate page module.

3. **The `share` route already exists** — it handles `/share/<token>/` URLs with `requireLogin: false`, opening the Editor directly without authentication.

4. **Route `open()` functions** receive `pathnameParts` (the URL path split by `/`) and return either a page instance or a Promise that resolves to one.

## E2EE Architecture Notes

### Current Implementation Status

**Per-Document Encryption (Core E2EE)**: ✅ Fully implemented and tested
- All document encryption features working
- Real-time encrypted collaboration
- Image encryption support
- Share link password embedding
- Password change functionality
- 18/18 E2EE tests passing

**Personal Passphrase System (Mode A Hybrid)**: ✅ Fully implemented and tested
- Models created and migrated
- Passphrase setup, unlock, and recovery dialogs
- Auto-generated document passwords (raw DEK)
- Public-key sharing via ECDH P-256
- Profile page integration (setup, change passphrase, recover)
- Migration from per-document passwords (auto-import on successful decryption)
- Key upgrade after asymmetric decryption

See `docs/e2ee.md` for detailed developer documentation.

### Session storage integration
- `E2EEKeyManager.storeKeyInSession(documentId, key)` exports the CryptoKey to raw bytes,
  Base64-encodes them, and stores them in `sessionStorage` as `e2ee_key_${documentId}`.
- `E2EEKeyManager.getKeyFromSession(documentId)` retrieves and re-imports the key.
- `E2EEKeyManager.storePasswordInSession(documentId, password)` stores the password string.
- `PassphraseCrypto.storeKeysInSession(masterKey, privateKey)` stores the master key and private key
  as `e2ee_master_key` and `e2ee_private_key`.
- The editor calls these after successful key derivation in `_createE2EEDocument`
  and `_decryptAndLoadDoc`.
- The editor calls `getKeyFromSession` / `getPasswordFromSession` in `_loadE2EEDocument`
  before prompting for a password.

### Encrypted snapshot lifecycle
1. New E2EE document: server returns plaintext template content initially
2. Client encrypts and sends `e2ee_snapshot` via WebSocket
3. Server stores encrypted blob and sets `e2ee_snapshot_version`
4. Subsequent loads receive the encrypted string, triggering decryption
5. Wrong passwords fail during `E2EEEncryptor.decryptObject` → error dialog shown

### Consumer password-change handling
When `handle_e2ee_snapshot` receives new `e2ee_salt`/`e2ee_iterations`:
- `doc.diffs = []` should be cleared (old diffs encrypted with old key are useless)
- New salt/iterations are broadcast in `e2ee_snapshot_received`
- Clients receiving this clear their cached key (memory + sessionStorage) and show
  a system message asking for the new password

## Notes for AI Agents

1. **Transpilation is automatic during development**: When running `python manage.py runserver`, JavaScript changes are detected and transpiled automatically (with a 30-second throttle). However, for tests you often need `python manage.py transpile --force` because the test browser may load the old bundle.

2. **Package.json5 format**: Note the `.json5` extension - this format allows comments, which regular JSON doesn't.

3. **Multiple apps**: This is a modular Django project with many apps (base, document, bibliography, user, etc.). Each can have its own package.json5 for JavaScript dependencies.

4. **Real-time features**: The project heavily uses WebSockets for collaborative editing. When debugging, consider both HTTP and WebSocket connections.

5. **django-npm-mjs**: This package handles all the JavaScript build process. The `transpile` management command comes from this package.

6. **Configuration hierarchy**: Settings are loaded in order: Django defaults → base/settings.py → configuration.py. User overrides go in configuration.py.

7. **Test database**: Tests automatically use a separate test database (testdb.sqlite3).

8. **Service worker**: In production mode, a service worker is generated for offline support. This is handled automatically during transpilation.

9. **Frontend routing is client-side**: The file `base/static/js/modules/app/index.js` is the router. Django `urls.py` files are **only for API endpoints** (AJAX/fetch calls). When adding a new user-facing page, you typically need to add a route in the frontend router, not a Django URL pattern.

10. **SPA architecture**: The Django backend serves the same HTML shell for all non-API paths. The frontend JavaScript reads the URL and decides what to render. This means you cannot rely on Django URL patterns for page-level access control — use the `requireLogin` flag in the frontend route definition instead.

11. **Editor can receive different identifier types**: The `Editor` class constructor accepts an `id` parameter that can be either a numeric document ID (normal flow) or a UUID string (share-token flow). Code that instantiates the Editor should be aware of both cases.

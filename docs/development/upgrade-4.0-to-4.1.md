# Upgrading Plugins from Fidus Writer 4.0.x to 4.1.0

This guide covers every breaking change that plugin developers need to address
when migrating a plugin from Fidus Writer 4.0.x to 4.1.0. Core behaviour that
has not changed is not repeated here.

---

## Breaking-change summary

| Area | What changed |
|---|---|
| **Frontend network functions** | `postBare` / `post` / `postJson` parameter order changed to `url, object, files, options` where `options` is a dict containing `csrfToken` and `keepalive` |
| **Backend request data** | `request.POST` is replaced by `request.JSON` (populated by new middleware) |
| **Frontend settings** | Compile-time `DefinePlugin` globals removed; use `getSettings()` instead |
| **FontAwesome** | Upgraded to `@fortawesome/fontawesome-free` v7 |
| **EDITOR\_SAVE\_MODE** | New Django setting; plugins that touch document saving must be aware of it |
| **E2EE\_MODE** | New Django setting controlling end-to-end encryption |
| **Plugin system** | Transpiled plugin indexes now export `{plugins: [[app, module], …]}` tuples with app-filtering; core pages iterate with `plugins.forEach(([app, plugin]) => …)` instead of `Object.keys(plugins).forEach(...)` |
| **Two-Factor Authentication** | `django-otp` is now active by default |
| **Brute-force protection** | `django-axes` is now active by default |
| **Password policy** | Minimum password length increased from 8 to 12 characters |
| **Password reset timeout** | Reduced from 3 days to 24 hours |

---

## 1. Frontend network functions

### What changed

`postBare`, `post`, and `postJson` keep their names but their signatures and
wire format have changed.

**Old (4.0.x)**

```/dev/null/old-network.js#L1-3
postBare(url, params = {}, csrfToken = false)
post(url, params = {}, csrfToken = false)
postJson(url, params = {}, csrfToken = false)
```

- Sent as `multipart/form-data`.
- Files were embedded directly inside `params` alongside scalar values.
- Non-file object values were `JSON.stringify`'d per-field; arrays used
  `key[]` field names.
- The backend read data from `request.POST` (all values were strings).

**New (4.1.0)**

```/dev/null/new-network.js#L1-3
postBare(url, object = {}, files = {}, options = {})
post(url, object = {}, files = {}, options = {})
postJson(url, object = {}, files = {}, options = {})
```

- Sends `application/json` by default; the entire `object` is serialised as
  the request body, so native types (numbers, booleans, arrays, nested
  objects) arrive on the backend without any manual coercion.
- `files` is passed as the **third** argument, whose value is
  a plain object mapping field names to `File`, `{file, filename}`, or an
  array of `File` values.
- `options` is passed as the **fourth** argument, an object that can contain
  `csrfToken` (string) and `keepalive` (boolean).
- When `files` is non-empty the request switches to `multipart/form-data`
  automatically and the JSON `object` is embedded as a field named `json`;
  the `JsonToPostMiddleware` middleware extracts it so views can still read
  `request.JSON` as usual.
- `postJson` continues to return `{json, status}`.

### Migration examples

#### Scalar-only POST

No change to the JavaScript call site — scalar values work identically.

```/dev/null/migrate-scalar.js#L1-5
// 4.0.x
postBare("/api/my-plugin/delete/", {id: itemId})

// 4.1.0 — unchanged
postBare("/api/my-plugin/delete/", {id: itemId})
```

#### POST with a file

```/dev/null/migrate-file.js#L1-12
// 4.0.x — file embedded inside params
postBare("/api/my-plugin/upload/", {
    id: itemId,
    file: someFile,
    filename: "attachment.pdf"
})

// 4.1.0 — file goes in the separate files argument
postBare("/api/my-plugin/upload/", {id: itemId}, {
    file: {file: someFile, filename: "attachment.pdf"}
})
```

#### POST with an object or array value

In 4.0.x you had to `JSON.stringify` nested values before sending them
because everything travelled as form fields. In 4.1.0 the whole `object` is
serialised to JSON once, so nested values work naturally.

```/dev/null/migrate-object.js#L1-14
// 4.0.x — nested value had to be stringified
postBare("/api/my-plugin/save/", {
    id: 1,
    content: JSON.stringify({nodes: [...]})
})

// 4.1.0 — no change needed in the JS call; nesting just works
postBare("/api/my-plugin/save/", {
    id: 1,
    content: {nodes: [...]}
})
```

#### POST with an array of files

```/dev/null/migrate-array-files.js#L1-11
// 4.0.x — no standard way; workarounds varied per plugin

// 4.1.0 — pass an array under a single key
postBare("/api/my-plugin/bulk-upload/", {folderId: 3}, {
    images: [file1, file2, file3]
})
// Each file is appended as images[] in the resulting FormData.
```

#### Using options (csrfToken, keepalive)

```/dev/null/migrate-options.js#L1-10
// 4.1.0 — pass options as the fourth argument
postJson("/api/my-plugin/save/", {id: 1}, {}, {
    csrfToken: "manually-provided-token",
    keepalive: true
})
// - csrfToken: Override the automatically detected CSRF token
// - keepalive: Keep the request alive even when page is unloading
```

---

## 2. Backend: `request.POST` → `request.JSON`

### What changed

A new middleware, `base.middleware.JsonToPostMiddleware`, is now loaded early
in the middleware stack. It parses incoming JSON bodies (or the embedded `json`
field in hybrid multipart requests) and attaches the result to `request.JSON`.
`request.JSON` is **always** a dict — it defaults to `{}` even when no body is
present.

### Migration: view code

Every view that previously read from `request.POST` must switch to
`request.JSON`. Beyond the rename, type coercions that were necessary because
form data is always strings are no longer needed.

| Value type | 4.0.x (`request.POST`) | 4.1.0 (`request.JSON`) |
|---|---|---|
| Integer | `int(request.POST["id"])` | `request.JSON["id"]` |
| Boolean | `request.POST["flag"] == "true"` | `request.JSON["flag"]` |
| JSON object/array | `json.loads(request.POST["data"])` | `request.JSON["data"]` |
| List | `request.POST.getlist("ids[]")` | `request.JSON["ids"]` |

**Old (4.0.x)**

```/dev/null/old-view.py#L1-12
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from base.decorators import ajax_required
import json

@login_required
@ajax_required
@require_POST
def my_view(request):
    item_id = int(request.POST["id"])
    active = request.POST["active"] == "true"
    data = json.loads(request.POST["data"])
    ids = request.POST.getlist("ids[]")
    ...
```

**New (4.1.0)**

```/dev/null/new-view.py#L1-12
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from base.decorators import ajax_required

@login_required
@ajax_required
@require_POST
def my_view(request):
    item_id = request.JSON["id"]        # already an int
    active = request.JSON["active"]     # already a bool
    data = request.JSON["data"]         # already a dict/list
    ids = request.JSON["ids"]           # already a list
    ...
```

### File-upload views

For views that accept both JSON data and file uploads, nothing extra is
required. The middleware automatically populates `request.JSON` from the
embedded `json` form field; uploaded files remain in `request.FILES`.

```/dev/null/upload-view.py#L1-14
@login_required
@ajax_required
@require_POST
def upload_attachment(request):
    # JSON data comes from the embedded "json" field parsed by middleware
    item_id = request.JSON["id"]

    # Files come from request.FILES as always
    uploaded_file = request.FILES.get("file")
    ...
```

### Allauth class-based views

If your plugin wraps an allauth form-based view (e.g. `LoginView`,
`SignupView`, `PasswordResetView`), use `JsonFormMixin` from `base.mixins` to
bridge the JSON body into the form's `data` kwarg:

```/dev/null/mixins-example.py#L1-8
from base.mixins import JsonFormMixin
from allauth.account.views import LoginView

class MyPluginLoginView(JsonFormMixin, LoginView):
    """LoginView that accepts a JSON body instead of form data."""
    pass
```

Always list `JsonFormMixin` **before** the allauth base class in the MRO so
its `get_form_kwargs` override takes effect.

---

## 3. Frontend settings: compile-time globals → `getSettings()`

### What changed

In 4.0.x, rspack's `DefinePlugin` injected settings as bare global constants
that were substituted at bundle-build time:

```/dev/null/old-settings.js#L1-15
// These identifiers were inlined at compile time — they are GONE in 4.1.0
settings_DEBUG
settings_STATIC_URL
settings_REGISTRATION_OPEN
settings_SOCIALACCOUNT_OPEN
settings_PASSWORD_LOGIN
settings_CONTACT_EMAIL
settings_IS_FREE
settings_TEST_SERVER
settings_CSRF_COOKIE_NAME
settings_SOURCE_MAPS
settings_USE_SERVICE_WORKER
settings_MEDIA_MAX_SIZE
settings_FOOTER_LINKS
settings_LANGUAGES
transpile_VERSION
staticUrl(url)   // global helper function — also gone
```

In 4.1.0, settings are populated at page-load time via `window.settings`
(rendered by the `frontend_settings.html` template include) and then passed to
`initSettings()` in the main app bundle. Access them in any module through
`getSettings()`:

```/dev/null/new-settings.js#L1-18
import {getSettings} from "../common"   // adjust relative path as needed

const settings = getSettings()

// Boolean / string / numeric settings
const isDebug = settings.DEBUG
const version = settings.VERSION
const maxUploadBytes = settings.MEDIA_MAX_SIZE  // number or false

// Helper methods
const iconUrl = settings.staticUrl("img/my-plugin-icon.png")
const csrfToken = settings.getCsrfToken()
```

### Full list of available settings properties

| Property | Type | Notes |
|---|---|---|
| `DEBUG` | boolean | |
| `STATIC_URL` | string | |
| `VERSION` | string | Build hash used for cache-busting |
| `BRANDING_LOGO` | string \| false | |
| `REGISTRATION_OPEN` | boolean | |
| `SOCIALACCOUNT_OPEN` | boolean | |
| `PASSWORD_LOGIN` | boolean | |
| `CONTACT_EMAIL` | string | |
| `IS_FREE` | boolean | |
| `TEST_SERVER` | boolean | |
| `CSRF_COOKIE_NAME` | string | |
| `SOURCE_MAPS` | boolean \| string | |
| `USE_SERVICE_WORKER` | boolean | |
| `MEDIA_MAX_SIZE` | number \| false | |
| `FOOTER_LINKS` | array | |
| `LANGUAGES` | array | |
| `EDITOR_SAVE_MODE` | string | `"collaborative"`, `"direct"`, or `"external"` |
| `E2EE_MODE` | string | `"disabled"`, `"enabled"`, or `"required"` |
| `TWO_FACTOR_ENABLED` | boolean | |

Helper methods on the settings object:

| Method | Description |
|---|---|
| `staticUrl(path)` | Returns `STATIC_URL + path + "?v=" + VERSION` |
| `apiUrl(url)` | Returns the API URL (identity in most deployments) |
| `getCsrfToken()` | Reads the CSRF token from the cookie |
| `postResponseHook(response)` | Called after every fetch response; strips Django messages |

### Migration examples

```/dev/null/migrate-settings.js#L1-22
import {getSettings} from "../common"

const settings = getSettings()

// 4.0.x                               → 4.1.0
// settings_DEBUG                      → settings.DEBUG
// settings_STATIC_URL                 → settings.STATIC_URL
// settings_REGISTRATION_OPEN          → settings.REGISTRATION_OPEN
// settings_MEDIA_MAX_SIZE             → settings.MEDIA_MAX_SIZE
// settings_FOOTER_LINKS               → settings.FOOTER_LINKS
// settings_LANGUAGES                  → settings.LANGUAGES
// transpile_VERSION                   → settings.VERSION
// staticUrl("img/icon.png")           → settings.staticUrl("img/icon.png")

// Example — previously:
if (settings_DEBUG) { console.log("debug mode") }

// Now:
if (settings.DEBUG) { console.log("debug mode") }
```

### Web worker caveat

`getSettings()` relies on `window.settings` and is **not available inside web
workers**. If your plugin spawns a web worker, pass `csrfToken` (and any other
required settings) explicitly as a constructor argument or via `postMessage`.

---

## 4. FontAwesome v7

The bundled icon library is now `@fortawesome/fontawesome-free` version **7**.
Review the FontAwesome v7 release notes for any icon class renames that affect
your plugin's templates or JavaScript.

---

## 5. EDITOR\_SAVE\_MODE

A new Django setting controls how the editor persists changes:

| Value | Behaviour |
|---|---|
| `"collaborative"` | WebSocket-based real-time collaboration (unchanged from 4.0.x, the default) |
| `"direct"` | No WebSocket; editor periodically POSTs the full document to `/api/document/save/` |
| `"external"` | No built-in saving; the `save_document` REST endpoint is blocked |

If your plugin hooks into the document-save lifecycle (e.g. listening for save
events, calling the save endpoint, or replacing the persistence layer
entirely), read `settings.EDITOR_SAVE_MODE` from the frontend settings object
and branch accordingly:

```/dev/null/save-mode-example.js#L1-12
import {getSettings} from "../common"

const settings = getSettings()

if (settings.EDITOR_SAVE_MODE === "external") {
    // Your plugin is responsible for saving — set up your own save timer
    setupExternalSave()
} else if (settings.EDITOR_SAVE_MODE === "direct") {
    // Collaborative features are unavailable
}
```

The server-side `DOC_SAVE_INTERVAL` setting (default 30 seconds) is only
relevant in `"collaborative"` mode.

---

## 6. Plugin system (custom hook authors only)

### What changed

In 4.0.x, each plugin type directory (`static/js/plugins/<type>/`) contained an
`init.js` that exported individual plugin classes directly. Core code imported
the whole module namespace and iterated with `Object.keys(plugins).forEach(...)`.

In 4.1.0, the transpiler generates a single `index.js` per plugin type that
exports a `plugins` array of `[app_name, module_namespace]` tuples. Core code
iterates with `plugins.forEach(([app, plugin]) => …)` and filters by
`this.app.settings.APPS.includes(app)` before instantiating any exported class.

**If your plugin only hooks into existing core pages** (e.g. you export a class
from `static/js/plugins/app/my_plugin.js` or
`static/js/plugins/editor/my_plugin.js`), **you do not need to change your
plugin code.** The transpiler and the core `activateFidusPlugins` methods handle
the new format automatically.

**You only need to act if your plugin creates its own hook point** — a custom
page or component that loads plugins from a `../../plugins/<type>` directory.
In that case, update your consumer code to match the new tuple format:

**Old (4.0.x)**

```/dev/null/old-plugin-consumer.js#L1-8
import * as plugins from "../../plugins/my_type"

Object.keys(plugins).forEach(plugin => {
    if (typeof plugins[plugin] === "function") {
        this.plugins[plugin] = new plugins[plugin](this)
        this.plugins[plugin].init()
    }
})
```

**New (4.1.0)**

```/dev/null/new-plugin-consumer.js#L1-13
import {plugins} from "../../plugins/my_type"

plugins.forEach(([app, plugin]) => {
    if (!this.app.settings.APPS.includes(app)) {
        return
    }
    Object.values(plugin).forEach(pluginExport => {
        if (typeof pluginExport === "function") {
            this.plugins[pluginExport.name] = new pluginExport(this)
            this.plugins[pluginExport.name].init()
        }
    })
})
```

### Key rules for custom hook authors

1. **Import the named `plugins` export**, not the namespace:
   ```js
   import {plugins} from "../../plugins/my_type"
   ```

2. **Iterate with tuple destructuring** (`[app, plugin]`) and **filter by
   `this.app.settings.APPS.includes(app)`** before instantiating anything.

3. **Use `Object.values(plugin)`** to enumerate the exported classes inside each
   module namespace.

---

## 7. E2EE\_MODE

A new Django setting `E2EE_MODE` controls end-to-end encryption support.

> **⚠ Experimental:** E2EE support has not yet been independently reviewed by security experts and is subject to change. Do not rely on it for deployments where strong security guarantees are required.

| Value | Behaviour |
|---|---|
| `"disabled"` | No E2EE; all documents are unencrypted (default) |
| `"enabled"` | Both encrypted and unencrypted documents are supported |
| `"required"` | Only E2EE documents are allowed |

Read `settings.E2EE_MODE` in the frontend if your plugin needs to adapt its
behaviour to the encryption posture of the deployment.

---

## 8. New security features

### Two-Factor Authentication

`django-otp` is now installed and active by default. TOTP-based 2FA is
available to all users. If your plugin customises the login flow or user
settings page, verify it remains compatible. To disable 2FA entirely, add
`'django_otp'` to `REMOVED_APPS` in `configuration.py`.

### Brute-force protection

`django-axes` is now active by default. After 5 failed login attempts from the
same IP + user agent + username combination, the account is locked out for 1
hour. Login-related plugin tests that exercise failed logins may need to reset
axes state between test cases (`call_command("axes_reset")`). To disable axes,
add `'axes'` to `REMOVED_APPS`.

### Stronger default password requirements

The minimum password length has been raised to **12 characters**. If your
plugin creates users programmatically during tests, ensure the test passwords
meet this requirement.

### Shorter password reset timeout

The password reset link timeout has been reduced from Django's default of 3
days to **24 hours**. Adjust any plugin tests that create reset tokens and then
assert they are still valid after a long time.

---

## Related documentation

- [Plugin Development Guide](plugin-development.md) — current (4.1.0) APIs
- [Software Structure](software-structure.md)
- [Contributing Guidelines](../contributing.md)

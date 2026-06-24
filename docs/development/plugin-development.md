# Plugin Development Guide

This guide explains how to extend Fidus Writer 4.1.0 with a custom plugin.
Fidus Writer's plugin model is a standard **Django app** that hooks into
the core application through registered settings, URL patterns, and
frontend JavaScript modules.

> **Upgrading from 4.0.x?** See the
> [4.0 → 4.1 upgrade guide](upgrade-4.0-to-4.1.md) for a complete list of
> breaking changes before reading this guide.

---

## Plugin structure

A plugin is a regular Django app. The conventional layout is:

```/dev/null/structure.txt#L1-18
my_plugin/
├── __init__.py
├── apps.py               # AppConfig (required)
├── models.py             # Database models (if needed)
├── views.py              # AJAX/REST views
├── urls.py               # URL patterns for your views
├── consumers.py          # WebSocket consumers (if needed)
├── package.json5         # npm dependencies (if needed)
├── templates/
│   └── my_plugin/        # Django templates (if needed)
└── static/
    └── js/
        └── modules/
            └── my_plugin/
                └── index.js   # Frontend entry point
```

---

## Step 1 — Create the Django app

```/dev/null/setup.sh#L1-3
python manage.py startapp my_plugin
```

### AppConfig

```/dev/null/apps.py#L1-8
# my_plugin/apps.py
from django.apps import AppConfig

class MyPluginConfig(AppConfig):
    name = "my_plugin"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self):
        pass  # connect signals here if needed
```

### Register the app

Add your plugin to `INSTALLED_APPS` in `configuration.py`:

```/dev/null/configuration.py#L1-5
INSTALLED_APPS = [
    # existing entries …
    "my_plugin",
]
```

---

## Step 2 — Backend views

### Decorator stack

Every AJAX view in Fidus Writer uses three decorators in this order:

```/dev/null/views-example.py#L1-22
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST

from base.decorators import ajax_required

@login_required        # redirect unauthenticated users
@ajax_required         # reject non-AJAX requests (checks X-Requested-With header)
@require_POST          # reject non-POST requests
def my_action(request):
    ...
    return JsonResponse({"ok": True})
```

`@ajax_required` is in `base.decorators`. It returns `400 Bad Request` for any
request that does not carry the `X-Requested-With: XMLHttpRequest` header.
The frontend network helpers add this header automatically.

For read-only endpoints you can omit `@require_POST` and use a `GET` view, but
all state-changing operations should be POST.

### Reading request data — `request.JSON`

All incoming JSON is parsed by `base.middleware.JsonToPostMiddleware` and
attached to `request.JSON` as a plain Python dict. `request.JSON` is always
initialised to `{}`, so you can safely call `.get()` without checking for
`AttributeError`.

Because the payload is real JSON, native types arrive as native Python types —
no casting required:

```/dev/null/views-types.py#L1-18
@login_required
@ajax_required
@require_POST
def save_item(request):
    # int arrives as int — no int() cast needed
    item_id = request.JSON["item_id"]

    # bool arrives as bool — no string comparison needed
    is_active = request.JSON.get("is_active", False)

    # nested dict/list arrives already parsed
    metadata = request.JSON.get("metadata", {})

    # list arrives as a Python list
    tag_ids = request.JSON.get("tag_ids", [])

    ...
    return JsonResponse({"ok": True})
```

### File-upload views

When the frontend sends files, the request arrives as `multipart/form-data`
with the JSON payload embedded in a field named `json`. The middleware still
populates `request.JSON` from that field automatically, and uploaded files are
in `request.FILES` as usual:

```/dev/null/views-upload.py#L1-18
@login_required
@ajax_required
@require_POST
def upload_asset(request):
    # JSON payload — middleware extracts it from the "json" form field
    item_id = request.JSON["item_id"]
    description = request.JSON.get("description", "")

    # File upload — standard Django
    asset = request.FILES.get("asset")
    if not asset:
        return JsonResponse({"error": "No file provided"}, status=400)

    # … process and save …
    return JsonResponse({"ok": True, "url": asset_url})
```

### Wrapping allauth class-based views

If your plugin adds a custom login, signup, or password-reset view that builds
on allauth's class-based views, mix in `JsonFormMixin` **first** so the form
is populated from `request.JSON` rather than `request.POST`:

```/dev/null/views-allauth.py#L1-12
from base.mixins import JsonFormMixin
from allauth.account.views import SignupView

class MyPluginSignupView(JsonFormMixin, SignupView):
    """Signup view that accepts a JSON body."""
    template_name = "my_plugin/signup.html"
```

`JsonFormMixin` is in `base.mixins`.

### URL patterns

```/dev/null/urls.py#L1-12
# my_plugin/urls.py
from django.urls import path
from . import views

app_name = "my_plugin"

urlpatterns = [
    path("save/", views.save_item, name="save_item"),
    path("upload/", views.upload_asset, name="upload_asset"),
]
```

Wire the plugin's URLs into the project from your `AppConfig.ready()` or, more
commonly, by including them in the project's root URL conf. The recommended
approach for third-party plugins is to add an `include` block in your
`AppConfig`:

```/dev/null/apps-urls.py#L1-14
# my_plugin/apps.py
from django.apps import AppConfig

class MyPluginConfig(AppConfig):
    name = "my_plugin"

    def ready(self):
        from django.urls import include, path
        from base import root_urls
        root_urls.urlpatterns += [
            path("api/my-plugin/", include("my_plugin.urls")),
        ]
```

---

## Step 3 — Frontend JavaScript

### Sending requests — `postBare`, `post`, `postJson`

Import the network helpers from `"fwtoolkit"` (adjust the relative path to
wherever your module lives):

```/dev/null/my-plugin-network.js#L1-10
import {post, postJson, postBare} from "fwtoolkit"
```

| Function | When to use |
|---|---|
| `postBare(url, object, csrfToken, files, keepalive)` | POST and handle the raw `Response` yourself |
| `post(url, object, csrfToken, files, keepalive)` | POST; throws on non-2xx, strips Django flash messages |
| `postJson(url, object, csrfToken, files, keepalive)` | POST and return `{json, status}` |

All three send `application/json` by default. The CSRF token is read from the
cookie automatically when `csrfToken` is `false` (the default). You only need
to pass a token explicitly in web workers (see below).

#### Scalar POST (most common case)

```/dev/null/post-scalar.js#L1-10
import {post} from "fwtoolkit"

async function deleteItem(itemId) {
    await post("/api/my-plugin/delete/", {id: itemId})
}
```

#### POST with a response body

```/dev/null/post-json.js#L1-10
import {postJson} from "fwtoolkit"

async function saveItem(itemId, metadata) {
    const {json, status} = await postJson("/api/my-plugin/save/", {
        id: itemId,
        metadata        // nested object — no JSON.stringify needed
    })
    if (status === 200) {
        console.log("Saved:", json)
    }
}
```

#### POST with a file

Pass a `files` object as the fourth argument. The request is automatically
sent as `multipart/form-data`; the JSON data remains available on the backend
as `request.JSON`.

```/dev/null/post-file.js#L1-16
import {post} from "fwtoolkit"

async function uploadAsset(itemId, file) {
    await post(
        "/api/my-plugin/upload/",
        {item_id: itemId, description: "My asset"},
        false,                                          // csrfToken — auto
        {asset: {file, filename: file.name}}            // files
    )
}
```

The `files` argument accepts:

| Value | Result |
|---|---|
| `{key: File}` | Appended as a single file under `key` |
| `{key: {file: File, filename: "name.ext"}}` | Appended with an explicit filename |
| `{key: [File, File, ...]}` | Each file appended as `key[]` |

#### Web worker caveat

`getCsrfToken()` reads `document.cookie` and is not available in web workers.
If your plugin uses a web worker, pass the token from the main thread and
supply it explicitly:

```/dev/null/worker-post.js#L1-12
// In the main thread — pass the token to the worker
import {getSettings} from "fwtoolkit"
const csrfToken = getSettings().getCsrfToken()
myWorker.postMessage({csrfToken})

// Inside the web worker — use it explicitly
import {postBare} from "fwtoolkit"
self.onmessage = async ({data}) => {
    await postBare("/api/my-plugin/sync/", {payload: data.payload}, data.csrfToken)
}
```

### Accessing settings — `getSettings()`

Runtime settings are exposed through `getSettings()`, exported from
`"fwtoolkit"`:

```/dev/null/settings-usage.js#L1-22
import {getSettings} from "fwtoolkit"

const settings = getSettings()

// Boolean flags
if (settings.DEBUG) { console.log("debug mode") }
if (!settings.REGISTRATION_OPEN) { hideSignupButton() }

// String / numeric values
const contactEmail = settings.CONTACT_EMAIL
const maxBytes = settings.MEDIA_MAX_SIZE   // number or false

// URL helpers
const iconUrl = settings.staticUrl("img/my-plugin/icon.svg")
// → "/static/img/my-plugin/icon.svg?v=<hash>"

// CSRF token (not needed when using post/postBare — they call this automatically)
const csrf = settings.getCsrfToken()
```

`getSettings()` throws if called before the app bundle has run `initSettings()`
(i.e. before the page is initialised). In practice this is never a problem for
module-level code that runs after the DOM is ready. Do not call it at module
definition time (i.e. at the top level of a module that is imported
speculatively); call it inside a function or class method instead.

See the full list of available properties in the
[4.0 → 4.1 upgrade guide § 3](upgrade-4.0-to-4.1.md#3-frontend-settings-compile-time-globals--getsettings).

### Icons — FontAwesome v7

Fidus Writer 4.1.0 bundles `@fortawesome/fontawesome-free` **version 7**.
Use Font Awesome classes in your templates or JavaScript-generated HTML as
documented in the Font Awesome v7 docs.

### Adding a frontend route

Fidus Writer is a single-page application. Django `urls.py` files handle only
API endpoints; all page-level navigation is handled client-side by the router
in `base/static/js/modules/app/index.js`.

To add a new page route for your plugin, extend the `routes` map on the `App`
instance. The cleanest way to do this from a plugin is to register an
`activateFidusPlugins` hook. A minimal plugin that adds a `/my-plugin/` route:

```/dev/null/plugin-route.js#L1-40
// my_plugin/static/js/modules/my_plugin/index.js

export class MyPlugin {
    constructor(app) {
        this.app = app
    }

    init() {
        this._addRoute()
    }

    _addRoute() {
        this.app.routes["my-plugin"] = {
            app: "my_plugin",
            requireLogin: true,          // set to false for public pages
            open: pathnameParts => {
                // pathnameParts is window.location.pathname.split("/")
                // e.g. for /my-plugin/42/ → ["", "my-plugin", "42", ""]
                const id = pathnameParts[2]
                return import("./page").then(
                    ({MyPluginPage}) => new MyPluginPage(this.app.config, id)
                )
            }
        }
    }
}
```

Route properties:

| Property | Type | Description |
|---|---|---|
| `app` | string | The Django app name this route belongs to |
| `requireLogin` | boolean | If `true`, unauthenticated users are redirected to the login page |
| `open(pathnameParts)` | function | Returns a page instance or a Promise resolving to one |
| `dbTables` | object | Optional IndexedDB table definitions for offline support |

Page instances must implement an `init()` method that returns a Promise.

### Registering the plugin so the core loads it

The core discovers plugins automatically — you do **not** need to edit any core
file. Place a JavaScript file inside your Django app's
`static/js/plugins/<type>/` directory, where `<type>` matches the hook point you
want to attach to:

| Plugin type directory | Loaded by | Typical use |
|---|---|---|
| `static/js/plugins/app/` | `App.activateFidusPlugins()` | Add SPA routes, app-level services |
| `static/js/plugins/editor/` | `Editor.activateFidusPlugins()` | Editor extensions (toolbars, sidebars, exporters) |
| `static/js/plugins/documents_overview/` | `DocumentOverview.activateFidusPlugins()` | Document overview extensions (bulk actions, extra columns) |
| `static/js/plugins/menu/` | `SiteMenu.activatePlugins()` | Extra top-level navigation items |
| `static/js/plugins/prelogin/` | `PreloginPage.activateFidusPlugins()` | Public page plugins (login, signup, password reset) |
| `static/js/plugins/login/` | `LoginPage` | Login-specific plugins |
| `static/js/plugins/profile/` | `Profile.activateFidusPlugins()` | User profile page extensions |

Export your plugin class from that file:

```/dev/null/plugin-registration.js#L1-8
// my_plugin/static/js/plugins/app/my_plugin.js
export class MyPlugin {
    constructor(app) { … }
    init() { … }
}
```

During transpilation, `django-npm-mjs` collects every `.js` file in those
directories across all installed apps and generates a single `index.js` per
type. The generated `index.js` exports a `plugins` array of
`[app_name, module_namespace]` tuples. Core code imports `{plugins}` and
instantiates every exported class whose app is present in
`this.app.settings.APPS`.

You only need one file per hook point; if you need to register both an app
route and a menu item, create two files:

```
my_plugin/static/js/plugins/app/my_plugin.js
my_plugin/static/js/plugins/menu/my_plugin.js
```

---

## Step 4 — npm dependencies

If your plugin needs additional JavaScript packages, add a `package.json5` file
at the root of your Django app. Fidus Writer's build system merges all
`package.json5` files from installed apps before running npm. The `.json5`
format allows comments:

```/dev/null/package.json5#L1-12
// my_plugin/package.json5
{
    dependencies: {
        // Example: add a charting library
        "chart.js": "^4.4.0"
    }
}
```

Then run:

```/dev/null/install.sh#L1-2
python manage.py npm_install
python manage.py transpile
```

---

## Step 5 — Transpiling JavaScript

The browser never loads source `.mjs`/`.js` files directly; it loads the
rspack bundle from `static-transpile/`. After any frontend change, run:

```/dev/null/transpile.sh#L1-2
python manage.py transpile          # incremental
python manage.py transpile --force  # force full rebuild (needed for tests)
```

During development with `runserver`, transpilation happens automatically (with
a 30-second throttle) when source files change.

---

## EDITOR\_SAVE\_MODE awareness

If your plugin interacts with the document save lifecycle, check
`settings.EDITOR_SAVE_MODE` at runtime:

| Mode | Meaning |
|---|---|
| `"collaborative"` | WebSocket-based real-time collaboration (default) |
| `"direct"` | Periodic REST saves, no real-time collaboration |
| `"external"` | No built-in saving; your plugin (or another) owns persistence |

```/dev/null/save-mode.js#L1-14
import {getSettings} from "fwtoolkit"

export class MyPluginSaveExtension {
    init() {
        const {EDITOR_SAVE_MODE} = getSettings()
        if (EDITOR_SAVE_MODE === "external") {
            // The core will not save — take over here
            this._startSaveTimer()
        }
        // In "collaborative" and "direct" modes the core handles saving
    }
}
```

---

## Models and migrations

Add models to `models.py` as you would in any Django app, then generate and
apply migrations:

```/dev/null/migrate.sh#L1-2
python manage.py makemigrations my_plugin
python manage.py migrate
```

---

## Example: a minimal complete plugin

Below is a condensed end-to-end example of a plugin that adds a "notes"
sidebar to the editor. It is intentionally brief — refer to the existing
`bibliography` and `usermedia` apps for production-quality examples.

**`my_plugin/views.py`**

```/dev/null/example-views.py#L1-28
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST

from base.decorators import ajax_required
from .models import Note

@login_required
@ajax_required
@require_POST
def save_note(request):
    doc_id = request.JSON["doc_id"]
    text = request.JSON.get("text", "")
    note, _ = Note.objects.update_or_create(
        document_id=doc_id,
        owner=request.user,
        defaults={"text": text}
    )
    return JsonResponse({"ok": True, "id": note.pk})

@login_required
@ajax_required
@require_POST
def get_note(request):
    doc_id = request.JSON["doc_id"]
    try:
        note = Note.objects.get(document_id=doc_id, owner=request.user)
        return JsonResponse({"text": note.text})
    except Note.DoesNotExist:
        return JsonResponse({"text": ""})
```

**`my_plugin/static/js/modules/my_plugin/notes.js`**

```/dev/null/example-notes.js#L1-28
import {postJson} from "fwtoolkit"
import {getSettings} from "fwtoolkit"

export class NotesPlugin {
    constructor(editor) {
        this.editor = editor
        this.docId = editor.docInfo.id
    }

    async init() {
        const {json} = await postJson("/api/my-plugin/get-note/", {
            doc_id: this.docId
        })
        this._render(json.text)
    }

    async save(text) {
        const settings = getSettings()
        if (settings.DEBUG) {
            console.log("Saving note for doc", this.docId)
        }
        await postJson("/api/my-plugin/save-note/", {
            doc_id: this.docId,
            text
        })
    }

    _render(text) {
        // … build sidebar UI …
    }
}
```

---

## Publishing your plugin

1. Create a public Git repository (GitHub, GitLab, etc.).
2. Add a `setup.py` or `pyproject.toml` so the plugin can be installed with
   `pip install git+https://…` or from PyPI.
3. Document the required `INSTALLED_APPS` entry and any configuration options.
4. Optionally publish to PyPI for discoverability.

---

## Related documentation

- [4.0 → 4.1 Upgrade Guide](upgrade-4.0-to-4.1.md) — breaking changes for
  plugin developers migrating from 4.0.x
- [Software Structure](software-structure.md) — architecture overview
- [API Documentation](api.md) — REST endpoint reference
- [Testing Guide](testing.md) — writing and running tests
- [Contributing Guidelines](../contributing.md)

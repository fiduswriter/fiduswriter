# Anonymous Document Access

Allowing documents to be shared and edited without a login using secure share tokens.

## Overview

Fidus Writer supports sharing documents via URL tokens that do not require the recipient to have an account. A document owner generates a share token from the access-rights dialog; the resulting link can be sent to anyone. Opening the link grants access with the rights encoded in the token (read, comment, or write).

The implementation is fully additive — no existing authentication flows, models, or WebSocket protocol messages are removed or broken.

## Share Token Model

**File:** `document/models.py`

```python
class ShareToken(models.Model):
    token      = models.UUIDField(unique=True, default=uuid.uuid4)
    document   = models.ForeignKey(Document, on_delete=models.CASCADE)
    rights     = models.CharField(choices=RIGHTS_CHOICES, max_length=21)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL
    )
    expires_at = models.DateTimeField(null=True, blank=True)
    note       = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    is_active  = models.BooleanField(default=True)
```

Fields:

| Field | Purpose |
|---|---|
| `token` | UUID v4 — the secret embedded in the share URL; effectively unguessable |
| `document` | The document this token grants access to |
| `rights` | One of the existing `RIGHTS_CHOICES` values |
| `created_by` | The logged-in owner who generated the token |
| `expires_at` | Optional hard expiry; `None` means the token never expires on its own |
| `note` | Human-readable label so the owner remembers what the link is for |
| `is_active` | Soft-delete flag; set to `False` to revoke without deleting the row |

## Token Validation Helper

**File:** `document/helpers/token_access.py`

```python
def get_token_access(token_str):
    share_token = ShareToken.objects.select_related("document").filter(
        token=token_str,
        is_active=True,
    ).first()
    if not share_token:
        return None, None

    if share_token.expires_at and share_token.expires_at < timezone.now():
        return None, None

    return share_token.document, share_token.rights
```

Look up a share token and return `(document, rights)` if valid, or `(None, None)` if the token is unknown, inactive, or expired.

## HTTP API Endpoints

**File:** `document/views.py`, `document/urls.py`

| Endpoint | Auth | Purpose |
|---|---|---|
| `POST /api/document/share_token/create/` | Required | Create a new token |
| `POST /api/document/share_token/list/` | Required | List active tokens for a document |
| `POST /api/document/share_token/revoke/` | Required | Revoke a token (soft delete) |
| `GET /api/document/share_token/validate/<token>/` | None | Validate a token; returns `document_id`, `rights`, `title`, `ws_base` |

The validate endpoint is public — it requires no authentication — and is called by the frontend before opening the WebSocket connection. The `ws_base` field is included so that guests do not need to make a second authenticated request to `get_ws_base`.

## WebSocket Consumer Changes

### GuestUser Dataclass

**File:** `base/base_consumer.py`

```python
@dataclass
class GuestUser:
    id: str              # token UUID string — stable identity across reconnections
    token: str            # same UUID string
    token_rights: str
    is_authenticated: bool = True
    readable_name: str = "Guest"

    @property
    def username(self):
        # Slug-safe version of readable_name (no spaces)
        return self.readable_name.lower().replace(" ", "")

    def get_full_name(self):
        return self.readable_name
```

`readable_name` is updated to include the `session_id` after the WebSocket subscribe handler assigns it (e.g. `"Guest 3"`). This allows multiple simultaneous guests to be distinguished in the participant list and comments. The `username` property returns a Django-valid slug (`"guest3"`) suitable for use in comment attribution.

`id` is the token UUID — stable across reconnections — so that a guest can always edit/delete their own comments regardless of how many times they reconnect.

### Base Consumer

**File:** `base/base_consumer.py`

The `init()` method is extended to check for a `token` query-string parameter on the WebSocket URL when the user is not authenticated:

```python
async def init(self):
    # ...
    if not self.user.is_authenticated:
        token_str = self._extract_token_from_scope()
        if token_str:
            guest = await self._resolve_guest_user(token_str)
            if guest:
                self.user = guest
            else:
                await self.access_denied()
                return False
        else:
            await self.access_denied()
            return False
```

Subclasses override `_resolve_guest_user()` to validate the token against the document they manage.

### Document Consumer

**File:** `document/consumers.py`

The document consumer overrides `_resolve_guest_user()` to validate the token against the document's ID:

```python
async def _resolve_guest_user(self, token_str):
    document, rights = await sync_to_async(get_token_access)(token_str)
    if document and document.id == self.document_id:
        return GuestUser(
            id=str(token_str),
            token=str(token_str),
            token_rights=rights
        )
    return None
```

After `session_id` is assigned in `subscribe()`, the `readable_name` is updated to include it:

```python
if isinstance(self.user, GuestUser):
    self.user.readable_name = f"Guest {self.id}"
```

The `can_communicate()` check uses `token_rights` for guests, so comment and chat rights are respected.

### Guest User Document Templates

**File:** `document/consumers.py`

Guest users cannot create document copies, so the document-templates query in `send_styles()` is skipped for them:

```python
if isinstance(self.user, GuestUser):
    document_templates = {}
else:
    query = DocumentTemplate.objects.filter(
        Q(user=self.user) | Q(user=None)
    ).order_by(F("user").desc(nulls_first=True))
    async for obj in query.aiterator():
        document_templates[obj.import_id] = {"title": obj.title, "id": obj.id}
```

## Frontend Editor Integration

### Share URL Route

**File:** `base/static/js/modules/app/index.js`

The frontend router already has a `share` route:

```javascript
share: {
    app: "document",
    requireLogin: false,
    open: pathnameParts => {
        let token = pathnameParts.pop()
        if (!token.length) {
            token = pathnameParts.pop()
        }
        return import("../editor").then(({Editor}) => new Editor(this.config, path, token))
    }
}
```

No changes were needed here.

### Token Detection and Validation

**File:** `document/static/js/modules/editor/index.js`

The editor constructor detects a UUID token and stores it:

```javascript
if (uuid4Pattern.test(idString)) {
    this.docInfo.id = idString
    this.docInfo.token = idString
}
```

In `init()`, before opening the WebSocket, the token is validated and the numeric document ID is resolved:

```javascript
if (uuid4Pattern.test(this.docInfo.id)) {
    this.docInfo.token = this.docInfo.id
    initPromises.push(
        postJson(`/api/document/share_token/validate/${this.docInfo.token}/`).then(({json, status}) => {
            if (status === 200 && json.document_id) {
                this.docInfo.id = json.document_id
                this.docInfo.access_rights = json.rights
                this.docInfo.wsBase = json.ws_base
            } else {
                return Promise.reject(new Error("Invalid or expired share link"))
            }
        })
    )
}
```

If `wsBase` is already set (from the validate response), the `get_ws_base` call is skipped. Otherwise the logged-in endpoint is used.

The token is passed in the WebSocket URL query string: `?token=<uuid>`.

### Guest User Object in the Editor

**File:** `document/static/js/modules/editor/index.js`

The `Editor` constructor receives `this.config.user` which for guests is `{"is_authenticated": False}` — a bare object with no `id` or `name`. This is replaced with a proper placeholder:

```javascript
this.user = user.is_authenticated
    ? user
    : {id: undefined, username: "", name: "", is_authenticated: false}
```

After the document loads and `session_id` is known, `loadDocument()` in `collab/doc.js` updates this to the full guest user object:

```javascript
if (!this.mod.editor.user.is_authenticated) {
    this.mod.editor.user = {
        id: token,  // stable token UUID
        username: `guest${sessionId}`,  // display name per session
        name: `Guest ${sessionId}`,
        is_authenticated: false,
    }
}
```

This ensures every template and code path that accesses `editor.user.name` or `editor.user.id` works correctly without special-casing.

## Comment System

### Comment Attribution

Comments store `user` (the stable token UUID for guests) and `username` (the display name, e.g. `"guest3"`). The `Comment` class constructor accepts `user` and `username` from `editor.user`.

For guests, `editor.user.username` returns the slug-safe form (e.g. `"guest3"`) via the `GuestUser.username` property. For registered users it returns the real username.

### pastParticipants

**File:** `document/static/js/modules/editor/comments/store.js`

New unsaved comments may have `user: undefined`. The `addLocalComment()` guard prevents these from being added to `pastParticipants`:

```javascript
if (commentData.user !== undefined &&
    !this.mod.editor.mod.collab.pastParticipants.find(
        participant => participant.id === commentData.user
    )
) {
    this.mod.editor.mod.collab.pastParticipants.push({
        id: commentData.user,
        name: commentData.username
    })
}
```

This avoids `escapeText(undefined)` errors in the filter dropdown template.

## Share Token Management UI

**File:** `document/static/js/modules/documents/access_rights/index.js`, `document/static/js/modules/documents/access_rights/templates.js`

The access-rights dialog has a second tab, "Share link", available when a single document is selected. It shows all active tokens and allows creating, copying, and revoking them.

API calls:

| Action | Endpoint |
|---|---|
| Tab opens | `POST /api/document/share_token/list/` |
| Create | `POST /api/document/share_token/create/` |
| Revoke | `POST /api/document/share_token/revoke/` |
| Copy | `navigator.clipboard.writeText(url)` (client-side only) |

## Menu Adaptations for Guests

**File:** `document/static/js/modules/editor/menus/headerbar/model.js`, `document/static/js/modules/editor/menus/headerbar/view.js`

| Menu item | Change for guests |
|---|---|
| Share | Hidden (`disabled: !!editor.docInfo.token`) |
| Create copy | Hidden (`disabled: editor.app.isOffline() || !!editor.docInfo.token`) |
| Download | Enabled (token sent in request; `get_template_for_doc` accepts token) |
| Save revision | Hidden (`disabled: access_rights !== "write" || isOffline() || token`) |
| Close | Title/tooltip change to "Sign up / Log in" (function, evaluated at render) |
| Print/PDF | Enabled |

The `×` button in the header bar also redirects to `/account/sign-up/` or `/` depending on registration settings.

## Download with Token

**File:** `document/static/js/modules/exporter/native/file.js`, `document/static/js/modules/exporter/native/zip.js`, `document/static/js/modules/document_template/exporter.js`

The download chain threads a `token` parameter through:

`ExportFidusFile` → `ZipFidus` → `DocumentTemplateExporter` → `postJson(params)` (token added only when truthy)

**File:** `document/views.py`

`get_template_for_doc` accepts a token as an alternative to login:

```python
def get_template_for_doc(request):
    if request.user.is_authenticated:
        doc = Document.objects.filter(
            Q(owner=request.user) | Q(accessright__user=request.user)
        ).select_related("template").prefetch_related(...).first()
    else:
        token_str = request.POST.get("token", "")
        token_doc, _rights = get_token_access(token_str)
        if token_doc and str(token_doc.id) == str(doc_id):
            doc = Document.objects.filter(id=doc_id).select_related("template").first()
        else:
            doc = None
```

## Security Considerations

| Concern | Mitigation |
|---|---|
| Token guessing | UUID v4 — 128-bit random, ~5 × 10³⁸ possibilities |
| Token enumeration via validate endpoint | Rate-limit by IP; only returns minimal public info |
| Token replay after revocation | `is_active` checked on every WS connect and HTTP validate call |
| Token expiry | `expires_at` compared against `timezone.now()` on every access |
| Guest accessing as wrong document | Token validated against document ID in consumer's `_resolve_guest_user()` |
| Privilege escalation | Token rights enforced server-side; client-side UI changes are cosmetic only |
| Guest re-sharing | Guest users receive no token in outbound WS messages; Share UI is hidden |
| Comment authorization | `comment.user` stored as token UUID; integer user IDs never collide with UUID strings |

---

**Last Updated:** March 2026
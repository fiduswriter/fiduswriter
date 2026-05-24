# Plan: fiduswriter-gitrepo-export Improvements

## 1. Overview

The `fiduswriter-gitrepo-export` plugin exports books to GitHub and GitLab
repositories. We want to:

- Support **more export formats**, notably those provided by
  `fiduswriter-pandoc` via `pandoc-wasm`.
- Support **individual document exports** so the plugin works without the books
  plugin.
- Support **Forgejo** as an additional git platform.

---

## 2. Existing Architecture

### 2.1 Data model (`models.py`)

`BookRepository` links a `book.models.Book` to a git repository:

```
repo_id       IntegerField
repo_name     CharField(256)
repo_type     CharField(6)     choices: ("github", "gitlab")
export_epub   BooleanField
export_unpacked_epub  BooleanField
export_html   BooleanField
export_unified_html   BooleanField
export_latex  BooleanField
export_odt    BooleanField
export_docx   BooleanField
```

`RepoInfo` caches a user's fetched repos in a JSONField `content`.

### 2.2 Backend views (`views.py`)

| View | Method | Purpose |
|------|--------|---------|
| `get_book_repos` | GET | Returns all BookRepository rows for the user's books |
| `update_book_repo` | POST | Creates/updates/deletes a BookRepository row |
| `get_git_repos` | GET | Fetches repos from GitHub + GitLab via SocialTokens |
| `proxy_github` | GET/POST/PATCH | Proxies requests to GitHub API |
| `proxy_gitlab` | GET/POST/PATCH | Proxies requests to GitLab API |
| `get_gitlab_repo` | GET | Fetches GitLab repo file tree |

### 2.3 Frontend structure

```
modules/gitrepo_export/
  index.js              → re-exports books_overview
  books_overview.js     → main controller: fetches repos, renders dialog, triggers export
  templates.js          → static HTML with 7 hardcoded checkbox rows
  tools.js              → gitHashObject(), readBlobPromise()
  github/
    book_processor.js   → orchestrates: iterates 7 booleans → starts exporters
    book_exporters.js   → 7 classes extending native book exporters
    tools/              → commitFile, commitZipContents, commitTree, promiseChain
  gitlab/
    book_processor.js   → analogously orchestrated
    book_exporters.js   → 7 classes extending native book exporters
    tools/              → commitFiles, zipToBlobs
plugins/books_overview/
  gitrepo_export.js     → re-exports from modules
```

### 2.4 Commit pipeline

**GitHub:** `commitFile(blob)` → creates Git blob, returns tree entry → aggregator calls
`commitTree(tree)` → POST tree → POST commit → PATCH ref.

**GitLab:** `zipToBlobs(zip)` → opens ZIP, produces `{filepath: blob}` map →
`commitFiles(blobs)` → single POST to `/repository/commits` with actions array.

### 2.5 Pandoc plugin (`fiduswriter-pandoc`)

- `constants.js` — import formats list
- `exporter.js` — `PandocConversionExporter` for single documents
- `book_exporter.js` — `PandocBookExporter`: converts chapters sequentially,
  accumulates `this.textFiles` / `this.httpFiles`, then zips + downloads.
- `editor.js` — adds export menu items (12+ formats)
- `plugins/books_overview/pandoc.js` — adds 12 book export formats via
  `PandocBookExporter`

The pandoc book exporter produces this ZIP structure:
```
book.json
chapters/0/<slug>.<ext>
chapters/1/<slug>.<ext>
...
bibliography.bib
```

---

## 3. Improvement 1: JSONField `targets` Instead of BooleanFields

### 3.1 Problem

Each export format requires a separate `BooleanField`, a migration, updates in
every view, and changes in every frontend file. Adding new formats (e.g. from
pandoc) is extremely heavy.

### 3.2 Solution

Replace the 7 BooleanFields with a single JSONField:

```python
targets = models.JSONField(default=list, blank=True)
```

Values are strings:

| Format | `targets` value |
|--------|----------------|
| EPUB | `"epub"` |
| Unpacked EPUB | `"unpacked_epub"` |
| HTML | `"html"` |
| Unified HTML | `"unified_html"` |
| LaTeX | `"latex"` |
| ODT | `"odt"` |
| DOCX | `"docx"` |
| Pandoc Markdown | `"pandoc:markdown"` |
| Pandoc reStructuredText | `"pandoc:rst"` |
| Pandoc JATS XML | `"pandoc:jats"` |
| … | … |

### 3.3 Migration (#0003)

1. Add `targets` JSONField with `default=list`.
2. RunPython data migration to populate from old Booleans.
3. Remove the 7 legacy BooleanFields.

### 3.4 Backend impact

- `get_book_repos` — return `targets` list instead of individual keys.
- `update_book_repo` — receive `targets` list instead of individual booleans.

### 3.5 Frontend impact

- `templates.js` — dynamically render checkboxes from a format list (fetched
  from a new API endpoint, see §6).
- `books_overview.js` — read/write `targets` array.
- `book_processor.js` — iterate `targets` to decide which exporters to start.

---

## 4. Improvement 2: Pandoc Format Support in Git Export

### 4.1 Problem

The native book exporters (EPUB, HTML, LaTeX, ODT, DOCX) each have GitHub /
GitLab subclasses that override `download()` or `createZip()` to feed into the
commit pipeline. `PandocBookExporter` has no such subclass — it only produces
a browser-downloadable ZIP.

### 4.2 Book level: bridge classes

`PandocBookExporter.exportContents()` processes each chapter and accumulates
`this.textFiles` and `this.httpFiles`, then calls `this.createZip()` →
`this.download(blob)`. For git export we override `createZip()` to run the
commit pipeline instead:

```javascript
// github/book_exporters.js — new
export class PandocBookGithubExporter extends PandocBookExporter {
    constructor(schema, csl, book, user, docList, updated, format, ext, mime, repo) {
        super(schema, csl, book, user, docList, updated, format, ext, mime)
        this.repo = repo
    }

    createZip() {
        // Redirect ZIP output into GitHub commit pipeline
        return commitZipContents(
            this.repo,
            this.textFiles,
            this.httpFiles,
            [],
            ""  // root directory
        )
    }

    download(blob) {
        return Promise.resolve([])  // not used
    }
}
```

```javascript
// gitlab/book_exporters.js — new
export class PandocBookGitlabExporter extends PandocBookExporter {
    // Same pattern but uses zipToBlobs() instead
    createZip() {
        return zipToBlobs(this.textFiles, this.httpFiles, [], "")
            .then(blobs => ({...blobs}))  // return for commitFiles
    }
}
```

**Directory structure in the repo** (matches pandoc ZIP layout):
```
book.json
chapters/0/my-first-chapter.md
chapters/1/another-chapter.rst
bibliography.bib
```

### 4.3 Document level: bridge classes

`PandocConversionExporter.createExport()` runs `pandoc-wasm convert()`, then
either downloads directly (if `fullFileExport`) or pushes to `textFiles` and
calls `createDownload()` (which zips). For git export we need to redirect the
output into a commit.

The cleanest approach: factor the conversion result out of the download
concern. Add a `commitTarget` option:

```javascript
export class PandocConversionGitExporter extends PandocConversionExporter {
    constructor(format, ext, mime, options, doc, bibDB, imageDB, csl, updated, repo, repoType) {
        super(format, ext, mime, options, doc, bibDB, imageDB, csl, updated)
        this.repo = repo
        this.repoType = repoType
    }

    createExport() {
        // Run conversion (same as parent)
        // Instead of download/zip, commit file directly
        // File naming: slug.format-key.ext (see §4.4)
    }
}
```

An alternative that requires less refactoring: add a `targetRepo` option to
`PandocConversionExporter` that, when set, calls a commit helper instead of
`download()`.

### 4.4 File naming for documents

Rule: if the extension is unique per format, use `<slug>.<ext>`. If multiple
formats share an extension, use `<slug>.<format-key>.<ext>`.

| Format | Filename |
|--------|----------|
| EPUB | `my-document.epub` |
| HTML | `my-document.html` |
| LaTeX | `my-document.latex` |
| ODT | `my-document.odt` |
| DOCX | `my-document.docx` |
| Markdown (pandoc) | `my-document.md` |
| GitHub-Flavored Markdown | `my-document.gfm.md` |
| Pandoc Markdown | `my-document.markdown.md` |
| Commonmark | `my-document.commonmark.md` |
| MultiMarkdown | `my-document.mmd.md` |
| reStructuredText | `my-document.rst` |
| JATS XML | `my-document.jats.xml` |
| TEI Simple | `my-document.tei.xml` |
| Typst | `my-document.typst.typ` |

The format registry (see §6) includes a `key` field that serves as the
middle extension when needed.

---

## 5. Improvement 3: Document-Level Git Export

### 5.1 New model

```python
# models.py
class DocumentRepository(models.Model):
    document = models.ForeignKey("document.Document", on_delete=models.CASCADE)
    repo_id = models.IntegerField()
    repo_name = models.CharField(max_length=256)
    repo_type = models.CharField(max_length=8, choices=REPO_TYPES)
    targets = models.JSONField(default=list, blank=True)

    class Meta:
        verbose_name_plural = "Document repositories"
```

### 5.2 Making the books dependency optional

Currently `from book.models import Book` at module level will crash if the
books app is not installed. All references to books need to be conditional.

**Pattern — models:**
```python
from django.apps import apps

if apps.is_installed("book"):
    class BookRepository(models.Model):
        book = models.ForeignKey("book.Book", on_delete=models.CASCADE)
        # ... fields ...
        class Meta:
            verbose_name_plural = "Book repositories"
```

**Pattern — views:**
```python
from django.apps import apps
books_installed = apps.is_installed("book")

if books_installed:
    from book.models import Book
```

**Pattern — URL patterns:**
```python
from django.apps import apps

urlpatterns = [
    # Always available
    re_path("^get_git_repos/.*$", views.get_git_repos, name="get_git_repos"),
    re_path("^proxy_github/(?P<path>.*)$", views.proxy_github, name="proxy_github"),
    re_path("^proxy_gitlab/(?P<path>.*)$", views.proxy_gitlab, name="proxy_gitlab"),
    re_path("^get_document_repos/$", views.get_document_repos, name="get_document_repos"),
    re_path("^update_document_repo/$", views.update_document_repo, name="update_document_repo"),
]

if apps.is_installed("book"):
    urlpatterns += [
        re_path("^get_book_repos/$", views.get_book_repos, name="get_book_repos"),
        re_path("^update_book_repo/$", views.update_book_repo, name="update_book_repo"),
        re_path("^get_gitlab_repo/(?P<id>.*)/$", views.get_gitlab_repo, name="get_gitlab_repo"),
    ]
```

**Pattern — admin:**
```python
if apps.is_installed("book"):
    admin.site.register(models.BookRepository, BookRepositoryAdmin)
admin.site.register(models.DocumentRepository, DocumentRepositoryAdmin)
```

### 5.3 New backend views

```python
@login_required
@ajax_required
@require_GET
def get_document_repos(request):
    """Return DocumentRepository rows for the user's documents."""
    repos = models.DocumentRepository.objects.filter(
        Q(document__owner=request.user) |
        Q(document__accessright__holder_id=request.user.id)
    ).distinct()
    return JsonResponse({"repos": serialize(repos)})


@login_required
@ajax_required
@require_POST
def update_document_repo(request):
    """Create/update/delete a DocumentRepository row."""
    doc_id = request.JSON["document_id"]
    doc = Document.objects.filter(id=doc_id).first()
    if not doc or (doc.owner != request.user and not has_write_access(request.user, doc)):
        return HttpResponseForbidden()
    models.DocumentRepository.objects.filter(document_id=doc_id).delete()
    repo_id = request.JSON["repo_id"]
    if repo_id > 0:
        models.DocumentRepository.objects.create(
            document_id=doc_id,
            repo_id=repo_id,
            repo_name=request.JSON["repo_name"],
            repo_type=request.JSON["repo_type"],
            targets=request.JSON["targets"],
        )
        return HttpResponse(status=201)
    return HttpResponse(status=200)
```

### 5.4 New frontend — document overview

The document overview lives at
`fiduswriter/fiduswriter/fiduswriter/document/static/js/`. We need to
determine its plugin mechanism and hook in.

**Expected structure:**
```
static/js/plugins/document_overview/
    gitrepo_export.js    → exports the document overview controller
static/js/modules/gitrepo_export/
    documents_overview.js   → main controller for document git export
```

The document controller mirrors `GitrepoExporterBooksOverview`:
- Fetches document repos
- Adds dialog panel to document settings (repo selector + format checkboxes)
- Adds a bulk action button on the document overview page
- Adds an export action to the document edit dialog

**New document processors:**

```
github/
  document_processor.js    → analogous to book_processor.js
  document_exporters.js    → native + pandoc document exporters for GitHub
gitlab/
  document_processor.js    → same for GitLab
  document_exporters.js    → same for GitLab
```

### 5.5 File naming

For individual documents, files go flat in the repo root:
```
<slug>.<ext>          or    <slug>.<format-key>.<ext>
```

---

## 6. Improvement 4: Format Registry (Cross-Plugin)

### 6.1 Problem

The list of available export formats needs to be:

- Always include native formats (EPUB, HTML, LaTeX, ODT, DOCX).
- Include pandoc formats when the pandoc plugin is installed.
- Queryable from the frontend via an API endpoint so checkboxes can be
  rendered dynamically.

### 6.2 Design

**API endpoint** (`/api/gitrepo_export/get_export_formats/`):

```python
@login_required
@ajax_required
@require_GET
def get_export_formats(request):
    return JsonResponse({"formats": get_all_formats()})
```

The `get_all_formats()` function builds the list at runtime using try/except
imports:

```python
# gitrepo_export/formats.py

NATIVE_FORMATS = [
    {"label": "EPUB", "key": "epub", "ext": "epub", "binary": True},
    {"label": "Unpacked EPUB", "key": "unpacked_epub", "ext": "", "binary": False},
    {"label": "HTML", "key": "html", "ext": "", "binary": False},
    {"label": "Unified HTML", "key": "unified_html", "ext": "html", "binary": False},
    {"label": "LaTeX", "key": "latex", "ext": "", "binary": False},
    {"label": "ODT", "key": "odt", "ext": "odt", "binary": True},
    {"label": "DOCX", "key": "docx", "ext": "docx", "binary": True},
]

PANDOC_FORMATS = [
    {"label": "Markdown", "key": "pandoc:markdown", "ext": "md", "binary": False},
    {"label": "Commonmark", "key": "pandoc:commonmark", "ext": "md", "binary": False},
    {"label": "reStructuredText", "key": "pandoc:rst", "ext": "rst", "binary": False},
    {"label": "LaTeX", "key": "pandoc:latex", "ext": "tex", "binary": False},
    {"label": "DocBook", "key": "pandoc:docbook", "ext": "dbk", "binary": False},
    {"label": "JATS XML", "key": "pandoc:jats", "ext": "xml", "binary": False},
    {"label": "TEI Simple", "key": "pandoc:tei", "ext": "xml", "binary": False},
    {"label": "Emacs Org Mode", "key": "pandoc:org", "ext": "org", "binary": False},
    {"label": "Textile", "key": "pandoc:textile", "ext": "textile", "binary": False},
    {"label": "Typst", "key": "pandoc:typst", "ext": "typ", "binary": False},
    {"label": "Richtext (RTF)", "key": "pandoc:rtf", "ext": "rtf", "binary": False},
    {"label": "ICML (Indesign)", "key": "pandoc:icml", "ext": "icml", "binary": False},
]

def get_all_formats():
    formats = NATIVE_FORMATS.copy()
    try:
        from pandoc.export_formats import FORMATS as pandoc_formats
        formats += pandoc_formats
    except ImportError:
        pass
    return formats
```

The `fiduswriter-pandoc` plugin provides `pandoc/export_formats.py`:

```python
FORMATS = [
    {"label": "Markdown", "key": "pandoc:markdown", "ext": "md", "binary": False},
    # ... same list as PANDOC_FORMATS above
]
```

### 6.3 Frontend usage

```javascript
// In books_overview.js and documents_overview.js
fetchFormats() {
    return getJson("/api/gitrepo_export/get_export_formats/")
        .then(({formats}) => this.availableFormats = formats)
}

// In templates.js — dynamic checkbox rendering
renderFormatCheckboxes(formats, selectedTargets, book) {
    return formats.map(fmt => {
        const checked = selectedTargets.includes(fmt.key)
        const disabled = (fmt.key === "odt" && !book.odt_template) ||
                         (fmt.key === "docx" && !book.docx_template)
        return `<tr>
            <th><h4>${escapeText(fmt.label)}</h4></th>
            <td><input type="checkbox" class="export-format"
                data-key="${fmt.key}" ${checked ? "checked" : ""}
                ${disabled ? "disabled" : ""}></td>
        </tr>`
    }).join("")
}
```

### 6.4 Exporter dispatch map

The processors use a map from `(format_key, repo_type)` to an exporter class:

```javascript
// Shared by all processors — github + gitlab + forgejo
const EXPORTER_MAP = {
    "epub":         { github: EpubBookGithubExporter, gitlab: EpubBookGitlabExporter },
    "unpacked_epub": { github: UnpackedEpubBookGithubExporter, gitlab: UnpackedEpubBookGitlabExporter },
    "html":         { github: HTMLBookGithubExporter, gitlab: HTMLBookGitlabExporter },
    "unified_html": { github: SingleFileHTMLBookGithubExporter, gitlab: SingleFileHTMLBookGitlabExporter },
    "latex":        { github: LatexBookGithubExporter, gitlab: LatexBookGitlabExporter },
    "odt":          { github: ODTBookGithubExporter, gitlab: ODTBookGitlabExporter },
    "docx":         { github: DOCXBookGithubExporter, gitlab: DOCXBookGitlabExporter },
    // Pandoc formats — all use the same pandoc bridge class per platform
    "pandoc:*":     { github: PandocBookGithubExporter, gitlab: PandocBookGitlabExporter },
}
```

For pandoc formats, a single bridge class handles all of them (the format
itself is passed to the constructor). The processor matches `"pandoc:*"` as a
wildcard prefix.

---

## 7. Improvement 5: Forgejo Export

### 7.1 Design decision: Personal Access Token (PAT)

**Why PAT instead of OAuth2:**
- Forgejo instances are self-hosted with varying URLs — OAuth2 would require
  configuring callback URLs in each Forgejo instance's admin UI.
- Many users are on multi-tenant Fidus Writer installations where they cannot
  add social apps.
- PAT can be managed entirely from the user's profile page with no server
  admin access.
- No dependency on allauth social providers.

### 7.2 New model

```python
class ForgejoServer(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    instance_url = models.URLField(
        help_text="Base URL of the Forgejo instance (e.g. https://code.example.org)"
    )
    name = models.CharField(
        max_length=128, blank=True,
        help_text="A label to identify this instance"
    )
    token = models.CharField(
        max_length=256,
        help_text="Personal Access Token with repo scope"
    )
    active = models.BooleanField(default=True)
    added = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Forgejo servers"
```

**Note:** In production the `token` field should be encrypted (Django's
`encrypted_model_fields` or a custom `EncryptedCharField`).

### 7.3 Backend views

```python
@login_required
@ajax_required
@require_http_methods(["GET", "POST", "DELETE"])
def manage_forgejo_servers(request):
    """List, add, delete Forgejo server connections."""
    if request.method == "GET":
        servers = ForgejoServer.objects.filter(user=request.user)
        return JsonResponse({
            "servers": [{"id": s.id, "url": s.instance_url, "name": s.name}
                        for s in servers]
        })
    elif request.method == "POST":
        # Verify token → GET {instance_url}/api/v1/user
        # If OK, store
        # Return created server info
    elif request.method == "DELETE":
        # Delete server + cached repos


@login_required
@require_GET
async def get_forgejo_repos(request, server_id):
    """Fetch repos from a specific Forgejo instance."""
    server = await ForgejoServer.objects.aget(id=server_id, user=request.user)
    repos = await forgejo.get_repos(server.instance_url, server.token)
    return JsonResponse({"repos": repos})


@login_required
@require_http_methods(["GET", "POST", "PATCH"])
async def proxy_forgejo(request, server_id, path):
    """Proxy API requests to a Forgejo instance."""
    server = await ForgejoServer.objects.aget(id=server_id, user=request.user)
    response = await forgejo.proxy(
        server.instance_url, server.token, path,
        request.META["QUERY_STRING"], request.body, request.method
    )
    return HttpResponse(response.text, status=response.status_code)
```

### 7.4 Forgejo helper (`helpers/forgejo.py`)

```python
import json
from httpx import AsyncClient, Request

API_PREFIX = "/api/v1"


def forgejorepo2repodata(repo, instance_url):
    return {
        "type": "forgejo",
        "server_id": ...,         # internal Fidus Writer server ID
        "instance_url": instance_url,
        "name": repo["full_name"],
        "id": repo["id"],
        "branch": repo.get("default_branch", "main"),
    }


async def get_repos(instance_url, token):
    headers = {"Authorization": f"Bearer {token}"}
    url = f"{instance_url}{API_PREFIX}/user/repos?type=all&per_page=100"
    request = Request("GET", url, headers=headers)
    async with AsyncClient(timeout=88) as client:
        response = await client.send(request)
    content = json.loads(response.text)
    if isinstance(content, list):
        return [forgejorepo2repodata(r, instance_url) for r in content]
    return []


async def proxy(instance_url, token, path, query_string, body, method):
    headers = {"Authorization": f"Bearer {token}"}
    url = f"{instance_url}{API_PREFIX}/{path}"
    if query_string:
        url += "?" + query_string
    if method == "GET":
        body = None
    request = Request(method, url, headers=headers, content=body)
    async with AsyncClient(timeout=88) as client:
        response = await client.send(request)
    return response
```

### 7.5 Forgejo API endpoints used

| Purpose | Method | Path |
|---------|--------|------|
| Verify token | GET | `/api/v1/user` |
| List repos | GET | `/api/v1/user/repos?type=all&per_page=100` |
| Get repo | GET | `/api/v1/repos/{owner}/{repo}` |
| Get file/dir | GET | `/api/v1/repos/{owner}/{repo}/contents/{path}` |
| Create file | POST | `/api/v1/repos/{owner}/{repo}/contents/{filepath}` |
| Update file | PUT | `/api/v1/repos/{owner}/{repo}/contents/{filepath}` |
| Delete file | DELETE | `/api/v1/repos/{owner}/{repo}/contents/{filepath}` |

Forgejo/Gitea API is similar to GitHub's content API but each file
create/update is an individual call (no batch commit like GitLab).

### 7.6 Frontend

**Server management UI** (in user profile settings):

```
[Add Forgejo Server]
  Instance URL:  ____________________
  Name (label):  ____________________
  PAT token:     ____________________
  [Verify & Save]

List of connected servers:
  code.example.org (My Code)  [Delete] [Fetch Repos]
  git.example.com (Work)      [Delete] [Fetch Repos]
```

**Repository selector integration:**
When a user opens a book/document settings, the repo selector shows:
- GitHub repos (from social account)
- GitLab repos (from social account)
- Forgejo repos — prefixed with instance name, grouped by server

The `get_git_repos` view also aggregates Forgejo repos:
```python
async def get_git_repos(request, reload=False):
    # ... existing GitHub + GitLab logic ...

    # Add Forgejo repos from all servers
    async for server in ForgejoServer.objects.filter(user=request_user):
        repos += await forgejo.get_repos(server.instance_url, server.token)

    return JsonResponse({"repos": repos})
```

**Forgejo-specific processors and exporters:**
```
forgejo/
  book_processor.js       → analogous to github/book_processor.js
  book_exporters.js       → native + pandoc exporters for Forgejo
  document_processor.js   → analogous for documents
  document_exporters.js   → native + pandoc exporters for Forgejo
  tools/
    index.js
    commit.js             → commitFile, commitTree (Forgejo/Gitea API style)
```

**Commit flow for Forgejo:**
Forgejo/Gitea's content API works file-by-file (like GitHub):

```javascript
// tools/commit.js
export function commitFile(repo, instanceUrl, token, blob, filepath, message) {
    // 1. GET {instanceUrl}/api/v1/repos/{repo}/contents/{filepath}
    //    → check if file exists, get SHA
    // 2. POST {instanceUrl}/api/v1/repos/{repo}/contents/{filepath}
    //    with {content: base64, message, branch, sha?}
}
```

**Incremental approach:** For the initial Forgejo implementation, committing
one file at a time is acceptable since individual document exports are
typically 1 file, and book exports via pandoc are also typically small
(1 chapter = 1 file). If performance becomes an issue, we can later add a
tree-based commit similar to GitHub's approach.

### 7.7 REPO_TYPES update

```python
REPO_TYPES = (
    ("github", "GitHub"),
    ("gitlab", "GitLab"),
    ("forgejo", "Forgejo"),
)
```

Increase `max_length` from 6 to 8 in both `BookRepository` and
`DocumentRepository`.

---

## 8. Migration Plan

### Migration #0003 — JSONField `targets`

```python
class Migration(migrations.Migration):
    dependencies = [("gitrepo_export", "0002_...")]

    operations = [
        migrations.AddField(
            model_name="bookrepository",
            name="targets",
            field=models.JSONField(default=list, blank=True),
        ),
        migrations.RunPython(populate_targets, reverse_populate_targets),
        migrations.RemoveField(model_name="bookrepository", name="export_epub"),
        migrations.RemoveField(model_name="bookrepository", name="export_unpacked_epub"),
        migrations.RemoveField(model_name="bookrepository", name="export_html"),
        migrations.RemoveField(model_name="bookrepository", name="export_unified_html"),
        migrations.RemoveField(model_name="bookrepository", name="export_latex"),
        migrations.RemoveField(model_name="bookrepository", name="export_odt"),
        migrations.RemoveField(model_name="bookrepository", name="export_docx"),
    ]

def populate_targets(apps, schema_editor):
    BookRepository = apps.get_model("gitrepo_export", "BookRepository")
    for repo in BookRepository.objects.all():
        targets = []
        for fmt in ["epub", "unpacked_epub", "html", "unified_html",
                     "latex", "odt", "docx"]:
            if getattr(repo, f"export_{fmt}"):
                targets.append(fmt)
        repo.targets = targets
        repo.save()
```

### Migration #0004 — DocumentRepository + ForgejoServer

```python
class Migration(migrations.Migration):
    dependencies = [("gitrepo_export", "0003_targets")]

    operations = [
        migrations.CreateModel(
            name="DocumentRepository",
            fields=[
                ("id", models.AutoField(primary_key=True, serialize=False)),
                ("document", models.ForeignKey(
                    "document.Document", on_delete=models.CASCADE)),
                ("repo_id", models.IntegerField()),
                ("repo_name", models.CharField(max_length=256)),
                ("repo_type", models.CharField(max_length=8, choices=REPO_TYPES)),
                ("targets", models.JSONField(default=list, blank=True)),
            ],
            options={"verbose_name_plural": "Document repositories"},
        ),
        migrations.CreateModel(
            name="ForgejoServer",
            fields=[
                ("id", models.AutoField(primary_key=True, serialize=False)),
                ("user", models.ForeignKey(
                    settings.AUTH_USER_MODEL, on_delete=models.CASCADE)),
                ("instance_url", models.URLField()),
                ("name", models.CharField(max_length=128, blank=True)),
                ("token", models.CharField(max_length=256)),
                ("active", models.BooleanField(default=True)),
                ("added", models.DateTimeField(auto_now_add=True)),
            ],
            options={"verbose_name_plural": "Forgejo servers"},
        ),
        migrations.AlterField(
            model_name="bookrepository",
            name="repo_type",
            field=models.CharField(max_length=8, choices=REPO_TYPES),
        ),
    ]
```

---

## 9. File Inventory

New and modified files:

```
fiduswriter-gitrepo-export/fiduswriter/gitrepo_export/
├── formats.py                                 NEW  — format definitions + get_all_formats()
├── models.py                                  MOD  — targets JSONField, DocumentRepository,
│                                                     ForgejoServer, conditional BookRepository
├── views.py                                   MOD  — get_export_formats, get_document_repos,
│                                                     update_document_repo, manage_forgejo_servers,
│                                                     get_forgejo_repos, proxy_forgejo
├── urls.py                                    MOD  — conditional book URLs, document URLs,
│                                                     forgejo URLs
├── admin.py                                   MOD  — conditional BookRepository, add
│                                                     DocumentRepository + ForgejoServer
├── helpers/
│   ├── __init__.py                            (unchanged)
│   ├── github.py                              (unchanged)
│   ├── gitlab.py                              (unchanged)
│   └── forgejo.py                             NEW  — Forgejo API helpers
├── migrations/
│   ├── 0003_targets.py                        NEW
│   └── 0004_documentrepo_forgejo.py           NEW
├── static/js/modules/gitrepo_export/
│   ├── index.js                               MOD  — also export document overview
│   ├── formats.js                             NEW  — frontend format helpers
│   ├── templates.js                           MOD  — dynamic checkbox rendering
│   ├── books_overview.js                      MOD  — targets list, dynamic formats
│   ├── documents_overview.js                  NEW  — document overview controller
│   ├── github/
│   │   ├── book_exporters.js                  MOD  — add PandocBookGithubExporter
│   │   ├── book_processor.js                  MOD  — iterate targets, not booleans
│   │   ├── document_exporters.js              NEW
│   │   └── document_processor.js              NEW
│   ├── gitlab/
│   │   ├── book_exporters.js                  MOD  — add PandocBookGitlabExporter
│   │   ├── book_processor.js                  MOD  — iterate targets, not booleans
│   │   ├── document_exporters.js              NEW
│   │   └── document_processor.js              NEW
│   └── forgejo/                               NEW
│       ├── book_exporters.js
│       ├── book_processor.js
│       ├── document_exporters.js
│       ├── document_processor.js
│       └── tools/
│           ├── index.js
│           └── commit.js
├── static/js/plugins/
│   ├── books_overview/
│   │   └── gitrepo_export.js                  (unchanged — or slightly updated)
│   └── document_overview/                     NEW
│       └── gitrepo_export.js

fiduswriter-pandoc/fiduswriter/pandoc/
├── apps.py                                    MOD  — (optional) register formats
└── export_formats.py                          NEW  — pandoc format list for git export
```

---

## 10. Implementation Order

| Phase | What | Dependencies |
|-------|------|-------------|
| 1 | `targets` JSONField + migration #0003 | None |
| 2 | Format registry: `formats.py` + `/get_export_formats/` endpoint | Phase 1 |
| 3 | Frontend: dynamic format checkboxes in templates.js | Phase 2 |
| 4 | Backend: make books dependency optional (conditional imports) | None |
| 5 | Backend: DocumentRepository model + views | Phase 4 |
| 6 | Frontend: document overview integration | Phase 5 + 3 |
| 7 | Pandoc git bridge classes (book + document) | Phase 1, pandoc plugin |
| 8 | Pandoc format registration: `pandoc/export_formats.py` | Phase 2 |
| 9 | ForgejoServer model + views | Phase 4 |
| 10 | Forgejo helper: `helpers/forgejo.py` | None |
| 11 | Forgejo proxy / repo-fetch views + URL patterns | Phase 9 |
| 12 | Frontend: Forgejo server management UI | Phase 9 |
| 13 | Frontend: Forgejo processors + exporters | Phase 12 |
| 14 | Migration #0004 — DocumentRepository + ForgejoServer | Phase 5 + 9 |
| 15 | Update tests for all changes | All phases |
| 16 | Update README | All phases |
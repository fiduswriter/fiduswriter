# Making the Fidus Writer screenshot series

This document describes how to generate the organized screenshot series used for
documentation, marketing and release notes.  The screenshots are produced by a
Selenium test suite located in `base/tests/test_screenshots.py`.

The suite is split into two runs:

1. **Base screenshots (`01`–`11`)** – core Fidus Writer UI.
2. **Additional screenshots (`12`–`18`)** – optional plugins and special modes
   such as E2EE, payment, OJS, PHPList, etc.

## What is captured

| Folder | Topic | Examples |
|--------|-------|----------|
| `01-auth` | Logged-out pages | login, sign-up, password reset, email confirm, 404, admin login |
| `02-documents` | Document overview | document list, new document, menus, settings, revisions, import, delete |
| `03-editor` | Editor | editor open, header menus, link/cite/math/figure/table dialogs, share, copyright, word count, search/replace, key bindings |
| `04-bibliography` | Bibliography manager | overview, categories, register source, import, delete |
| `05-images` | Image manager | overview, categories, upload, delete |
| `06-contacts` | Contacts | overview, invite dialog |
| `07-profile` | User profile | profile page, preferences, change password, add email, delete account, manage git servers |
| `08-templates` | Document templates | overview, create/editor, import |
| `09-books` | Books | overview, create/edit/import dialogs |
| `10-plugin-features` | Plugin features in core views | bulk menu with plugins, editor git-repository settings |
| `11-other` | Misc | 404, offline page, admin login |
| `12-citation-api-import` | Citation API Import plugin | bibliography import, editor import dialog |
| `13-languagetool` | LanguageTool plugin | tools submenu |
| `14-website` | Website plugin | public website overview, editor website menu |
| `15-phplist` | PHPList plugin | sign-up with newsletter opt-in |
| `16-payment` | Payment plugin | pricing page, modify subscription, subscription warning |
| `17-ojs` | OJS plugin | admin register journal, submit-to-journal dialog |
| `18-e2ee` | End-to-end encryption | profile E2EE section, setup passphrase, new-document encryption choice |

## Prerequisites

* A working Fidus Writer development environment (Python dependencies installed).
* Google Chrome and a matching ChromeDriver.  The test suite uses
  `webdriver-manager` to download the driver automatically.
* Node/npm for transpiling frontend assets.
* `DEBUG = True` in `configuration.py` so the live test server serves static
  files without a separate `collectstatic` step.

## Configure `configuration.py`

Copy `configuration-default.py` to `configuration.py` and make the following
adjustments for a screenshot run.

### Enable optional apps

Uncomment or add the apps whose screenshots you want to capture:

```python
INSTALLED_APPS = [
    "devel",
    "user_template_manager",
    "pandoc",
    "book",
    "citation_api_import",
    "languagetool",
    "ojs",
    "website",
    "phplist",
    "payment",
    "gitrepo_export",
]
```

### Disable axes

Axes interferes with the fast cookie-based login used by the tests:

```python
REMOVED_APPS = [
    'axes',
]
```

### Enable E2EE

For the `18-e2ee` screenshots:

```python
E2EE_MODE = "enabled"
```

### Payment plugin dummy credentials

The payment plugin needs Paddle plan IDs to render the pricing/subscription
pages.  In a local/offline test environment you can use dummy values:

```python
PADDLE_VENDOR_ID = "12345"
PADDLE_MONTHLY_PLAN_ID = "monthly-plan"
PADDLE_SIX_MONTHS_PLAN_ID = "six-month-plan"
PADDLE_ANNUAL_PLAN_ID = "annual-plan"
```

### Other useful settings

```python
DEBUG = True
TEST_SERVER = True
REGISTRATION_OPEN = True
PASSWORD_LOGIN = True
```

## Prepare static files

The tests use the transpiled JavaScript served from `static-transpile/`.  Make
sure the bundle is up to date before the run:

```bash
python manage.py transpile --force
```

If you have modified the frontend toolkit (`fwtoolkit`) itself, install the
updated package (e.g. as a local `file:` dependency or a new beta release) and
re-run the transpile step.

## Run the base screenshot suite

From the project directory that contains `manage.py`:

```bash
python manage.py test base.tests.test_screenshots --noinput
```

This runs `ScreenshotCollector.test_capture_all_screenshots()` and writes the
`01`–`11` folders.  It **clears the output directory first**.

The default output directory is defined in
`base/tests/test_screenshots.py`.  You can override it with the
`SCREENSHOT_DIR` environment variable:

```bash
SCREENSHOT_DIR=/path/to/output python manage.py test base.tests.test_screenshots --noinput
```

## Run the additional screenshot suite

After the base screenshots are in place, run the plugin/E2EE screenshots.  This
class does **not** delete the output directory, so the base screenshots are
preserved:

```bash
python manage.py test base.tests.test_screenshots.AdditionalScreenshotCollector --noinput --keepdb
```

`--keepdb` is recommended because the additional suite uses the same database
state as the base suite.

## Review the results

The output directory contains numbered folders, one PNG per screenshot and a
`summary.txt` file listing everything that was captured.

Check `errors.log` in the output directory for any screenshots that failed
silently.  A failed capture is logged but does not stop the rest of the suite.

## Troubleshooting

### Blank/spinner payment screenshots

The Payment plugin loads `Paddle.js` from a CDN.  In an offline test
environment the script never loads and the page stays on a spinner.  The test
suite injects a mock `window.Paddle` object via Chrome DevTools Protocol, but
you must still provide the dummy Paddle settings described above so that the
app tries to render the pricing UI.

### E2EE setup passphrase dialog is hidden

If the setup-passphrase screenshot only shows the profile page underneath, the
dialog is being stacked below the full-page profile wrapper.  Make sure the
frontend toolkit (`fwtoolkit`) contains the dialog `z-index` fix that inspects
the computed `z-index` of existing dialogs and bumps new dialogs above them.
Also ensure the profile page frontend settings expose `E2EE_ENABLED`.

### LanguageTool screenshot shows an error

The LanguageTool tools submenu calls `/api/languagetool/languages/`, which in
turn contacts the external LanguageTool server configured by `LT_URL`.  In an
offline environment this request fails and a server error is logged, but the
screenshot of the menu itself is still captured.

### Stale test database

If tests behave strangely after changing `configuration.py` or the installed
apps, delete the generated test database (`testdb.sqlite3` in the project
directory) and re-run without `--keepdb`.

### 4.1 / older branch: link not visible

If you backport fixes to an older branch and a link (for example the E2EE
**Set up encryption passphrase** link) is still missing, the static files are
probably stale.  Run `python manage.py transpile --force` on that branch and
try again.

## Customizing the screenshots

The collectors are plain Python methods on `ScreenshotCollector` and
`AdditionalScreenshotCollector`.  Edit `base/tests/test_screenshots.py` to add
new flows, change selectors or capture additional dialogs.  Common helpers:

* `self.navigate(path)` – open a path on the live server.
* `self.safe_click(selector)` – wait, scroll and click an element.
* `self.wait_for(selector)` / `self.wait_for_visible(selector)` – explicit waits.
* `self.capture(folder, name)` – save a full-page PNG as `<folder>/<name>.png`.
* `self.open_via_js(js_code)` – execute JS that opens a dialog.
* `self.close_dialog()` – close the active `.fw-dialog`.

## Restoring the original configuration

The screenshot run requires plugin/E2EE settings that are not part of a normal
development setup.  Keep a backup of your `configuration.py` in a non-prominent
location and restore the normal configuration after the screenshots are
generated, for example:

```bash
cp configuration.py devel/screenshot-config/configuration.py.screenshots
cp configuration.py.backup-before-screenshots configuration.py
```

import base64
import os
import time
import shutil
import traceback
from urllib.parse import urljoin

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from django.conf import settings
from django.test import override_settings

from testing.selenium_helper import SeleniumHelper
from testing.live_server import ChannelsLiveServerTestCase
from testing.mail import get_outbox, empty_outbox
from document.models import Document, DocumentTemplate
from bibliography.models import Entry
from usermedia.models import Image, UserImage
from book.models import Book
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType

# Optional plugin models are only available when their apps are enabled.
try:
    from ojs.models import Journal
except RuntimeError:
    Journal = None  # type: ignore

try:
    from website.models import Publication
except RuntimeError:
    Publication = None  # type: ignore


class ScreenshotCollector(SeleniumHelper, ChannelsLiveServerTestCase):
    """
    Capture organized screenshots of Fidus Writer and enabled plugins.

    Run with:
        python fiduswriter/manage.py test base.tests.test_screenshots --noinput

    Output is written to ``/home/johannes/src/fiduswriter/screenshots-organized``
    by default. Set the ``SCREENSHOT_DIR`` environment variable to override.
    """

    fixtures = ["initial_documenttemplates.json", "initial_styles.json"]
    clear_output_dir = True

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        driver_data = cls.get_drivers(1)
        cls.driver = driver_data["drivers"][0]
        cls.client = driver_data["clients"][0]
        cls.driver.implicitly_wait(driver_data["wait_time"])
        cls.wait_time = driver_data["wait_time"]

    @classmethod
    def tearDownClass(cls):
        cls.driver.quit()
        super().tearDownClass()

    def setUp(self):
        super().setUp()
        self.output_dir = os.environ.get(
            "SCREENSHOT_DIR",
            "/home/johannes/src/fiduswriter/screenshots-organized",
        )
        if self.clear_output_dir and os.path.isdir(self.output_dir):
            shutil.rmtree(self.output_dir)
        os.makedirs(self.output_dir, exist_ok=True)

        self.driver.set_window_size(1920, 1080)
        self.driver.set_window_position(0, 0)

        self.user = self.create_user(
            username="designer",
            email="designer@example.com",
            passtext="p4ssw0rd",
        )
        self.contact_user = self.create_user(
            username="contact",
            email="contact@example.com",
            passtext="p4ssw0rd",
        )

        self.client.force_login(user=self.user)
        self.client.post(
            "/api/user/invites/add/", {"user_string": "contact@example.com"}
        )
        self.client.logout()

        self.create_test_documents()
        self.create_test_bibliography()
        self.create_test_images()
        self.book = self.create_test_book()

        self.login_user(self.user, self.driver, self.client)

    def tearDown(self):
        try:
            self.driver.get("data:,")
        except Exception:
            pass
        super().tearDown()

    def create_test_documents(self):
        for i in range(3):
            doc = Document.objects.create(
                owner=self.user,
                title=f"Sample document {i + 1}",
                template_id=1,
            )
            doc.save()

    def create_test_book(self):
        return Book.objects.create(owner=self.user, title="Sample book")

    def create_test_bibliography(self):
        Entry.objects.create(
            entry_owner=self.user,
            bib_type="article",
            entry_key="doe2020",
            cats=[],
            fields={
                "title": [{"type": "text", "text": "An important article"}],
                "author": [
                    {
                        "family": [{"type": "text", "text": "Doe"}],
                        "given": [{"type": "text", "text": "Jane"}],
                    }
                ],
            },
        )

    def create_test_images(self):
        img = Image(uploader=self.user)
        img.save()
        UserImage.objects.create(
            title="Sample image", owner=self.user, image=img
        )

    def path_for(self, *parts):
        return os.path.join(self.output_dir, *parts)

    def ensure_dir(self, *parts):
        path = self.path_for(*parts)
        os.makedirs(path, exist_ok=True)
        return path

    def log_error(self, context, exc):
        filename = self.path_for("errors.log")
        with open(filename, "a") as f:
            f.write(f"\n{'='*60}\n{context}\n{'-'*60}\n")
            f.write(traceback.format_exc())
            f.write(f"\nException: {exc}\n")

    def capture(self, *path_parts):
        """Save a full-page screenshot under the given relative path."""
        filename = self.path_for(*path_parts) + ".png"
        os.makedirs(os.path.dirname(filename), exist_ok=True)
        time.sleep(0.3)
        self.save_full_page_screenshot(filename)
        return filename

    def save_full_page_screenshot(self, filename):
        """Capture the full page, including content below the fold.

        Uses Chrome DevTools Protocol Page.captureScreenshot with
        captureBeyondViewport so dialogs and long pages are fully visible.
        Falls back to the regular viewport screenshot on non-Chrome drivers.
        """
        try:
            result = self.driver.execute_cdp_cmd(
                "Page.captureScreenshot",
                {"format": "png", "captureBeyondViewport": True},
            )
            with open(filename, "wb") as f:
                f.write(base64.b64decode(result["data"]))
        except Exception:
            self.driver.save_screenshot(filename)

    def try_capture(self, folder, name, callback, *args, **kwargs):
        """Run a callback and capture a screenshot, logging errors but continuing."""
        try:
            callback(*args, **kwargs)
            self.capture(folder, name)
            return True
        except Exception as exc:
            self.log_error(f"{folder}/{name}", exc)
            return False

    def safe_click(self, selector, by=By.CSS_SELECTOR, timeout=10):
        try:
            el = WebDriverWait(self.driver, timeout).until(
                EC.presence_of_element_located((by, selector))
            )
            self.driver.execute_script(
                "arguments[0].scrollIntoView({block:'center'});", el
            )
            WebDriverWait(self.driver, timeout).until(
                EC.element_to_be_clickable((by, selector))
            ).click()
            return True
        except Exception:
            return False

    def wait_for(self, selector, by=By.CSS_SELECTOR, timeout=10):
        return WebDriverWait(self.driver, timeout).until(
            EC.presence_of_element_located((by, selector))
        )

    def wait_for_visible(self, selector, by=By.CSS_SELECTOR, timeout=10):
        return WebDriverWait(self.driver, timeout).until(
            EC.visibility_of_element_located((by, selector))
        )

    def wait_for_gone(self, selector, by=By.CSS_SELECTOR, timeout=10):
        WebDriverWait(self.driver, timeout).until(
            EC.invisibility_of_element_located((by, selector))
        )

    def close_dialog(self):
        """Try to close the active fw-dialog by clicking its cancel/close button."""
        try:
            buttons = self.driver.find_elements(
                By.CSS_SELECTOR,
                ".fw-dialog-buttonpane button, .ui-dialog-buttonpane button",
            )
            for button in buttons:
                text = button.text.strip().lower()
                if text in {"cancel", "close", "no"}:
                    button.click()
                    self.wait_for_gone(".fw-dialog", timeout=5)
                    return
            # Fallback: press Escape via JS.
            self.driver.execute_script(
                "const e=document.querySelector('.fw-dialog');"
                "if(e){e.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));}"
            )
            time.sleep(0.5)
        except Exception:
            pass

    def close_all_dropdowns(self):
        try:
            self.driver.execute_script("document.body.click();")
            time.sleep(0.3)
        except Exception:
            pass

    def navigate(self, path):
        self.driver.get(urljoin(self.live_server_url, path))
        time.sleep(0.5)

    def logout_in_browser(self):
        self.driver.delete_cookie(settings.SESSION_COOKIE_NAME)
        self.driver.get("data:,")
        time.sleep(0.3)

    # ------------------------------------------------------------------
    # Screen collectors
    # ------------------------------------------------------------------

    def capture_logged_out_screens(self):
        self.logout_in_browser()

        self.navigate("/")
        self.wait_for("#id-login")
        self.capture("01-auth", "01-login-page")

        self.navigate("/account/sign-up/")
        self.wait_for("#id-username", timeout=10)
        self.capture("01-auth", "02-signup-page")

        self.navigate("/account/password-reset/")
        self.wait_for("#id-email", timeout=10)
        self.capture("01-auth", "03-password-reset-request")

        self.navigate("/account/confirm-email/bad-key/")
        time.sleep(1)
        self.capture("01-auth", "04-email-confirm")

        self.login_user(self.user, self.driver, self.client)

    def open_via_js(self, js_code, wait_for_dialog=True):
        """Execute JS to open a dialog and optionally wait for .fw-dialog."""
        self.driver.execute_script(js_code)
        if wait_for_dialog:
            self.wait_for(".fw-dialog", timeout=5)
        else:
            time.sleep(1)

    def capture_document_overview(self):
        self.navigate("/")
        self.wait_for(".fw-contents table, .fw-data-table", timeout=10)
        self.capture("02-documents", "01-overview")

        # With only one template, clicking new doc creates a document directly.
        # We capture that as the "new document" flow.
        if self.safe_click(".new_document button"):
            self.wait_for(".doc-body", timeout=10)
            time.sleep(0.5)
            self.capture("02-documents", "02-new-document")
            self.navigate("/")
            self.wait_for(".fw-contents table, .fw-data-table", timeout=10)

        # Overview menu
        if self.safe_click("#fw-overview-menu"):
            time.sleep(0.5)
            self.capture("02-documents", "03-overview-menu")
            self.close_all_dropdowns()

        # Bulk dropdown
        if self.safe_click(".dt-bulk-dropdown"):
            time.sleep(0.5)
            self.capture("02-documents", "04-bulk-menu")
            self.close_all_dropdowns()

        # Document settings
        doc_id = Document.objects.filter(owner=self.user).first().id
        self.close_all_dropdowns()
        self.open_via_js(
            f"window.theApp.page.mod.actions.settingsDocumentDialog({doc_id})"
        )
        self.capture("02-documents", "05-document-settings")
        self.close_dialog()

        # Revisions
        self.open_via_js(
            f"window.theApp.page.mod.actions.revisionsDialog({doc_id}, window.theApp)"
        )
        self.capture("02-documents", "06-revisions")
        self.close_dialog()

        # Delete confirm
        self.open_via_js(
            f"window.theApp.page.mod.actions.deleteDocumentDialog([{doc_id}], window.theApp)"
        )
        self.capture("02-documents", "07-delete-confirm")
        self.close_dialog()

        # Import dialog
        self.open_via_js("window.theApp.page.mod.actions.importDocument()")
        self.capture("02-documents", "08-import-document")
        self.close_dialog()

    def capture_editor(self):
        doc = Document.objects.filter(owner=self.user).first()
        self.navigate(f"/document/{doc.id}/")
        self.wait_for("#headerbar", timeout=15)
        self.wait_for(".editor-toolbar", timeout=15)
        self.wait_for(".doc-body", timeout=15)
        time.sleep(1)
        self.capture("03-editor", "01-editor-open")

        # Header menus
        menus = [
            ('.header-nav-item[title="File handling"]', "02-file-menu"),
            (
                '.header-nav-item[title="Export of the document contents"]',
                "03-export-menu",
            ),
            (
                '.header-nav-item[title="Configure settings of this document."]',
                "04-settings-menu",
            ),
            (
                '.header-nav-item[title="Select document editing tool."]',
                "05-tools-menu",
            ),
        ]
        for selector, name in menus:
            if self.safe_click(selector):
                time.sleep(0.5)
                self.capture("03-editor", name)
                self.close_all_dropdowns()

        # Toolbar dialogs
        toolbar_dialogs = [
            ('button[title="Link"]', "07-link-dialog"),
            ('button[title="Cite"]', "08-citation-dialog"),
            ('button[title="Math"]', "09-math-dialog"),
            ('button[title="Figure"]', "10-figure-dialog"),
            ('button[title="Table"]', "11-table-dialog"),
        ]
        for selector, name in toolbar_dialogs:
            if self.safe_click(selector):
                time.sleep(0.5)
                self.capture("03-editor", name)
                self.close_dialog()

        # Share dialog via File menu
        if self.safe_click('.header-nav-item[title="File handling"]'):
            time.sleep(0.3)
            try:
                share = self.driver.find_element(
                    By.XPATH,
                    '//*[contains(@class,"fw-pulldown-item") and contains(text(),"Share")]',
                )
                share.click()
                self.wait_for(".fw-dialog", timeout=5)
                self.capture("03-editor", "12-share-dialog")
                self.close_dialog()
            except Exception:
                self.close_all_dropdowns()

        # Settings menu sub-dialogs
        settings_items = [
            ("Copyright Information", "13-copyright-dialog"),
        ]
        for item_text, name in settings_items:
            try:
                if self.safe_click(
                    '.header-nav-item[title="Configure settings of this document."]'
                ):
                    time.sleep(0.3)
                    item = self.driver.find_element(
                        By.XPATH,
                        f'//*[contains(@class,"fw-pulldown-item") and contains(text(),"{item_text}")]',
                    )
                    item.click()
                    self.wait_for(".fw-dialog", timeout=5)
                    self.capture("03-editor", name)
                    self.close_dialog()
                else:
                    self.log_error(
                        f"03-editor/{name}",
                        Exception("Could not open Settings menu"),
                    )
            except Exception as exc:
                self.log_error(f"03-editor/{name}", exc)
                self.close_dialog()

        # Additional utility dialogs from the Tools menu
        tool_items = [
            ("Word counter", "14-word-count-dialog"),
            ("Search and replace", "15-search-replace-dialog"),
            ("Keyboard shortcuts", "16-key-bindings-dialog"),
        ]
        for item_text, name in tool_items:
            try:
                if self.safe_click(
                    '.header-nav-item[title="Select document editing tool."]'
                ):
                    time.sleep(0.3)
                    item = self.driver.find_element(
                        By.XPATH,
                        f'//*[contains(@class,"fw-pulldown-item") and contains(text(),"{item_text}")]',
                    )
                    item.click()
                    self.wait_for(".fw-dialog", timeout=5)
                    self.capture("03-editor", name)
                    self.close_dialog()
                else:
                    self.log_error(
                        f"03-editor/{name}",
                        Exception("Could not open Tools menu"),
                    )
            except Exception as exc:
                self.log_error(f"03-editor/{name}", exc)
                self.close_dialog()

    def capture_bibliography(self):
        self.navigate("/bibliography/")
        self.wait_for(".fw-contents table, .fw-data-table", timeout=10)
        self.capture("04-bibliography", "01-overview")

        if self.safe_click("#fw-overview-menu"):
            time.sleep(0.5)
            self.capture("04-bibliography", "02-menu")
            self.close_all_dropdowns()

        if self.safe_click('button[title="Edit categories (Alt-e)"]'):
            self.wait_for(".fw-dialog", timeout=5)
            self.capture("04-bibliography", "03-edit-categories")
            self.close_dialog()

        if self.safe_click('button[title="Register new source (Alt-n)"]'):
            self.wait_for(".fw-dialog", timeout=5)
            self.capture("04-bibliography", "04-register-source")
            self.close_dialog()

        if self.safe_click('button[title="Import bibliography (Alt-u)"]'):
            self.wait_for(".fw-dialog", timeout=5)
            self.capture("04-bibliography", "05-import")
            self.close_dialog()

        if self.safe_click(".delete-bib"):
            self.wait_for(".fw-dialog", timeout=5)
            self.capture("04-bibliography", "06-delete-confirm")
            self.close_dialog()

    def capture_usermedia(self):
        self.navigate("/usermedia/")
        self.wait_for(".fw-contents table, .fw-data-table", timeout=10)
        self.capture("05-images", "01-overview")

        if self.safe_click("#fw-overview-menu"):
            time.sleep(0.5)
            self.capture("05-images", "02-menu")
            self.close_all_dropdowns()

        if self.safe_click('button[title="Edit categories (Alt-e)"]'):
            self.wait_for(".fw-dialog", timeout=5)
            self.capture("05-images", "03-edit-categories")
            self.close_dialog()

        if self.safe_click('button[title="Upload new image (Alt-u)"]'):
            self.wait_for(".fw-dialog", timeout=5)
            self.capture("05-images", "04-upload")
            self.close_dialog()

        if self.safe_click(".delete-image"):
            self.wait_for(".fw-dialog", timeout=5)
            self.capture("05-images", "05-delete-confirm")
            self.close_dialog()

    def capture_contacts(self):
        self.navigate("/user/contacts/")
        self.wait_for(".fw-contents", timeout=10)
        self.capture("06-contacts", "01-overview")

        if self.safe_click('button[title="Invite contact (Alt-i)"]'):
            self.wait_for(".fw-dialog", timeout=5)
            self.capture("06-contacts", "02-invite-dialog")
            self.close_dialog()

    def capture_profile(self):
        self.navigate("/user/profile/")
        self.wait_for("#preferences-btn", timeout=10)
        self.capture("07-profile", "01-profile")

        if self.safe_click("#preferences-btn"):
            time.sleep(0.5)
            self.capture("07-profile", "02-preferences-menu")
            self.close_all_dropdowns()

        dialogs = [
            ("#fw-edit-profile-pwd", "03-change-password"),
            ("#add-profile-email", "04-add-email"),
        ]
        for selector, name in dialogs:
            if self.safe_click(selector):
                time.sleep(0.5)
                self.capture("07-profile", name)
                self.close_dialog()

        if self.safe_click("#delete-account"):
            self.wait_for(".fw-dialog", timeout=5)
            self.capture("07-profile", "05-delete-account")
            self.close_dialog()

        if self.safe_click("#manage-git-servers", timeout=2):
            self.wait_for(".fw-dialog", timeout=5)
            self.capture("07-profile", "06-manage-git-servers")
            self.close_dialog()

    def capture_templates(self):
        self.navigate("/templates/")
        self.wait_for(".fw-contents", timeout=10)
        self.capture("08-templates", "01-overview")

        if self.safe_click("#fw-overview-menu"):
            time.sleep(0.5)
            self.capture("08-templates", "02-menu")
            self.close_all_dropdowns()

        # Create template editor
        self.navigate("/templates/0/")
        self.wait_for("#template-editor", timeout=10)
        time.sleep(1)
        self.capture("08-templates", "03-create-editor")
        self.navigate("/templates/")
        self.wait_for(".fw-contents", timeout=10)

        # Upload/import template dialog
        self.open_via_js("window.theApp.page.mod.actions.uploadDocTemplate()")
        self.capture("08-templates", "04-import")
        self.close_dialog()

        # Open existing template editor
        links = self.driver.find_elements(
            By.CSS_SELECTOR, ".fw-contents tbody .fw-data-table-title a"
        )
        if links:
            links[0].click()
            self.wait_for("#template-editor", timeout=10)
            time.sleep(1)
            self.capture("08-templates", "05-editor")

    def capture_books(self):
        self.navigate("/books/")
        self.wait_for(".fw-contents", timeout=10)
        self.capture("09-books", "01-overview")

        if self.safe_click("#fw-overview-menu"):
            time.sleep(0.5)
            self.capture("09-books", "02-menu")
            self.close_all_dropdowns()

        # Create book dialog
        self.open_via_js(
            "window.theApp.page.getImageDB().then(() => window.theApp.page.mod.actions.createBookDialog(0, window.theApp.page.imageDB))",
            wait_for_dialog=False,
        )
        self.wait_for(".fw-dialog", timeout=5)
        self.capture("09-books", "03-create-dialog")
        self.close_dialog()

        # Import book dialog
        self.open_via_js("window.theApp.page.mod.actions.importBook()")
        self.capture("09-books", "04-import-dialog")
        self.close_dialog()

        # Edit existing book
        self.open_via_js(
            f"window.theApp.page.getImageDB().then(() => window.theApp.page.mod.actions.createBookDialog({self.book.id}, window.theApp.page.imageDB))",
            wait_for_dialog=False,
        )
        self.wait_for(".fw-dialog", timeout=5)
        time.sleep(1)
        self.capture("09-books", "05-edit-dialog")
        self.close_dialog()

    def capture_plugin_menus(self):
        self.navigate("/")
        self.wait_for(".fw-contents table, .fw-data-table", timeout=10)

        if self.safe_click(".dt-bulk-dropdown"):
            time.sleep(0.5)
            self.capture(
                "10-plugin-features", "01-documents-bulk-with-plugins"
            )
            self.close_all_dropdowns()

        # Open editor and capture Git Repository settings (plugin)
        doc = Document.objects.filter(owner=self.user).first()
        self.navigate(f"/document/{doc.id}/")
        self.wait_for("#headerbar", timeout=15)
        if self.safe_click(
            '.header-nav-item[title="Configure settings of this document."]'
        ):
            time.sleep(0.3)
            try:
                item = self.driver.find_element(
                    By.XPATH,
                    '//*[contains(@class,"fw-pulldown-item") and contains(text(),"Git Repository")]',
                )
                item.click()
                self.wait_for(".fw-dialog", timeout=5)
                self.capture("10-plugin-features", "02-editor-git-repository")
                self.close_dialog()
            except Exception:
                self.close_all_dropdowns()

    def capture_other_pages(self):
        self.ensure_dir("11-other")

        # 404 page
        self.navigate("/nonexistent-page/")
        time.sleep(1)
        self.capture("11-other", "01-404")

        # Offline page (simulate offline via JS)
        self.navigate("/")
        self.driver.execute_script(
            "window.dispatchEvent(new Event('offline'));"
        )
        time.sleep(0.5)
        self.driver.execute_script(
            "if(window.theApp && window.theApp.openOfflinePage){window.theApp.page = window.theApp.openOfflinePage(); window.theApp.page.init();}"
        )
        time.sleep(1)
        self.capture("11-other", "02-offline")
        self.driver.execute_script(
            "window.dispatchEvent(new Event('online'));"
        )

        # Admin login page
        self.logout_in_browser()
        self.navigate("/admin/")
        self.wait_for("#id_username", timeout=10)
        self.capture("11-other", "03-admin-login")
        self.login_user(self.user, self.driver, self.client)

    def test_capture_all_screenshots(self):
        collectors = [
            self.capture_logged_out_screens,
            self.capture_document_overview,
            self.capture_editor,
            self.capture_bibliography,
            self.capture_usermedia,
            self.capture_contacts,
            self.capture_profile,
            self.capture_templates,
            self.capture_books,
            self.capture_plugin_menus,
            self.capture_other_pages,
        ]
        for collector in collectors:
            try:
                collector()
            except Exception as exc:
                self.log_error(collector.__name__, exc)
                try:
                    self.close_dialog()
                    self.navigate("/")
                    time.sleep(1)
                except Exception:
                    pass

        # Write summary
        summary = self.path_for("summary.txt")
        with open(summary, "w") as f:
            f.write(f"Screenshots saved to: {self.output_dir}\n")
            f.write(f"Total PNG files: {self.count_pngs()}\n\n")
            for root, dirs, files in os.walk(self.output_dir):
                level = root.replace(self.output_dir, "").count(os.sep)
                indent = " " * 2 * level
                f.write(f"{indent}{os.path.basename(root)}/\n")
                subindent = " " * 2 * (level + 1)
                for file in sorted(files):
                    if file.endswith(".png"):
                        f.write(f"{subindent}{file}\n")

    def count_pngs(self):
        count = 0
        for root, _, files in os.walk(self.output_dir):
            count += sum(1 for f in files if f.endswith(".png"))
        return count


@override_settings(
    EMAIL_BACKEND="testing.mail.EmailBackend",
    MAIL_STORAGE_NAME="phplist_screenshot",
)
class AdditionalScreenshotCollector(ScreenshotCollector):
    """
    Capture screenshots 12+ for plugins/modes not enabled during the first run.

    Run independently (after the base screenshots have been generated) with:
        python fiduswriter/manage.py test base.tests.test_screenshots.AdditionalScreenshotCollector --noinput

    This class does NOT delete the existing output directory so the previously
    captured 01-11 screenshots are preserved.
    """

    clear_output_dir = False

    def test_capture_all_screenshots(self):
        """Do not re-run the base 01-11 collector when executing this class."""
        pass

    def setUp(self):
        # Do not call super().setUp() here because the website plugin changes
        # the root route, breaking the cookie-based login helper.
        ChannelsLiveServerTestCase.setUp(self)
        SeleniumHelper.setUp(self)

        self.output_dir = os.environ.get(
            "SCREENSHOT_DIR",
            "/home/johannes/src/fiduswriter/screenshots-organized",
        )
        os.makedirs(self.output_dir, exist_ok=True)

        self.driver.set_window_size(1920, 1080)
        self.driver.set_window_position(0, 0)

        self.user = self.create_user(
            username="designer",
            email="designer@example.com",
            passtext="p4ssw0rd",
        )
        self.contact_user = self.create_user(
            username="contact",
            email="contact@example.com",
            passtext="p4ssw0rd",
        )

        self.create_test_documents()
        self.create_test_bibliography()
        self.create_test_images()
        self.book = self.create_test_book()

        # Promote the main user so they can access admin / publish / etc.
        self.user.is_staff = True
        self.user.is_superuser = True
        self.user.save()

        # Add website publish permission explicitly when the plugin is enabled.
        if Publication is not None:
            content_type = ContentType.objects.get_for_model(Publication)
            publish_perm = Permission.objects.get(
                codename="add_publication", content_type=content_type
            )
            self.user.user_permissions.add(publish_perm)

        # Cookie-based login against /documents/ because the website plugin
        # makes the root route a public page.
        self.login_user_with_cookie(self.user)

    def login_user_with_cookie(self, user, target="/documents/"):
        self.client.force_login(user=user)
        cookie = self.client.cookies[settings.SESSION_COOKIE_NAME]
        self.driver.get(f"{self.live_server_url}{target}")
        self.driver.add_cookie(
            {
                "name": settings.SESSION_COOKIE_NAME,
                "value": cookie.value,
                "secure": False,
                "path": "/",
            }
        )
        self.driver.get(f"{self.live_server_url}{target}")
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "body"))
        )

    def create_test_ojs_journal(self):
        if Journal is None:
            return None
        template = DocumentTemplate.objects.first()
        journal = Journal.objects.create(
            ojs_url="https://ojs.example.com/",
            ojs_key="dummy-key",
            ojs_jid=1,
            name="Test Journal",
            editor=self.user,
        )
        journal.templates.add(template)
        return journal

    def create_payment_warning_user(self):
        """Create a plain user with 3 documents to trigger payment warning."""
        user = self.create_user(
            username="freemium",
            email="freemium@example.com",
            passtext="p4ssw0rd",
        )
        for i in range(3):
            Document.objects.create(
                owner=user, title=f"Freemium doc {i + 1}", template_id=1
            )
        return user

    # ------------------------------------------------------------------
    # 12 citation_api_import
    # ------------------------------------------------------------------

    def capture_citation_api_import(self):
        self.navigate("/bibliography/")
        self.wait_for(".fw-contents", timeout=10)

        # The plugin adds a text menu item to the overview toolbar.
        try:
            item = self.wait_for_visible(
                '.fw-text-menu[title*="Import from Database"]', timeout=5
            )
            item.click()
            self.wait_for(".fw-dialog", timeout=5)
            self.capture(
                "12-citation-api-import",
                "01-bibliography-import-from-database",
            )
            self.close_dialog()
        except Exception as exc:
            self.log_error("12-citation-api-import/01", exc)
            self.close_dialog()

        # Editor citation dialog import button
        doc = Document.objects.filter(owner=self.user).first()
        self.navigate(f"/document/{doc.id}/")
        self.wait_for(".editor-toolbar", timeout=15)
        if self.safe_click(".doc-body"):
            time.sleep(0.3)
        if self.safe_click('button[title="Cite"]'):
            time.sleep(0.5)
            try:
                self.wait_for(".fw-dialog", timeout=5)
                item = self.wait_for_visible(
                    '//*[normalize-space()="Import from database"]',
                    By.XPATH,
                    timeout=5,
                )
                item.click()
                self.wait_for("#bibimport-search-text", timeout=5)
                self.capture(
                    "12-citation-api-import", "02-editor-import-from-database"
                )
                self.close_dialog()
            except Exception as exc:
                self.log_error("12-citation-api-import/02", exc)
                self.close_dialog()

    # ------------------------------------------------------------------
    # 13 languagetool
    # ------------------------------------------------------------------

    def capture_languagetool(self):
        doc = Document.objects.filter(owner=self.user).first()
        self.navigate(f"/document/{doc.id}/")
        self.wait_for("#headerbar", timeout=15)
        if self.safe_click(
            '.header-nav-item[title="Select document editing tool."]'
        ):
            time.sleep(0.3)
            try:
                item = self.driver.find_element(
                    By.XPATH,
                    '//*[contains(@class,"fw-pulldown-item") and contains(text(),"Spell/grammar checker")]',
                )
                item.click()
                time.sleep(0.3)
                self.capture("13-languagetool", "01-tools-submenu")
                self.close_all_dropdowns()
            except Exception as exc:
                self.log_error("13-languagetool/01", exc)
                self.close_all_dropdowns()

    # ------------------------------------------------------------------
    # 14 website
    # ------------------------------------------------------------------

    def capture_website(self):
        # Public website overview (replaces root route when plugin enabled)
        self.logout_in_browser()
        self.navigate("/")
        time.sleep(2)
        self.capture("14-website", "01-public-overview")

        # Log back in and open editor Website menu
        self.login_user_with_cookie(self.user)
        doc = Document.objects.filter(owner=self.user).first()
        self.navigate(f"/document/{doc.id}/")
        self.wait_for("#headerbar", timeout=15)
        if self.safe_click('.header-nav-item[title="Publish to website"]'):
            time.sleep(0.3)
            self.capture("14-website", "02-editor-website-menu")
            self.close_all_dropdowns()

    # ------------------------------------------------------------------
    # 15 phplist
    # ------------------------------------------------------------------

    def capture_phplist(self):
        self.logout_in_browser()
        empty_outbox("phplist_screenshot")
        self.navigate("/account/sign-up/")
        self.wait_for("#id-username", timeout=10)
        self.driver.find_element(By.ID, "id-username").send_keys(
            "newsletteruser"
        )
        self.driver.find_element(By.ID, "id-password1").send_keys(
            "verysecret245!"
        )
        self.driver.find_element(By.ID, "id-password2").send_keys(
            "verysecret245!"
        )
        self.driver.find_element(By.ID, "id-email").send_keys(
            "newsletter@example.com"
        )
        signup_btn = self.driver.find_element(By.ID, "signup-submit")
        self.driver.execute_script(
            "arguments[0].scrollIntoView({block: 'center'});", signup_btn
        )
        time.sleep(0.2)
        self.driver.execute_script("arguments[0].click();", signup_btn)
        # Open the confirmation email link so the PHPList newsletter opt-in
        # radios are visible on the account confirmation page.
        time.sleep(2)
        outbox = get_outbox("phplist_screenshot")
        if outbox:
            signup_link = self.find_urls(outbox[-1].body)[0]
            self.navigate(signup_link)
            self.wait_for("#terms-check", timeout=10)
            time.sleep(1)
        self.capture("15-phplist", "01-signup-with-newsletter-optin")

        # Re-login main user
        self.login_user_with_cookie(self.user)

    # ------------------------------------------------------------------
    # 16 payment
    # ------------------------------------------------------------------

    def install_paddle_mock(self):
        """Inject a fake window.Paddle before any page JS runs via CDP.

        The payment plugin loads Paddle.js from a CDN. In offline test
        environments the script never loads and pages stay on the spinner.
        Adding the mock via Page.addScriptToEvaluateOnNewDocument ensures it
        is available as soon as the payment app's JS executes.
        """
        self.driver.execute_cdp_cmd(
            "Page.addScriptToEvaluateOnNewDocument",
            {
                "source": """
                    window.Paddle = {
                        Environment: {set: function() {}},
                        Setup: function() {},
                        Product: {
                            Prices: function(planId, callback) {
                                callback({
                                    recurring: {
                                        price: {gross: "9.99"},
                                        subscription: {trial_days: 0}
                                    }
                                });
                            }
                        }
                    };
                """
            },
        )

    def capture_payment(self):
        self.logout_in_browser()
        self.install_paddle_mock()
        self.navigate("/pricing/")
        # Wait for pricing template to render after async Paddle info
        time.sleep(2)
        self.capture("16-payment", "01-pricing-page")

        # Modify subscription page
        self.login_user_with_cookie(self.user)
        self.install_paddle_mock()
        self.navigate("/payment/")
        time.sleep(2)
        self.capture("16-payment", "02-modify-subscription")

        # Subscription warning: freemium user with 3 docs clicking new doc
        freemium = self.create_payment_warning_user()
        self.login_user_with_cookie(freemium, "/documents/")
        self.navigate("/documents/")
        self.wait_for(".fw-contents", timeout=10)
        try:
            new_doc_btn = self.wait_for_visible(
                ".new_document button", timeout=5
            )
            self.install_paddle_mock()
            new_doc_btn.click()
            self.wait_for(".fw-dialog", timeout=5)
            time.sleep(0.5)
            self.capture("16-payment", "03-subscription-warning")
            self.close_dialog()
        except Exception as exc:
            self.log_error("16-payment/03", exc)
            self.close_dialog()

        # Log main user back in
        self.login_user_with_cookie(self.user)

    # ------------------------------------------------------------------
    # 17 ojs
    # ------------------------------------------------------------------

    def capture_ojs(self):
        self.create_test_ojs_journal()

        # Admin register journal page
        self.navigate("/admin/ojs/journal/register_journal/")
        time.sleep(2)
        self.capture("17-ojs", "01-admin-register-journal")

        # Editor File menu with Submit to journal
        doc = Document.objects.filter(owner=self.user).first()
        self.navigate(f"/document/{doc.id}/")
        self.wait_for("#headerbar", timeout=15)
        if self.safe_click('.header-nav-item[title="File handling"]'):
            time.sleep(0.3)
            try:
                item = self.driver.find_element(
                    By.XPATH,
                    '//*[contains(@class,"fw-pulldown-item") and contains(text(),"Submit to journal")]',
                )
                item.click()
                self.wait_for(".fw-dialog", timeout=5)
                self.capture("17-ojs", "02-submit-to-journal-dialog")
                self.close_dialog()
            except Exception as exc:
                self.log_error("17-ojs/02", exc)
                self.close_all_dropdowns()

    # ------------------------------------------------------------------
    # 18 e2ee
    # ------------------------------------------------------------------

    def capture_e2ee(self):
        # Profile E2EE section and setup dialog
        self.navigate("/user/profile/")
        self.wait_for("#preferences-btn", timeout=10)
        self.capture("18-e2ee", "01-profile-section")

        # The setup link is shown asynchronously after checking key status.
        try:
            setup_link = self.wait_for_visible(
                "#setup-e2ee-passphrase", timeout=10
            )
            self.driver.execute_script(
                "arguments[0].scrollIntoView({block:'center'});", setup_link
            )
            setup_link.click()
            self.wait_for(".fw-dialog", timeout=5)
            self.capture("18-e2ee", "02-setup-passphrase")
            self.close_dialog()
        except Exception as exc:
            self.log_error("18-e2ee/02", exc)
            self.close_dialog()

        # Document overview new-document encryption choice
        self.navigate("/documents/")
        self.wait_for(".fw-contents", timeout=10)
        try:
            new_doc_btn = self.wait_for_visible(
                ".new_document button", timeout=5
            )
            new_doc_btn.click()
            self.wait_for(".fw-dialog", timeout=5)
            self.capture("18-e2ee", "03-new-document-encryption-choice")
            # Choose non-encrypted to avoid passphrase flow
            self.driver.find_element(By.CSS_SELECTOR, "#nonencrypted").click()
            self.driver.find_element(
                By.CSS_SELECTOR, ".fw-dialog-buttonpane button.fw-dark"
            ).click()
            time.sleep(1)
        except Exception as exc:
            self.log_error("18-e2ee/03", exc)
            self.close_dialog()

    # ------------------------------------------------------------------
    # Test runner
    # ------------------------------------------------------------------

    def test_capture_additional_screenshots(self):
        collectors = [
            self.capture_citation_api_import,
            self.capture_languagetool,
            self.capture_website,
            self.capture_phplist,
            self.capture_payment,
            self.capture_ojs,
            self.capture_e2ee,
        ]
        for collector in collectors:
            try:
                collector()
            except Exception as exc:
                self.log_error(collector.__name__, exc)
                try:
                    self.close_dialog()
                    self.navigate("/")
                    time.sleep(1)
                except Exception:
                    pass

        # Append to summary instead of overwriting
        summary = self.path_for("summary.txt")
        existing = ""
        if os.path.exists(summary):
            with open(summary) as f:
                existing = f.read()
        with open(summary, "w") as f:
            f.write(existing)
            f.write("\n\nAdditional screenshots (plugins/E2EE) appended.\n")
            f.write(f"Total PNG files now: {self.count_pngs()}\n\n")
            for root, dirs, files in os.walk(self.output_dir):
                # Only list folders that start with 12 or higher
                folder_name = os.path.basename(root)
                if root == self.output_dir or (
                    folder_name.split("-")[0].isdigit()
                    and int(folder_name.split("-")[0]) >= 12
                ):
                    level = root.replace(self.output_dir, "").count(os.sep)
                    indent = " " * 2 * level
                    f.write(f"{indent}{folder_name}/\n")
                    subindent = " " * 2 * (level + 1)
                    for file in sorted(files):
                        if file.endswith(".png"):
                            f.write(f"{subindent}{file}\n")

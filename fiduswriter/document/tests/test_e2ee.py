import time
import sys
import base64

from testing.channels_patch import ChannelsLiveServerTestCase
from testing.selenium_helper import SeleniumHelper
from selenium.webdriver.common.by import By
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException

from django.test import override_settings

from document.models import Document, DocumentEncryptionKey, AccessRight
from document.tests.editor_helper import EditorHelper


@override_settings(E2EE_MODE="enabled")
class E2EEBasicTest(SeleniumHelper, ChannelsLiveServerTestCase):
    """
    Basic E2EE tests covering document creation, opening, password entry,
    password change, and document list indicators.
    """

    fixtures = [
        "initial_documenttemplates.json",
        "initial_styles.json",
    ]

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
        self.base_url = self.live_server_url
        self.user = self.create_user(
            username="E2EEUser", email="e2ee@test.com", passtext="testpass"
        )
        self.login_user(self.user, self.driver, self.client)
        return super().setUp()

    def tearDown(self):
        self.driver.execute_script("window.localStorage.clear()")
        self.driver.execute_script("window.sessionStorage.clear()")
        super().tearDown()
        if "coverage" in sys.modules.keys():
            time.sleep(self.wait_time / 3)

    def create_e2ee_document_via_ui(self, password="SecurePass123"):
        """
        Create a new E2EE document through the UI.
        The frontend has E2EE_MODE baked in as "enabled", so we must
        interact with the encryption-choice dialog.
        Returns the document ID from the URL.
        """
        self.driver.get(self.base_url)
        # Click "Create new document" on the overview
        WebDriverWait(self.driver, self.wait_time).until(
            EC.element_to_be_clickable(
                (By.CSS_SELECTOR, ".new_document button")
            )
        ).click()

        # Wait for and interact with encryption choice dialog
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".ui-dialog"))
        )
        # Select "Encrypted" radio button
        self.driver.find_element(By.ID, "e2ee").click()
        # Click "Create"
        self.driver.find_element(
            By.CSS_SELECTOR, ".ui-dialog .fw-dark"
        ).click()

        # After clicking Create, we may get a passphrase setup offer dialog
        # or directly the password dialog. Try to handle the passphrase offer first.
        time.sleep(1)
        try:
            # Look for "Skip for Now" button which would indicate passphrase offer dialog
            skip_buttons = self.driver.find_elements(
                By.CSS_SELECTOR, ".ui-dialog-buttonpane .fw-button"
            )
            for btn in skip_buttons:
                if "Skip" in btn.text:
                    # This is the passphrase offer dialog, skip it
                    btn.click()
                    time.sleep(0.5)
                    break
        except Exception:
            # No passphrase offer dialog, that's fine
            pass

        # Now wait for the password creation dialog
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.ID, "e2ee-new-password-input")),
            message="Should show E2EE password dialog",
        )

        # Enter password and confirmation
        self.driver.find_element(By.ID, "e2ee-new-password-input").send_keys(
            password
        )
        self.driver.find_element(
            By.ID, "e2ee-confirm-password-input"
        ).send_keys(password)

        # Click "Create Encrypted Document"
        self.driver.find_element(
            By.CSS_SELECTOR, ".ui-dialog .fw-dark"
        ).click()

        # Wait for editor to load
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.CLASS_NAME, "editor-toolbar"))
        )

        # Extract document ID from URL
        url = self.driver.current_url
        doc_id = int(url.split("/document/")[1].split("/")[0])
        return doc_id

    def add_title_and_body(
        self, title="E2EE Test", body="Encrypted body text"
    ):
        """Add title and body text to the current document."""
        title_el = self.driver.find_element(By.CSS_SELECTOR, ".doc-title")
        title_el.click()
        title_el.send_keys(title)

        body_el = self.driver.find_element(By.CSS_SELECTOR, ".doc-body")
        body_el.click()
        body_el.send_keys(body)
        # Allow time for encryption, sync, and snapshot to be saved
        time.sleep(3)

    def test_create_e2ee_document(self):
        """
        Test creating a new E2EE document.
        The password dialog should appear, and after entering a password
        the editor should load.
        """
        doc_id = self.create_e2ee_document_via_ui(password="MyE2EEPass1")

        # Verify editor loaded
        toolbar = self.driver.find_element(By.CLASS_NAME, "editor-toolbar")
        self.assertIsNotNone(toolbar)

        # Verify document exists in DB with e2ee=True
        doc = Document.objects.get(id=doc_id)
        self.assertTrue(doc.e2ee)
        self.assertIsNotNone(doc.e2ee_salt)
        self.assertEqual(doc.e2ee_iterations, 600000)

    def test_open_e2ee_document_with_password(self):
        """
        Test opening an existing E2EE document by entering the password.
        """
        password = "OpenDocPass1"
        self.create_e2ee_document_via_ui(password=password)
        self.add_title_and_body(title="Secret Title", body="Secret content")

        # Navigate away to overview
        self.driver.get(self.base_url)
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, ".fw-contents tbody tr")
            )
        )

        # Clear sessionStorage so we can test the password entry flow
        self.driver.execute_script("window.sessionStorage.clear()")

        # Click on the document to reopen it
        self.driver.find_element(
            By.CSS_SELECTOR, ".fw-contents tbody tr a.fw-data-table-title"
        ).click()

        # Wait for the password entry dialog
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.ID, "e2ee-password-input"))
        )

        # Enter the password
        self.driver.find_element(By.ID, "e2ee-password-input").send_keys(
            password
        )
        self.driver.find_element(
            By.CSS_SELECTOR, ".ui-dialog .fw-dark"
        ).click()

        # Wait for editor to load
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.CLASS_NAME, "editor-toolbar"))
        )

        # Verify the content is visible
        title_text = self.driver.execute_script(
            "return window.theApp.page.view.state.doc.firstChild.textContent;"
        )
        self.assertIn("Secret Title", title_text)

    def test_open_e2ee_document_wrong_password(self):
        """
        Test that entering the wrong password shows an error dialog
        with Retry and Cancel options.
        """
        password = "RightPass1"
        self.create_e2ee_document_via_ui(password=password)
        self.add_title_and_body(title="Wrong Pass Test", body="body text")

        # Wait for the initial encrypted snapshot to be saved so that
        # the document content is actually encrypted in the DB.
        time.sleep(3)

        # Navigate away and back
        self.driver.get(self.base_url)
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, ".fw-contents tbody tr")
            )
        )

        # Clear sessionStorage so the password dialog appears
        self.driver.execute_script("window.sessionStorage.clear()")

        self.driver.find_element(
            By.CSS_SELECTOR, ".fw-contents tbody tr a.fw-data-table-title"
        ).click()

        # Wait for password dialog
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.ID, "e2ee-password-input"))
        )

        # Enter wrong password
        self.driver.find_element(By.ID, "e2ee-password-input").send_keys(
            "WrongPass1"
        )
        self.driver.find_element(
            By.CSS_SELECTOR, ".ui-dialog .fw-dark"
        ).click()

        # Wait for the error dialog
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.ID, "e2ee-decryption-failed"))
        )

        # Verify both Retry and Cancel buttons exist
        buttons = self.driver.find_elements(
            By.CSS_SELECTOR,
            "#e2ee-decryption-failed ~ .ui-dialog-buttonpane .fw-button",
        )
        button_texts = [b.text for b in buttons]
        self.assertTrue(
            any("Retry" in t for t in button_texts),
            "Error dialog should have a Retry button",
        )
        self.assertTrue(
            any("Cancel" in t for t in button_texts),
            "Error dialog should have a Cancel button",
        )

        # Click Cancel to go back to overview
        for b in buttons:
            if "Cancel" in b.text:
                b.click()
                break

        # Should be back on overview
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".fw-contents"))
        )

    def test_cancel_password_dialog(self):
        """
        Test clicking Cancel on the password entry dialog navigates back.
        """
        password = "CancelTest1"
        self.create_e2ee_document_via_ui(password=password)

        # Navigate away and back
        self.driver.get(self.base_url)
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, ".fw-contents tbody tr")
            )
        )

        # Clear sessionStorage so the password dialog appears
        self.driver.execute_script("window.sessionStorage.clear()")

        self.driver.find_element(
            By.CSS_SELECTOR, ".fw-contents tbody tr a.fw-data-table-title"
        ).click()

        # Wait for password dialog
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.ID, "e2ee-password-input"))
        )

        # Click Cancel
        buttons = self.driver.find_elements(
            By.CSS_SELECTOR,
            "#e2ee-enter-password ~ .ui-dialog-buttonpane .fw-button",
        )
        for b in buttons:
            if "Cancel" in b.text:
                b.click()
                break

        # Should be back on overview
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".fw-contents"))
        )

    def test_document_list_shows_encrypted_indicator(self):
        """
        Test that E2EE documents show a lock icon in the document overview.
        When the key is available in sessionStorage, the real title is shown
        and the e2ee-encrypted-title class is not present.
        """
        self.create_e2ee_document_via_ui()

        self.driver.get(self.base_url)
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, ".fw-contents tbody tr")
            )
        )

        # Check for lock icon
        lock_icons = self.driver.find_elements(
            By.CSS_SELECTOR, ".e2ee-doc-indicator"
        )
        self.assertEqual(len(lock_icons), 1, "Should show one lock icon")

        # When the key is in sessionStorage, the real title is shown
        # without the e2ee-encrypted-title styling.
        encrypted_titles = self.driver.find_elements(
            By.CSS_SELECTOR, ".e2ee-encrypted-title"
        )
        self.assertEqual(
            len(encrypted_titles),
            0,
            "Should not show encrypted-title class when key is available",
        )

        # Clear sessionStorage and refresh — now the placeholder should appear
        self.driver.execute_script("window.sessionStorage.clear()")
        self.driver.get(self.base_url)
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, ".fw-contents tbody tr")
            )
        )
        encrypted_titles = self.driver.find_elements(
            By.CSS_SELECTOR, ".e2ee-encrypted-title"
        )
        self.assertEqual(
            len(encrypted_titles),
            1,
            "Should show encrypted-title class when key is not available",
        )

    def test_password_change(self):
        """
        Test changing the document password via the File menu.
        """
        old_password = "OldPass123"
        new_password = "NewPass456"
        self.create_e2ee_document_via_ui(password=old_password)
        self.add_title_and_body(title="Change Pass", body="content here")

        # Open File menu
        self.driver.find_element(
            By.CSS_SELECTOR, ".header-menu:nth-child(1) > .header-nav-item"
        ).click()
        time.sleep(0.5)

        # Click "Change password"
        menu_items = self.driver.find_elements(
            By.CSS_SELECTOR, "li > .fw-pulldown-item"
        )
        change_pass_item = None
        for item in menu_items:
            if "Change password" in item.text:
                change_pass_item = item
                break
        self.assertIsNotNone(
            change_pass_item, "Change password menu item should exist"
        )
        change_pass_item.click()

        # Wait for change password dialog
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (By.ID, "e2ee-current-password-input")
            )
        )

        # Enter current and new passwords
        # The current password field may be prefilled from sessionStorage,
        # so clear it first before entering the test password.
        current_pass_input = self.driver.find_element(
            By.ID, "e2ee-current-password-input"
        )
        current_pass_input.clear()
        current_pass_input.send_keys(old_password)
        self.driver.find_element(By.ID, "e2ee-new-password-input").send_keys(
            new_password
        )
        self.driver.find_element(
            By.ID, "e2ee-confirm-password-input"
        ).send_keys(new_password)

        # Click Change Password
        self.driver.find_element(
            By.CSS_SELECTOR, ".ui-dialog .fw-dark"
        ).click()

        # Wait for dialog to close. The re-encryption snapshot is sent
        # asynchronously via WebSocket. Give it time to reach the server.
        time.sleep(4)

        # Verify the document still loads and content is preserved
        self.driver.get(self.base_url)
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, ".fw-contents tbody tr")
            )
        )

        # Clear sessionStorage so we test the new password entry flow
        self.driver.execute_script("window.sessionStorage.clear()")

        self.driver.find_element(
            By.CSS_SELECTOR, ".fw-contents tbody tr a.fw-data-table-title"
        ).click()

        # Enter NEW password
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.ID, "e2ee-password-input"))
        )

        self.driver.find_element(By.ID, "e2ee-password-input").send_keys(
            new_password
        )
        self.driver.find_element(
            By.CSS_SELECTOR, ".ui-dialog .fw-dark"
        ).click()

        # Wait for either editor to load or error dialog to appear
        time.sleep(3)
        error_msg = self.driver.execute_script(
            "return window.lastE2EEDecryptError || null;"
        )
        if error_msg:
            print(f"JS DECRYPT ERROR: {error_msg}")

        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.CLASS_NAME, "editor-toolbar"))
        )

        title_text = self.driver.execute_script(
            "return window.theApp.page.view.state.doc.firstChild.textContent;"
        )
        self.assertIn("Change Pass", title_text)

    def test_session_storage_skips_password_dialog(self):
        """
        Test that reopening an E2EE document in the same browser session
        does not prompt for the password again when the key is cached in
        sessionStorage.
        """
        password = "SessionPass1"
        self.create_e2ee_document_via_ui(password=password)
        self.add_title_and_body(title="Session Test", body="session content")

        # Navigate away to overview
        self.driver.get(self.base_url)
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, ".fw-contents tbody tr")
            )
        )

        # Click on the document to reopen it
        self.driver.find_element(
            By.CSS_SELECTOR, ".fw-contents tbody tr a.fw-data-table-title"
        ).click()

        # The editor should load directly without a password dialog
        # because the key is cached in sessionStorage.
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.CLASS_NAME, "editor-toolbar"))
        )

        # Give the decrypted document content a moment to render
        time.sleep(1)

        # Verify the content is visible
        title_text = self.driver.execute_script(
            "return window.theApp.page.view.state.doc.firstChild.textContent;"
        )
        self.assertIn("Session Test", title_text)


@override_settings(E2EE_MODE="enabled")
class E2EEAccessRightsTest(SeleniumHelper, ChannelsLiveServerTestCase):
    """
    Tests for E2EE-specific access rights behavior:
    - Warning banner in share dialog
    - Share link creation with password in URL fragment
    - Filtered access rights dropdown
    """

    fixtures = [
        "initial_documenttemplates.json",
        "initial_styles.json",
    ]

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
        self.base_url = self.live_server_url
        self.user = self.create_user(
            username="E2EEOwner", email="owner@test.com", passtext="testpass"
        )
        self.login_user(self.user, self.driver, self.client)
        return super().setUp()

    def tearDown(self):
        self.driver.execute_script("window.localStorage.clear()")
        self.driver.execute_script("window.sessionStorage.clear()")
        super().tearDown()
        if "coverage" in sys.modules.keys():
            time.sleep(self.wait_time / 3)

    def create_e2ee_document_via_ui(self, password="SecurePass123"):
        """Helper to create an E2EE document through the UI."""
        self.driver.get(self.base_url)
        WebDriverWait(self.driver, self.wait_time).until(
            EC.element_to_be_clickable(
                (By.CSS_SELECTOR, ".new_document button")
            )
        ).click()

        # Encryption choice dialog
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".ui-dialog"))
        )
        self.driver.find_element(By.ID, "e2ee").click()
        self.driver.find_element(
            By.CSS_SELECTOR, ".ui-dialog .fw-dark"
        ).click()

        # After clicking Create, we may get a passphrase setup offer dialog
        time.sleep(1)
        try:
            # Look for "Skip for Now" button which would indicate passphrase offer dialog
            skip_buttons = self.driver.find_elements(
                By.CSS_SELECTOR, ".ui-dialog-buttonpane .fw-button"
            )
            for btn in skip_buttons:
                if "Skip" in btn.text:
                    # This is the passphrase offer dialog, skip it
                    btn.click()
                    time.sleep(0.5)
                    break
        except Exception:
            # No passphrase offer dialog, that's fine
            pass

        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.ID, "e2ee-new-password-input"))
        )
        self.driver.find_element(By.ID, "e2ee-new-password-input").send_keys(
            password
        )
        self.driver.find_element(
            By.ID, "e2ee-confirm-password-input"
        ).send_keys(password)
        self.driver.find_element(
            By.CSS_SELECTOR, ".ui-dialog .fw-dark"
        ).click()

        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.CLASS_NAME, "editor-toolbar"))
        )

        doc_id = int(
            self.driver.current_url.split("/document/")[1].split("/")[0]
        )
        return doc_id

    def test_share_dialog_shows_e2ee_warning(self):
        """
        Test that the access rights dialog shows an E2EE warning banner
        when sharing an encrypted document.
        """
        self.create_e2ee_document_via_ui()

        # Open File menu → Share
        self.driver.find_element(
            By.CSS_SELECTOR, ".header-menu:nth-child(1) > .header-nav-item"
        ).click()
        time.sleep(0.5)
        self.driver.find_element(
            By.CSS_SELECTOR, "li:nth-child(1) > .fw-pulldown-item"
        ).click()

        # Wait for access rights dialog
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.ID, "access-rights-dialog"))
        )

        # Check for E2EE warning banner
        warning = self.driver.find_element(
            By.CSS_SELECTOR, ".e2ee-access-rights-warning"
        )
        self.assertIsNotNone(warning)
        self.assertIn("secure channel", warning.text)

    def test_share_link_with_password(self):
        """
        Test creating a share link that includes the document password
        in the URL fragment.
        """
        doc_password = "DocPass123"
        self.create_e2ee_document_via_ui(password=doc_password)

        # Open File menu → Share
        self.driver.find_element(
            By.CSS_SELECTOR, ".header-menu:nth-child(1) > .header-nav-item"
        ).click()
        time.sleep(0.5)
        self.driver.find_element(
            By.CSS_SELECTOR, "li:nth-child(1) > .fw-pulldown-item"
        ).click()

        # Wait for dialog
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.ID, "access-rights-dialog"))
        )

        # Switch to "Share link" tab
        self.driver.find_element(
            By.CSS_SELECTOR, ".ui-tabs-nav .tab-link:nth-child(2) a"
        ).click()
        time.sleep(0.5)

        # Click "Create new share link"
        self.driver.find_element(By.ID, "create-share-token-btn").click()

        # Wait for create share token dialog
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (By.ID, "create-share-token-dialog")
            )
        )

        # Verify password field exists for E2EE documents
        pass_input = self.driver.find_element(By.ID, "share-token-password")
        self.assertIsNotNone(pass_input)

        # Enter password to include in link
        pass_input.send_keys(doc_password)

        # Create the link
        self.driver.find_element(
            By.CSS_SELECTOR,
            "#create-share-token-dialog ~ .ui-dialog-buttonpane .fw-dark",
        ).click()

        # Wait for the link to appear in the list
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, ".share-token-row")
            )
        )

        # Verify the URL contains the password fragment
        url_input = self.driver.find_element(
            By.CSS_SELECTOR, ".share-token-url-input"
        )
        share_url = url_input.get_attribute("value")
        self.assertIn("#?password=", share_url)
        self.assertIn(doc_password, share_url)


@override_settings(E2EE_MODE="enabled")
class E2EECollaborationTest(EditorHelper, ChannelsLiveServerTestCase):
    """
    Tests for E2EE document collaboration between two browser sessions.
    """

    fixtures = [
        "initial_documenttemplates.json",
        "initial_styles.json",
    ]

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        driver_data = cls.get_drivers(2)
        cls.driver = driver_data["drivers"][0]
        cls.driver2 = driver_data["drivers"][1]
        cls.client = driver_data["clients"][0]
        cls.client2 = driver_data["clients"][1]
        cls.wait_time = driver_data["wait_time"]

    @classmethod
    def tearDownClass(cls):
        cls.driver.quit()
        cls.driver2.quit()
        super().tearDownClass()

    def setUp(self):
        self.user = self.create_user(
            username="E2EEWriter", email="writer@test.com", passtext="testpass"
        )
        self.login_user(self.user, self.driver, self.client)
        self.login_user(self.user, self.driver2, self.client2)
        super().setUp()

    def tearDown(self):
        super().tearDown()
        if "coverage" in sys.modules.keys():
            time.sleep(self.wait_time / 3)

    def create_e2ee_document_and_load_in_both(self, password="CollabPass1"):
        """
        Create an E2EE document in driver1 and load it in both drivers.
        Returns the Document object.
        """
        # Create via UI in driver1
        self.driver.get(self.live_server_url)
        WebDriverWait(self.driver, self.wait_time).until(
            EC.element_to_be_clickable(
                (By.CSS_SELECTOR, ".new_document button")
            )
        ).click()

        # Encryption choice dialog
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".ui-dialog"))
        )
        self.driver.find_element(By.ID, "e2ee").click()
        self.driver.find_element(
            By.CSS_SELECTOR, ".ui-dialog .fw-dark"
        ).click()

        time.sleep(1)  # Allow async operations to complete

        # Check if passphrase setup offer dialog appears and skip it
        try:
            skip_button = WebDriverWait(self.driver, 2).until(
                EC.element_to_be_clickable(
                    (By.XPATH, "//button[contains(text(), 'Skip for Now')]")
                )
            )
            skip_button.click()
        except TimeoutException:
            # Dialog didn't appear, proceed normally
            pass

        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.ID, "e2ee-new-password-input"))
        )
        self.driver.find_element(By.ID, "e2ee-new-password-input").send_keys(
            password
        )
        self.driver.find_element(
            By.ID, "e2ee-confirm-password-input"
        ).send_keys(password)
        self.driver.find_element(
            By.CSS_SELECTOR, ".ui-dialog .fw-dark"
        ).click()

        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.CLASS_NAME, "editor-toolbar"))
        )

        doc_id = int(
            self.driver.current_url.split("/document/")[1].split("/")[0]
        )
        doc = Document.objects.get(id=doc_id)

        # Load in driver2 - will need password
        self.driver2.get(f"{self.live_server_url}/document/{doc_id}/")

        # Wait for password dialog in driver2
        WebDriverWait(self.driver2, self.wait_time).until(
            EC.presence_of_element_located((By.ID, "e2ee-password-input"))
        )
        self.driver2.find_element(By.ID, "e2ee-password-input").send_keys(
            password
        )
        self.driver2.find_element(
            By.CSS_SELECTOR, ".ui-dialog .fw-dark"
        ).click()

        WebDriverWait(self.driver2, self.wait_time).until(
            EC.presence_of_element_located((By.CLASS_NAME, "editor-toolbar"))
        )

        return doc

    def test_e2ee_typing_collaboration(self):
        """
        Test that typing in an E2EE document is synchronized between
        two browsers.
        """
        self.create_e2ee_document_and_load_in_both(password="SyncPass1")

        # Type in driver1
        title_input = self.driver.find_element(By.CLASS_NAME, "doc-title")
        title_input.click()
        title_input.send_keys("Collaborative Title")

        # Type in driver2 body
        body_input2 = self.driver2.find_element(By.CLASS_NAME, "doc-body")
        body_input2.click()
        body_input2.send_keys("Hello from browser 2")

        # Wait for sync
        time.sleep(2)
        self.wait_for_doc_sync(self.driver, self.driver2)

        # Verify both see the same content
        title1 = self.driver.execute_script(
            "return window.theApp.page.view.state.doc.firstChild.textContent;"
        )
        title2 = self.driver2.execute_script(
            "return window.theApp.page.view.state.doc.firstChild.textContent;"
        )
        self.assertEqual(title1, title2)

        body1 = self.get_contents(self.driver)
        body2 = self.get_contents(self.driver2)
        self.assertEqual(body1, body2)
        self.assertIn("Hello from browser 2", body1)

    def test_e2ee_snapshot_persists_content(self):
        """
        Test that content typed in an E2EE document is persisted
        and can be retrieved after reload.
        """
        password = "PersistPass1"
        doc = self.create_e2ee_document_and_load_in_both(password=password)

        # Type content in driver1
        body_input = self.driver.find_element(By.CLASS_NAME, "doc-body")
        body_input.click()
        body_input.send_keys("Persistent encrypted text")

        # Wait for snapshot to be saved
        time.sleep(3)

        # Reload driver2
        self.driver2.get(f"{self.live_server_url}/document/{doc.id}/")

        # Clear sessionStorage on driver2 so we test password re-entry
        self.driver2.execute_script("window.sessionStorage.clear()")

        # Re-enter password
        WebDriverWait(self.driver2, self.wait_time).until(
            EC.presence_of_element_located((By.ID, "e2ee-password-input"))
        )
        self.driver2.find_element(By.ID, "e2ee-password-input").send_keys(
            password
        )
        self.driver2.find_element(
            By.CSS_SELECTOR, ".ui-dialog .fw-dark"
        ).click()

        WebDriverWait(self.driver2, self.wait_time).until(
            EC.presence_of_element_located((By.CLASS_NAME, "editor-toolbar"))
        )

        # Verify content persisted
        body_text = self.driver2.execute_script(
            "return window.theApp.page.view.state.doc.child(5).textContent;"
        )
        self.assertIn("Persistent encrypted text", body_text)


@override_settings(E2EE_MODE="enabled")
@override_settings(E2EE_MODE="enabled")
class E2EEPersonalPassphraseTest(SeleniumHelper, ChannelsLiveServerTestCase):
    """
    Tests for Personal Passphrase & User-Level Key Management feature.
    Tests the UI flow for setting up personal passphrases and creating E2EE documents.
    """

    fixtures = [
        "initial_documenttemplates.json",
        "initial_styles.json",
    ]

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
        self.base_url = self.live_server_url
        self.user = self.create_user(
            username="PassphraseUser",
            email="passphrase@test.com",
            passtext="testpass",
        )
        self.login_user(self.user, self.driver, self.client)
        return super().setUp()

    def tearDown(self):
        self.driver.execute_script("window.localStorage.clear()")
        self.driver.execute_script("window.sessionStorage.clear()")
        super().tearDown()
        if "coverage" in sys.modules.keys():
            time.sleep(self.wait_time / 3)

    def test_passphrase_setup_offer_appears_on_e2ee_creation(self):
        """
        Test that when creating a new E2EE document, users are offered
        to set up a personal passphrase if they don't have one yet.
        """
        self.driver.get(self.base_url)

        # Click "Create new document"
        WebDriverWait(self.driver, self.wait_time).until(
            EC.element_to_be_clickable(
                (By.CSS_SELECTOR, ".new_document button")
            )
        ).click()

        # Encryption choice dialog
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".ui-dialog"))
        )
        self.driver.find_element(By.ID, "e2ee").click()
        self.driver.find_element(
            By.CSS_SELECTOR, ".ui-dialog .fw-dark"
        ).click()

        # Wait for passphrase setup offer dialog
        time.sleep(1)
        dialog_body = WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, ".ui-dialog-content")
            )
        )

        # Check that the passphrase setup offer is shown
        self.assertIn(
            "personal passphrase",
            dialog_body.text,
            "Should offer to set up personal passphrase",
        )

        # Verify there's a "Set Up Passphrase" button
        buttons = self.driver.find_elements(
            By.CSS_SELECTOR, ".ui-dialog-buttonpane .fw-button"
        )
        button_texts = [b.text for b in buttons]
        self.assertTrue(
            any("Set Up Passphrase" in t for t in button_texts),
            "Should have 'Set Up Passphrase' button",
        )
        self.assertTrue(
            any("Skip" in t for t in button_texts), "Should have 'Skip' button"
        )

        # Click "Skip for Now"
        for btn in buttons:
            if "Skip" in btn.text:
                btn.click()
                break

        time.sleep(1)

        # Should then proceed to password dialog
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.ID, "e2ee-new-password-input"))
        )

    def test_user_encryption_key_model_persists(self):
        """
        Test that the UserEncryptionKey model correctly stores and retrieves
        user encryption data.
        """
        from user.models import UserEncryptionKey
        import json
        import base64

        # Create a UserEncryptionKey record
        public_key = json.dumps(
            {"kty": "RSA", "n": "test_n_value", "e": "AQAB"}
        )
        user_salt = b"1234567890123456"
        encrypted_data = base64.b64encode(b"encrypted_test_data").decode()

        key_record = UserEncryptionKey.objects.create(
            user=self.user,
            public_key=public_key,
            encrypted_master_key=encrypted_data,
            encrypted_private_key=encrypted_data,
            user_salt=user_salt,
            user_iterations=600000,
            encrypted_master_key_backup=encrypted_data,
        )

        # Verify it was created and can be retrieved
        self.assertIsNotNone(key_record.id)
        retrieved = UserEncryptionKey.objects.get(user=self.user)
        self.assertEqual(retrieved.user_iterations, 600000)
        self.assertEqual(len(retrieved.user_salt), 16)
        self.assertEqual(retrieved.public_key, public_key)

    def test_document_encryption_key_model_persists(self):
        """
        Test that DocumentEncryptionKey can track whether DEK is encrypted
        with master key or public key.
        """
        from document.models import Document, DocumentEncryptionKey
        import base64

        # Create an E2EE document
        doc = Document.objects.create(
            title="DEK Test Doc",
            owner=self.user,
            template_id=1,
            e2ee=True,
            e2ee_salt=b"salt1234567890ab",
            e2ee_iterations=600000,
        )

        encrypted_dek = base64.b64encode(b"encrypted_dek_data").decode()

        # Create DEK record encrypted with master key
        DocumentEncryptionKey.objects.create(
            document=doc,
            holder=self.user,
            encrypted_key=encrypted_dek,
            encrypted_with_master_key=True,
        )

        # Verify it was saved
        retrieved = DocumentEncryptionKey.objects.get(document=doc)
        self.assertTrue(retrieved.encrypted_with_master_key)

    def test_document_encryption_key_public_key_mode(self):
        """
        Test that DocumentEncryptionKey can be encrypted with public key
        (for shared documents).
        """
        from document.models import Document, DocumentEncryptionKey
        import base64

        doc = Document.objects.create(
            title="Shared DEK Test Doc",
            owner=self.user,
            template_id=1,
            e2ee=True,
            e2ee_salt=b"salt1234567890ab",
            e2ee_iterations=600000,
        )

        encrypted_dek = base64.b64encode(b"public_key_encrypted_dek").decode()

        # Create DEK record encrypted with public key
        DocumentEncryptionKey.objects.create(
            document=doc,
            holder=self.user,
            encrypted_key=encrypted_dek,
            encrypted_with_master_key=False,
        )

        # Verify it tracks public key encryption
        retrieved = DocumentEncryptionKey.objects.get(document=doc)
        self.assertFalse(retrieved.encrypted_with_master_key)

    def test_bulk_get_user_document_encryption_keys(self):
        """Test fetching all DocumentEncryptionKeys for a user."""
        from django.contrib.auth import get_user_model

        User = get_user_model()
        user2 = User.objects.create_user(
            username="user2", email="user2@test.com", password="testpass"
        )

        # Create multiple E2EE documents
        doc1 = Document.objects.create(
            title="Doc 1",
            owner=self.user,
            template_id=1,
            e2ee=True,
            e2ee_salt=b"salt1111111111ab",
            e2ee_iterations=600000,
        )

        doc2 = Document.objects.create(
            title="Doc 2",
            owner=self.user,
            template_id=1,
            e2ee=True,
            e2ee_salt=b"salt2222222222ab",
            e2ee_iterations=600000,
        )

        # Create DEK records for the user
        DocumentEncryptionKey.objects.create(
            document=doc1,
            holder=self.user,
            encrypted_key=base64.b64encode(b"dek1").decode(),
            encrypted_with_master_key=True,
        )

        DocumentEncryptionKey.objects.create(
            document=doc2,
            holder=self.user,
            encrypted_key=base64.b64encode(b"dek2").decode(),
            encrypted_with_master_key=True,
        )

        # Create DEK for other user (should not be returned)
        DocumentEncryptionKey.objects.create(
            document=doc1,
            holder=user2,
            encrypted_key=base64.b64encode(b"dek_other").decode(),
            encrypted_with_master_key=False,
        )

        # Call the endpoint
        response = self.client.get(
            "/api/document/encryption_key/get_all/",
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("keys", data)

        # Should have 2 keys (only for self.user)
        self.assertEqual(len(data["keys"]), 2)

        # Verify document IDs
        doc_ids = {key["document_id"] for key in data["keys"]}
        self.assertEqual(doc_ids, {doc1.id, doc2.id})

        # Verify master key flag
        for key in data["keys"]:
            self.assertTrue(key["encrypted_with_master_key"])

    def test_automatic_key_sharing_with_passphrase_user(self):
        """Test that sharing with a passphrase-enabled user does not create
        an empty placeholder DEK. The frontend is responsible for encrypting
        and saving the DEK with the recipient's public key."""
        from django.contrib.auth import get_user_model
        from user.models import UserEncryptionKey

        User = get_user_model()
        recipient = User.objects.create_user(
            username="recipient",
            email="recipient@test.com",
            password="testpass",
        )

        # Create an E2EE document owned by self.user
        doc = Document.objects.create(
            title="E2EE Doc",
            owner=self.user,
            template_id=1,
            e2ee=True,
            e2ee_salt=b"salt1234567890ab",
            e2ee_iterations=600000,
        )

        # Create DEK for owner
        DocumentEncryptionKey.objects.create(
            document=doc,
            holder=self.user,
            encrypted_key=base64.b64encode(b"owner_dek").decode(),
            encrypted_with_master_key=True,
        )

        # Give recipient encryption keys (passphrase setup)
        UserEncryptionKey.objects.create(
            user=recipient, public_key='{"kty":"RSA"}'
        )

        # Now share the document with recipient
        import json

        response = self.client.post(
            "/api/document/save_access_rights/",
            {
                "document_ids": json.dumps([doc.id]),
                "access_rights": json.dumps(
                    [
                        {
                            "holder": {"id": recipient.id, "type": "user"},
                            "rights": "read",
                        }
                    ]
                ),
            },
            HTTP_X_REQUESTED_WITH="XMLHttpRequest",
        )

        self.assertEqual(response.status_code, 201)

        # Verify no placeholder DocumentEncryptionKey was created for recipient.
        # The frontend must explicitly encrypt the DEK with the recipient's
        # public key and call the document encryption key API.
        recipient_deks = DocumentEncryptionKey.objects.filter(
            document=doc, holder=recipient
        )
        self.assertEqual(recipient_deks.count(), 0)

        # Verify the access right was created
        from django.contrib.contenttypes.models import ContentType

        user_ct = ContentType.objects.get(app_label="user", model="user")
        ar = AccessRight.objects.filter(
            document=doc, holder_id=recipient.id, holder_type=user_ct
        )
        self.assertEqual(ar.count(), 1)

    def test_passphrase_sharing_scenario(self):
        """Test the complete sharing scenario:
        - User A (passphrase) creates E2EE document
        - A shares with C (passphrase) via public key encryption
        - A shares with D (no passphrase) and sees password dialog
        - A creates share link with password in URL
        - D opens document with password
        - Guest opens share link automatically
        """
        from django.contrib.auth import get_user_model
        from user.models import UserEncryptionKey

        User = get_user_model()

        # Create users
        user_a = self.user  # Already created in setUp
        user_c = User.objects.create_user(
            username="user_c",
            email="c@test.com",
            password="testpass",
        )
        user_d = User.objects.create_user(
            username="user_d",
            email="d@test.com",
            password="testpass",
        )

        # Add C and D as A's contacts
        user_a.contacts.add(user_c, user_d)

        # Generate real crypto keys in the browser
        keys = self.driver.execute_script(
            """
            return (async function() {
                const aKeyPair = await crypto.subtle.generateKey(
                    {name: "ECDH", namedCurve: "P-256"},
                    true,
                    ["deriveKey"]
                );
                const cKeyPair = await crypto.subtle.generateKey(
                    {name: "ECDH", namedCurve: "P-256"},
                    true,
                    ["deriveKey"]
                );
                const masterKey = await crypto.subtle.generateKey(
                    {name: "AES-GCM", length: 256},
                    true,
                    ["encrypt", "decrypt"]
                );
                const aPublicJwk = await crypto.subtle.exportKey("jwk", aKeyPair.publicKey);
                const aPrivateJwk = await crypto.subtle.exportKey("jwk", aKeyPair.privateKey);
                const cPublicJwk = await crypto.subtle.exportKey("jwk", cKeyPair.publicKey);
                const masterRaw = await crypto.subtle.exportKey("raw", masterKey);
                const masterBase64 = btoa(String.fromCharCode(...new Uint8Array(masterRaw)));
                return {
                    aPublicJwk: JSON.stringify(aPublicJwk),
                    aPrivateJwk: JSON.stringify(aPrivateJwk),
                    cPublicJwk: JSON.stringify(cPublicJwk),
                    masterKeyBase64: masterBase64
                };
            })();
        """
        )

        # Create UserEncryptionKey records for A and C
        UserEncryptionKey.objects.create(
            user=user_a,
            public_key=keys["aPublicJwk"],
            encrypted_master_key="dummy_encrypted_mk",
            encrypted_private_key="dummy_encrypted_sk",
            user_salt=b"1234567890123456",
            user_iterations=600000,
            encrypted_master_key_backup="dummy_backup",
        )
        UserEncryptionKey.objects.create(
            user=user_c,
            public_key=keys["cPublicJwk"],
            encrypted_master_key="dummy_encrypted_mk_c",
            encrypted_private_key="dummy_encrypted_sk_c",
            user_salt=b"1234567890123456",
            user_iterations=600000,
            encrypted_master_key_backup="dummy_backup_c",
        )

        # Navigate to base URL and inject A's master key into sessionStorage
        self.driver.get(self.base_url)
        self.driver.execute_script(
            "sessionStorage.setItem('e2ee_master_key', arguments[0]);"
            + "sessionStorage.setItem('e2ee_private_key', arguments[1]);",
            keys["masterKeyBase64"],
            keys["aPrivateJwk"],
        )

        # --- Step 1: A creates E2EE document with passphrase ---
        self.driver.get(self.base_url)
        WebDriverWait(self.driver, self.wait_time).until(
            EC.element_to_be_clickable(
                (By.CSS_SELECTOR, ".new_document button")
            )
        ).click()

        # Encryption choice dialog
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".ui-dialog"))
        )
        self.driver.find_element(By.ID, "e2ee").click()
        self.driver.find_element(
            By.CSS_SELECTOR, ".ui-dialog .fw-dark"
        ).click()

        # Wait for editor to load (passphrase mode creates doc immediately)
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.CLASS_NAME, "editor-toolbar"))
        )

        # Add title and body so we can verify content later
        title_el = self.driver.find_element(By.CSS_SELECTOR, ".doc-title")
        title_el.click()
        title_el.send_keys("Passphrase Share Test")
        body_el = self.driver.find_element(By.CSS_SELECTOR, ".doc-body")
        body_el.click()
        body_el.send_keys("Shared content")
        time.sleep(3)

        # Extract document ID from URL
        url = self.driver.current_url
        doc_id = int(url.split("/document/")[1].split("/")[0])

        # --- Step 2: A shares with C (passphrase) and D (no passphrase) ---
        # Open File menu
        self.driver.find_element(
            By.CSS_SELECTOR, ".header-menu:nth-child(1) > .header-nav-item"
        ).click()
        time.sleep(0.5)
        self.driver.find_element(
            By.CSS_SELECTOR, "li:nth-child(1) > .fw-pulldown-item"
        ).click()

        # Wait for share dialog
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.ID, "access-rights-dialog"))
        )

        # Click on C in contacts list
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, f".fw-checkable-td[data-id='{user_c.id}']")
            )
        ).click()

        # Click on D in contacts list
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, f".fw-checkable-td[data-id='{user_d.id}']")
            )
        ).click()

        # Click Add button to add selected contacts to collaborators
        self.driver.find_element(By.ID, "add-share-contact").click()
        time.sleep(0.5)

        # Click Submit
        self.driver.find_element(
            By.CSS_SELECTOR,
            "#access-rights-dialog ~ .ui-dialog-buttonpane .fw-dark",
        ).click()

        # Wait for "Share Document Password" dialog to appear (for D)
        password_dialog = WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, "#share-password-dialog")
            )
        )
        # The dialog content element IS #share-password-dialog itself
        self.assertIn(
            "don't have passphrase encryption",
            password_dialog.text,
            "Should show non-passphrase users in password share dialog",
        )

        # Close the password dialog
        self.driver.find_element(
            By.CSS_SELECTOR,
            "#share-password-dialog ~ .ui-dialog-buttonpane .fw-dark",
        ).click()
        time.sleep(1)

        # --- Step 3: Verify backend state for C ---
        # C should have a DocumentEncryptionKey (encrypted with public key)
        c_keys = DocumentEncryptionKey.objects.filter(
            document_id=doc_id, holder=user_c
        )
        self.assertEqual(
            c_keys.count(), 1, "C should have an encrypted document password"
        )
        self.assertFalse(c_keys.first().encrypted_with_master_key)

        # D should NOT have a DocumentEncryptionKey (password shared directly)
        d_keys = DocumentEncryptionKey.objects.filter(
            document_id=doc_id, holder=user_d
        )
        self.assertEqual(
            d_keys.count(), 0, "D should not have a DocumentEncryptionKey"
        )

        # --- Step 4: Create share link ---
        # Open File menu again
        self.driver.find_element(
            By.CSS_SELECTOR, ".header-menu:nth-child(1) > .header-nav-item"
        ).click()
        time.sleep(0.5)
        self.driver.find_element(
            By.CSS_SELECTOR, "li:nth-child(1) > .fw-pulldown-item"
        ).click()

        # Wait for share dialog
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.ID, "access-rights-dialog"))
        )

        # Switch to Share link tab
        self.driver.find_element(
            By.CSS_SELECTOR, ".ui-tabs-nav .tab-link:nth-child(2) a"
        ).click()
        time.sleep(0.5)

        # Click Create new share link
        self.driver.find_element(By.ID, "create-share-token-btn").click()

        # Wait for create dialog
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (By.ID, "create-share-token-dialog")
            )
        )

        # Verify password field is prefilled (auto-generated document password)
        pass_input = self.driver.find_element(By.ID, "share-token-password")
        prefilled_password = pass_input.get_attribute("value")
        self.assertTrue(
            len(prefilled_password) >= 43,
            "Password field should be prefilled with document password",
        )

        # Create the link
        self.driver.find_element(
            By.CSS_SELECTOR,
            "#create-share-token-dialog ~ .ui-dialog-buttonpane .fw-dark",
        ).click()

        # Wait for link to appear
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, ".share-token-row")
            )
        )

        # Verify URL contains password fragment
        url_input = self.driver.find_element(
            By.CSS_SELECTOR, ".share-token-url-input"
        )
        share_url = url_input.get_attribute("value")
        self.assertIn("#?password=", share_url)
        from urllib.parse import unquote

        self.assertIn(prefilled_password, unquote(share_url))

        # Store share URL for later
        share_link = share_url

        # Close share dialog
        self.driver.find_element(
            By.CSS_SELECTOR,
            "#access-rights-dialog ~ .ui-dialog-buttonpane .fw-light",
        ).click()
        time.sleep(0.5)

        # --- Step 5: D opens document with password ---
        # Log out A
        self.logout_user(self.driver, self.client)

        # Log in as D
        self.login_user(user_d, self.driver, self.client)

        # Clear sessionStorage so D has to enter password manually
        self.driver.execute_script("window.sessionStorage.clear()")

        # Navigate to overview
        self.driver.get(self.base_url)
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, ".fw-contents tbody tr")
            )
        )

        # Click on the document
        self.driver.find_element(
            By.CSS_SELECTOR, ".fw-contents tbody tr a.fw-data-table-title"
        ).click()

        # Wait for password dialog
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.ID, "e2ee-password-input"))
        )

        # Enter the document password
        self.driver.find_element(By.ID, "e2ee-password-input").send_keys(
            prefilled_password
        )
        self.driver.find_element(
            By.CSS_SELECTOR, ".ui-dialog .fw-dark"
        ).click()

        # Wait for editor to load
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.CLASS_NAME, "editor-toolbar"))
        )

        # Verify content is accessible
        title_text = self.driver.execute_script(
            "return window.theApp.page.view.state.doc.firstChild.textContent;"
        )
        self.assertIn("Passphrase Share Test", title_text)

        # --- Step 6: Guest opens share link ---
        # Log out D
        self.logout_user(self.driver, self.client)

        # Clear all storage
        self.driver.execute_script("window.localStorage.clear()")
        self.driver.execute_script("window.sessionStorage.clear()")

        # Navigate to share link
        self.driver.get(share_link)

        # Wait for editor to load (password is in URL fragment, should auto-decrypt)
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.CLASS_NAME, "editor-toolbar"))
        )

        # Verify content is accessible
        title_text = self.driver.execute_script(
            "return window.theApp.page.view.state.doc.firstChild.textContent;"
        )
        self.assertIn("Passphrase Share Test", title_text)

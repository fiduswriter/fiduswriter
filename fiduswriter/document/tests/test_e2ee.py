import time
import sys

from testing.channels_patch import ChannelsLiveServerTestCase
from testing.selenium_helper import SeleniumHelper
from selenium.webdriver.common.by import By
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from django.test import override_settings

from document.models import Document
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

        # Wait for the password creation dialog
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.ID, "e2ee-new-password-input"))
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
        self.driver.find_element(
            By.ID, "e2ee-current-password-input"
        ).send_keys(old_password)
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

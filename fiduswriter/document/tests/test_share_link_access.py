import time
import sys

from testing.channels_patch import ChannelsLiveServerTestCase
from testing.selenium_helper import SeleniumHelper
from selenium.webdriver.common.by import By
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from document.models import ShareToken


class ShareLinkAccessTest(SeleniumHelper, ChannelsLiveServerTestCase):
    """
    Tests for accessing documents via share links.
    Tests both guest (unauthenticated) and logged-in users accessing via share tokens.
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
        self.owner = self.create_user(
            username="Owner", email="owner@example.com", passtext="password"
        )
        self.guest_user = self.create_user(
            username="Guest", email="guest@example.com", passtext="password"
        )
        # Create a document owned by the owner
        from document.models import Document

        self.doc = Document.objects.create(owner=self.owner, template_id=1)
        # Login owner
        self.login_user(self.owner, self.driver, self.client)
        super().setUp()

    def tearDown(self):
        super().tearDown()
        if "coverage" in sys.modules.keys():
            time.sleep(self.wait_time / 3)

    def create_share_token(self, doc, rights="write"):
        """Create a share token for the given document."""
        return ShareToken.objects.create(
            document=doc, rights=rights, created_by=self.owner
        )

    def load_share_link_editor(self, driver, token):
        """Load document via share link."""
        driver.get(f"{self.live_server_url}/share/{token}/")
        WebDriverWait(driver, self.wait_time).until(
            EC.presence_of_element_located((By.CLASS_NAME, "editor-toolbar"))
        )

    def test_guest_access_via_share_link(self):
        """
        Test that an unauthenticated user can access a document via share link.
        The user should see 'Guest' as their name and have appropriate access.
        """
        # Create a write share token
        token = self.create_share_token(self.doc, rights="write")

        # Open share link in driver2 (not logged in)
        self.driver2.get(f"{self.live_server_url}/share/{token.token}/")
        WebDriverWait(self.driver2, self.wait_time).until(
            EC.presence_of_element_located((By.CLASS_NAME, "editor-toolbar"))
        )

        # Check that the document loaded
        body = self.driver2.find_element(By.CLASS_NAME, "doc-body")
        self.assertIsNotNone(body)

        # Clean up
        token.delete()

    def test_guest_cannot_request_access(self):
        """
        Test that a guest user does not see the 'Request Access' option.
        The File menu should show 'Sign up / Log in' instead of 'Close',
        and the Share/Request Access item should be disabled.
        """
        token = self.create_share_token(self.doc, rights="read")

        # Open share link in driver2 (not logged in)
        self.driver2.get(f"{self.live_server_url}/share/{token.token}/")
        WebDriverWait(self.driver2, self.wait_time).until(
            EC.presence_of_element_located((By.CLASS_NAME, "editor-toolbar"))
        )

        # Open the File menu (first header menu)
        self.driver2.find_element(
            By.CSS_SELECTOR, ".header-menu:nth-child(1) > .header-nav-item"
        ).click()
        time.sleep(0.5)

        # Get all menu item texts
        menu_items = self.driver2.find_elements(
            By.CSS_SELECTOR, "li > .fw-pulldown-item"
        )
        menu_texts = [item.text for item in menu_items]

        # Guest should NOT see 'Request Access' (that's only for logged-in
        # non-owners). The first item title resolves to "Share" for guests
        # because is_authenticated is false, but it is disabled.
        self.assertTrue(
            "Request Access" not in menu_texts,
            "Guest should not see 'Request Access'",
        )
        # The second menu item should be 'Sign up / Log in' for guests
        # (instead of 'Close' for authenticated users).
        self.assertTrue(
            any("Sign up" in text for text in menu_texts),
            "Guest should see 'Sign up / Log in' option",
        )

        token.delete()

    def test_logged_in_user_access_via_share_link(self):
        """
        Test that a logged-in user can access a document via share link.
        The user should see their real name and have appropriate access rights.
        """
        # Login the guest user in driver2
        self.login_user(self.guest_user, self.driver2, self.client2)

        # Create a write share token
        token = self.create_share_token(self.doc, rights="write")

        # Open share link in driver2 (logged in as guest_user)
        self.load_share_link_editor(self.driver2, token.token)

        # Check that the document loaded
        body = self.driver2.find_element(By.CLASS_NAME, "doc-body")
        self.assertIsNotNone(body)

        # Check that the user info shows the real username.
        # The Editor class stores user directly as this.user,
        # accessible via window.theApp.page.user
        user_info = self.driver2.execute_script(
            "return window.theApp.page.user;"
        )
        self.assertEqual(user_info["username"], "Guest")
        self.assertEqual(user_info["name"], "Guest")

        token.delete()

    def test_logged_in_user_can_request_access(self):
        """
        Test that a logged-in user accessing via share link sees 'Request Access'
        instead of 'Share' menu item when they are not the owner.
        """
        # Login the guest user in driver2
        self.login_user(self.guest_user, self.driver2, self.client2)

        # Create a read-only share token
        token = self.create_share_token(self.doc, rights="read")

        # Open share link in driver2 (logged in as guest_user)
        self.load_share_link_editor(self.driver2, token.token)

        # Open the File menu (first header menu)
        self.driver2.find_element(
            By.CSS_SELECTOR, ".header-menu:nth-child(1) > .header-nav-item"
        ).click()
        time.sleep(0.5)

        # The first menu item should be 'Request Access' for logged-in non-owner.
        # Menu items are rendered as <li><span class="fw-pulldown-item">...</span></li>
        first_item_text = self.driver2.find_element(
            By.CSS_SELECTOR, "li:nth-child(1) > .fw-pulldown-item"
        ).text
        self.assertIn("Request Access", first_item_text)

        token.delete()

    def test_owner_sees_share_menu(self):
        """
        Test that the document owner sees the 'Share' menu item,
        not 'Request Access'.
        """
        # Create a share token and access as owner (already logged in)
        token = self.create_share_token(self.doc, rights="write")

        # Access the document via share link as the owner
        self.load_share_link_editor(self.driver, token.token)

        # Open the File menu (first header menu)
        self.driver.find_element(
            By.CSS_SELECTOR, ".header-menu:nth-child(1) > .header-nav-item"
        ).click()
        time.sleep(0.5)

        # The first menu item should be 'Share' for the owner.
        # Menu items are rendered as <li><span class="fw-pulldown-item">...</span></li>
        first_item_text = self.driver.find_element(
            By.CSS_SELECTOR, "li:nth-child(1) > .fw-pulldown-item"
        ).text
        self.assertIn("Share", first_item_text)

        token.delete()

    def test_logged_in_user_can_create_copy(self):
        """
        Test that a logged-in user accessing via share link can create a copy.
        Guest users should not be able to create a copy.
        """
        # Login the guest user in driver2
        self.login_user(self.guest_user, self.driver2, self.client2)

        # Create a write share token
        token = self.create_share_token(self.doc, rights="write")

        # Open share link in driver2 (logged in as guest_user)
        self.load_share_link_editor(self.driver2, token.token)

        # Open the File menu (first header menu)
        self.driver2.find_element(
            By.CSS_SELECTOR, ".header-menu:nth-child(1) > .header-nav-item"
        ).click()
        time.sleep(0.5)

        # Create copy option should be enabled for logged-in users.
        # Menu items are <span class="fw-pulldown-item"> directly.
        menu_items = self.driver2.find_elements(
            By.CSS_SELECTOR, ".fw-pulldown-item"
        )
        menu_texts = [item.text for item in menu_items]
        self.assertTrue(
            any("Create copy" in text for text in menu_texts),
            "Create copy should be available for logged-in users",
        )

        token.delete()

    def test_guest_cannot_create_copy(self):
        """
        Test that a guest user cannot create a copy via share link.
        """
        # Create a write share token
        token = self.create_share_token(self.doc, rights="write")

        # Open share link in driver2 (not logged in)
        self.driver2.get(f"{self.live_server_url}/share/{token.token}/")
        WebDriverWait(self.driver2, self.wait_time).until(
            EC.presence_of_element_located((By.CLASS_NAME, "editor-toolbar"))
        )

        # Open the File menu (first header menu)
        self.driver2.find_element(
            By.CSS_SELECTOR, ".header-menu:nth-child(1) > .header-nav-item"
        ).click()
        time.sleep(0.5)

        # Create copy option should be disabled for guests.
        # The disabled class is added directly to the <span class="fw-pulldown-item">
        create_copy_item = None
        menu_items = self.driver2.find_elements(
            By.CSS_SELECTOR, ".fw-pulldown-item"
        )
        for item in menu_items:
            if "Create copy" in item.text:
                create_copy_item = item
                break
        self.assertIsNotNone(create_copy_item)
        # The view adds a "disabled" class to the span when the item is disabled
        self.assertIn(
            "disabled",
            create_copy_item.get_attribute("class"),
            "Create copy should be disabled for guests",
        )

        token.delete()

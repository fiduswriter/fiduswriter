import time

from testing.live_server import ChannelsLiveServerTestCase
from document.tests.editor_helper import EditorHelper
from selenium.webdriver.common.by import By
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from django.test import override_settings


@override_settings(EDITOR_SAVE_MODE="external")
class ExternalSaveTest(EditorHelper, ChannelsLiveServerTestCase):
    """
    Test that EDITOR_SAVE_MODE="external" prevents the editor's built-in
    saving mechanisms from persisting changes.
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
        cls.wait_time = driver_data["wait_time"]

    @classmethod
    def tearDownClass(cls):
        cls.driver.quit()
        super().tearDownClass()

    def setUp(self):
        self.base_url = self.live_server_url
        self.user = self.create_user(
            username="ExternalSaveUser",
            email="external@test.com",
            passtext="externalpass",
        )
        self.login_user(self.user, self.driver, self.client)
        return super().setUp()

    def tearDown(self):
        self.driver.execute_script("window.localStorage.clear()")
        self.driver.execute_script("window.sessionStorage.clear()")
        super().tearDown()

    def test_external_save_mode_does_not_persist(self):
        """
        Create a document, edit it in external-save mode, reload the page,
        and verify that the edits have not been persisted.
        """
        doc = self.create_new_document(self.user)
        self.load_document_editor(self.driver, doc)

        # Verify initial empty title from template.
        initial_title = self.driver.execute_script(
            "return window.theApp.page.view.state.doc.firstChild.textContent;"
        )
        self.assertEqual(initial_title, "")

        # Edit the title.
        title_input = self.driver.find_element(By.CLASS_NAME, "doc-title")
        title_input.click()
        title_input.send_keys("Modified Title")

        # Edit the body.
        body_input = self.driver.find_element(By.CLASS_NAME, "doc-body")
        body_input.click()
        body_input.send_keys("Modified body text")

        # Wait longer than the NoCollabSave interval (10s) to ensure
        # that if any built-in auto-save were active it would have fired.
        time.sleep(12)

        # Reload the page.
        self.driver.refresh()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.CLASS_NAME, "editor-toolbar"))
        )

        # Verify the edits were NOT persisted.
        reloaded_title = self.driver.execute_script(
            "return window.theApp.page.view.state.doc.firstChild.textContent;"
        )
        self.assertEqual(reloaded_title, "")

        reloaded_body = self.driver.execute_script(
            "return window.theApp.page.view.state.doc.child(5).textContent;"
        )
        self.assertEqual(reloaded_body, "")

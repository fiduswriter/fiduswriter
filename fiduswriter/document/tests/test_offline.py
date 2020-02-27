import multiprocessing
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from testing.testcases import LiveTornadoTestCase
from .editor_helper import EditorHelper
from document.ws_views import WebSocket


class OfflineTests(LiveTornadoTestCase, EditorHelper):
    """
    Tests in which two browsers collaborate and the connection is interrupted.
    """
    user = None
    TEST_TEXT = "Lorem ipsum dolor sit amet."
    MULTILINE_TEST_TEXT = "Lorem ipsum\ndolor sit amet."
    fixtures = [
        'initial_documenttemplates.json',
        'initial_styles.json',
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
        self.user = self.create_user()
        self.login_user(self.user, self.driver, self.client)
        self.login_user(self.user, self.driver2, self.client2)
        self.doc = self.create_new_document()

    def tearDown(self):
        self.leave_site(self.driver)
        self.leave_site(self.driver2)

    def test_simple(self):
        """
        Test one client going offline in collaborative mode while both clients
        continue to write and whether documents are synched when user returns
        online.
        """
        self.load_document_editor(self.driver, self.doc)
        self.load_document_editor(self.driver2, self.doc)

        self.add_title(self.driver)
        self.driver.find_element_by_class_name(
            'article-body'
        ).click()

        p1 = multiprocessing.Process(
            target=self.type_text,
            args=(self.driver, self.TEST_TEXT)
        )
        p1.start()

        # Wait for the first processor to write some text
        self.wait_for_doc_size(self.driver2, 34)

        # driver 2 goes offline
        self.driver2.execute_script(
            'window.theApp.page.ws.goOffline()'
        )

        self.driver2.find_element_by_class_name(
            'article-body'
        ).click()

        # Total: 25
        self.driver2.execute_script(
            'window.testCaret.setSelection(25,25)'
        )

        p2 = multiprocessing.Process(
            target=self.type_text,
            args=(self.driver2, self.TEST_TEXT)
        )
        p2.start()
        p1.join()
        p2.join()

        # driver 2 goes online
        self.driver2.execute_script(
            'window.theApp.page.ws.goOnline()'
        )

        self.wait_for_doc_sync(self.driver, self.driver2)

        self.assertEqual(
            len(self.TEST_TEXT) * 2,
            len(self.get_contents(self.driver))
        )

        self.assertEqual(
            self.get_contents(self.driver2),
            self.get_contents(self.driver)
        )

    def test_too_many_diffs(self):
        """
        Test one client going offline in collaborative mode while both clients
        continue to write with the cionnected clients adding too many items to
        the history so that the server no longer can provide it with all
        missing steps. The client therefore needs to recretae the missing steps
        by itself.
        """

        # The history length stored by the server is shortened from 1000 to 1.
        WebSocket.history_length = 1

        self.load_document_editor(self.driver, self.doc)
        self.load_document_editor(self.driver2, self.doc)

        self.add_title(self.driver)
        self.driver.find_element_by_class_name(
            'article-body'
        ).click()

        p1 = multiprocessing.Process(
            target=self.type_text,
            args=(self.driver, self.TEST_TEXT)
        )
        p1.start()

        # Wait for the first processor to write some text
        self.wait_for_doc_size(self.driver2, 34)

        # driver 2 goes offline
        self.driver2.execute_script(
            'window.theApp.page.ws.goOffline()'
        )

        self.driver2.find_element_by_class_name(
            'article-body'
        ).click()

        # Total: 25
        self.driver2.execute_script(
            'window.testCaret.setSelection(25,25)'
        )

        p2 = multiprocessing.Process(
            target=self.type_text,
            args=(self.driver2, self.TEST_TEXT)
        )
        p2.start()
        p1.join()
        p2.join()

        # driver 2 goes online
        self.driver2.execute_script(
            'window.theApp.page.ws.goOnline()'
        )

        self.wait_for_doc_sync(self.driver, self.driver2)

        self.assertEqual(
            len(self.TEST_TEXT) * 2,
            len(self.get_contents(self.driver))
        )

        self.assertEqual(
            self.get_contents(self.driver2),
            self.get_contents(self.driver)
        )

        WebSocket.history_length = 1000

    def test_too_many_diffs_with_tracking(self):
        """
        Test one client going offline in collaborative mode while both clients
        continue to write with the cionnected clients adding too many items to
        the history so that the server no longer can provide it with all
        missing steps. The client therefore needs to recreate the missing steps
        by itself. The limit of steps is set so that tracking kicks in.
        """

        # The history length stored by the server is shortened from 1000 to 1.
        WebSocket.history_length = 1

        self.load_document_editor(self.driver, self.doc)
        self.load_document_editor(self.driver2, self.doc)

        self.add_title(self.driver)
        self.driver.find_element_by_class_name(
            'article-body'
        ).click()

        p1 = multiprocessing.Process(
            target=self.type_text,
            args=(self.driver, self.TEST_TEXT)
        )
        p1.start()

        # Wait for the first processor to write some text
        self.wait_for_doc_size(self.driver2, 34)

        # driver 2 sets tracking limit
        self.driver2.execute_script(
            'window.theApp.page.mod.collab.doc.trackOfflineLimit = 0'
        )

        # driver 2 goes offline
        self.driver2.execute_script(
            'window.theApp.page.ws.goOffline()'
        )

        self.driver2.find_element_by_class_name(
            'article-body'
        ).click()

        # Total: 25
        self.driver2.execute_script(
            'window.testCaret.setSelection(25,25)'
        )

        p2 = multiprocessing.Process(
            target=self.type_text,
            args=(self.driver2, self.TEST_TEXT)
        )
        p2.start()
        p1.join()
        p2.join()

        # driver 2 goes online
        self.driver2.execute_script(
            'window.theApp.page.ws.goOnline()'
        )

        self.wait_for_doc_sync(self.driver, self.driver2)

        self.assertEqual(
            len(self.TEST_TEXT) * 2,
            len(self.get_contents(self.driver))
        )

        self.assertEqual(
            self.get_contents(self.driver2),
            self.get_contents(self.driver)
        )

        dialogtitle = WebDriverWait(self.driver2, self.wait_time).until(
            EC.element_to_be_clickable((By.CLASS_NAME, "ui-dialog-title"))
        )

        assert dialogtitle.text == 'System message'
        self.driver2.find_element_by_css_selector(
            '.ui-dialog button.fw-orange.fw-button'
        ).click()

        change_tracking_boxes = self.driver2.find_elements_by_css_selector(
            '.margin-box.track'
        )
        self.assertEqual(
            len(change_tracking_boxes),
            1
        )

        WebSocket.history_length = 1000

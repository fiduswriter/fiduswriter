import time
import multiprocessing
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from testing.testcases import LiveTornadoTestCase
from .editor_helper import EditorHelper
from document.ws_views import WebSocket
from django.conf import settings
import os
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys
from document.models import AccessRight


class AutoMergeTests(LiveTornadoTestCase, EditorHelper):
    """
    Tests in which two browsers collaborate and the connection is interrupted.
    """
    user = None
    TEST_TEXT = "Lorem ipsum dolor sit amet."
    NEWLINE = "\n"
    MULTILINE_TEST_TEXT = "Item 1\nItem 2\nItem 3\nItem 4"
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

    def test_footnotes_automerge(self):
        """
        Test one client going offline in collaborative mode while both clients
        continue to write and add footnotes, and other text
        such that auto merge would be triggered and tracking changes would
        be triggered.
        """

        self.load_document_editor(self.driver, self.doc)
        self.load_document_editor(self.driver2, self.doc)

        self.add_title(self.driver)
        self.driver.find_element_by_class_name(
            'article-body'
        ).click()

        # Add some initial text and wait for doc to be synced.
        self.type_text(self.driver, self.TEST_TEXT)
        self.wait_for_doc_sync(self.driver, self.driver2)
        
        # driver 2 goes offline
        self.driver2.execute_script(
            'window.theApp.page.ws.goOffline()'
        )

        # Online user adds some text
        self.driver.execute_script(
            'window.testCaret.setSelection(25,25)'
        )
        p1 = multiprocessing.Process(
            target=self.type_text,
            args=(self.driver, self.TEST_TEXT)
        )
        p1.start()

        # Client 2 adds some text at the end.
        self.driver2.execute_script(
            'window.testCaret.setSelection(52,52)'
        )
        self.type_text(self.driver2, self.TEST_TEXT)

        p1.join()

        # Add some footnotes by the offline user at the end of the document
        self.add_footnote(self.driver2, 69, "Test", 1)
        self.add_footnote(self.driver2, 74, "Test", 2)
                
        # Online user adds some footnote
        self.add_footnote(self.driver, 30, "Test", 1)
        self.add_footnote(self.driver, 37, "Test", 2)
        self.add_footnote(self.driver, 44, "Test", 3)
        
        # Reset the tracking limits to allow tracking of user edits
        self.driver2.execute_script(
            'window.theApp.page.mod.collab.doc.merge.trackOfflineLimit = 0'
        )

        # driver 2 goes online
        self.driver2.execute_script(
            'window.theApp.page.ws.goOnline()'
        )

        self.wait_for_doc_sync(self.driver, self.driver2)

        self.assertEqual(
            self.get_contents(self.driver2),
            self.get_contents(self.driver)
        )

        ## Check that the footnote counters and editor is aligned.
        footnote_containers = self.driver2.find_elements_by_class_name(
            'footnote-marker'
        )
        self.assertEqual(
            len(footnote_containers),
            5
        )

        footnote_containers = self.driver.find_elements_by_class_name(
            'footnote-marker'
        )
        self.assertEqual(
            len(footnote_containers),
            5
        )

    def test_list_item_automerge(self):
        """
        Test one client going offline in collaborative mode while both clients
        continue to write and add footnotes, and other text
        such that auto merge would be triggered and tracking changes would
        be triggered.
        """

        self.load_document_editor(self.driver, self.doc)
        self.load_document_editor(self.driver2, self.doc)

        self.add_title(self.driver)
        self.driver.find_element_by_class_name(
            'article-body'
        ).click()

        # Add some initial text and wait for doc to be synced.
        self.type_text(self.driver, self.TEST_TEXT)
        self.type_text(self.driver, self.NEWLINE)
        
        # Add a list item
        button = self.driver.find_element_by_xpath('//*[@title="Numbered list"]')
        button.click()
        self.type_text(self.driver, self.MULTILINE_TEST_TEXT)

        self.wait_for_doc_sync(self.driver, self.driver2)
        
        # driver 2 goes offline
        self.driver2.execute_script(
            'window.theApp.page.ws.goOffline()'
        )


        # Offline user deletes list item in a specific way
        self.driver2.execute_script(
            'window.testCaret.setSelection(86,86)'
        )
        self.driver2.execute_script(
            'window.testCaret.setSelection(56,86)'
        )
        self.driver2.find_element_by_class_name(
            'article-body'
        ).send_keys(Keys.BACKSPACE)
        self.driver2.find_element_by_class_name(
            'article-body'
        ).send_keys(Keys.BACKSPACE)


        # Online user adds some text
        self.driver.execute_script(
            'window.testCaret.setSelection(25,25)'
        )
        self.type_text(self.driver, self.TEST_TEXT)
        

        # Reset the tracking limits to allow tracking of user edits
        self.driver2.execute_script(
            'window.theApp.page.mod.collab.doc.merge.trackOfflineLimit = 0'
        )
        # driver 2 goes online
        self.driver2.execute_script(
            'window.theApp.page.ws.goOnline()'
        )

        self.wait_for_doc_sync(self.driver, self.driver2)

        self.assertEqual(
            self.get_contents(self.driver2),
            self.get_contents(self.driver)
        )

        # Check that the list items aren't deleted
        numberedTags = self.driver.find_elements_by_xpath(
            '//*[contains(@class, "article-body")]//ol//li')
        self.assertEqual(
            len(numberedTags),
            4
        )
        numberedTags = self.driver2.find_elements_by_xpath(
            '//*[contains(@class, "article-body")]//ol//li')
        self.assertEqual(
            len(numberedTags),
            4
        )


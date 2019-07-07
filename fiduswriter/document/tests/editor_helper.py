import time
from random import randrange
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from test.selenium_helper import SeleniumHelper
from document.models import Document


class EditorHelper(SeleniumHelper):
    """
    Common functions used in threaded tests
    """

    def create_new_document(self):
        doc = Document.objects.create(
            owner=self.user,
        )
        doc.save()
        return doc

    def load_document_editor(self, driver, doc):
        driver.get("%s%s" % (
            self.live_server_url,
            doc.get_absolute_url()
        ))
        WebDriverWait(driver, self.wait_time).until(
            EC.presence_of_element_located((By.CLASS_NAME, 'editor-toolbar'))
        )
        self.inject_helpers(driver)

    def inject_helpers(self, driver):
        test_caret_script = open(
            'static-transpile/js/transpile/test_caret.js',
            'r'
        ).read()
        driver.execute_script(
            test_caret_script
        )

    def input_text(self, document_input, text):
        for char in text:
            document_input.send_keys(char)
            time.sleep(randrange(10, 40) / 200.0)

    def add_title(self, driver):
        title = "My title"
        driver.execute_script(
            'window.testCaret.setSelection(2,2)')
        document_input = self.driver.find_element_by_class_name(
            'ProseMirror'
        )
        self.input_text(document_input, title)

    def wait_for_doc_size(self, driver, size, seconds=False):
        if seconds is False:
            seconds = self.wait_time
        doc_size = driver.execute_script(
            'return window.theApp.page.view.state.doc.content.size')
        if doc_size < size and seconds > 0:
            time.sleep(0.1)
            self.wait_for_doc_size(driver, size, seconds - 0.1)

    def wait_for_doc_sync(self, driver, driver2, seconds=False):
        if seconds is False:
            seconds = self.wait_time
        doc_str = driver.execute_script(
            'return window.theApp.page.view.state.doc.toString()')
        doc2_str = driver2.execute_script(
            'return window.theApp.page.view.state.doc.toString()')
        if (doc_str != doc2_str):
            # The strings don't match.
            time.sleep(0.1)
            self.wait_for_doc_sync(driver, driver2, seconds - 0.1)

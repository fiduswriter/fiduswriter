import time
import os
import multiprocessing

from random import randrange

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from allauth.account.models import EmailAddress
from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import User

from test.testcases import LiveTornadoTestCase
from document.models import Document


class Manipulator(object):
    """
    Methods for manipulating django and the browser.
    """
    user = None
    username = 'User'
    email = 'test@example.com'
    passtext = 'p4ssw0rd'

    def getDrivers(self):
        if os.getenv("SAUCE_USERNAME"):
            username = os.environ["SAUCE_USERNAME"]
            access_key = os.environ["SAUCE_ACCESS_KEY"]
            capabilities = {}
            capabilities["build"] = os.environ["TRAVIS_BUILD_NUMBER"]
            capabilities["tags"] = [os.environ["TRAVIS_PYTHON_VERSION"], "CI"]
            capabilities["tunnel-identifier"] = os.environ["TRAVIS_JOB_NUMBER"]
            capabilities["browserName"] = "chrome"
            hub_url = "%s:%s@localhost:4445" % (username, access_key)
            self.driver = webdriver.Remote(
                desired_capabilities=capabilities,
                command_executor="http://%s/wd/hub" % hub_url
            )
            self.driver2 = webdriver.Remote(
                desired_capabilities=capabilities,
                command_executor="http://%s/wd/hub" % hub_url
            )
        else:
            self.driver = webdriver.Chrome()
            self.driver2 = webdriver.Chrome()

    # create django data
    def createUser(self):
        user = User.objects.create(
            username=self.username,
            password=make_password(self.passtext),
            is_active=True
        )
        user.save()

        # avoid the unverified-email login trap
        EmailAddress.objects.create(
            user=user,
            email=self.email,
            verified=True,
        ).save()

        return user

    # drive browser
    def loginUser(self, driver):
        driver.get('%s%s' % (
            self.live_server_url,
            '/account/login/'
        ))
        (driver
            .find_element_by_id('id_login')
            .send_keys(self.username))
        (driver
            .find_element_by_id('id_password')
            .send_keys(self.passtext + Keys.RETURN))
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, 'user-preferences'))
        )

    def createNewDocument(self):
        doc = Document.objects.create(
            owner=self.user,
        )
        doc.save()
        return doc

    def loadDocumentEditor(self, driver, doc):
        driver.get("%s%s" % (
            self.live_server_url,
            doc.get_absolute_url()
        ))
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, 'document-contents'))
        )


class SimpleTypingTest(LiveTornadoTestCase, Manipulator):
    TEST_TEXT = "Lorem ipsum dolor sit amet."

    def setUp(self):
        self.getDrivers()
        self.user = self.createUser()
        self.loginUser(self.driver)
        self.loginUser(self.driver2)
        self.doc = self.createNewDocument()

    def tearDown(self):
        self.driver.quit()
        self.driver2.quit()

    def get_title(self, driver):
        # Title is child 0.
        return driver.execute_script(
            'return window.theEditor.pm.doc.content.content[0].textContent;'
        )

    def get_contents(self, driver):
        # Contents is child 5.
        return driver.execute_script(
            'return window.theEditor.pm.doc.content.content[5].textContent;'
        )

    def test_typing(self):
        self.loadDocumentEditor(self.driver, self.doc)
        self.loadDocumentEditor(self.driver2, self.doc)

        document_input = self.driver.find_element_by_xpath(
            '//*[@class="ProseMirror-content"]'
        )
        document_input2 = self.driver2.find_element_by_xpath(
            '//*[@class="ProseMirror-content"]'
        )

        # Chrome with selenium has problem with focusing elements, so we use
        # the ProseMirror internal methods for this.
        # First start tag is length 1, so placing after first start tag is
        # position 1
        self.driver.execute_script(
            'window.theEditor.pm.setTextSelection(1,1)')
        self.driver2.execute_script(
            'window.theEditor.pm.setTextSelection(1,1)')

        first_part = "Here is "
        second_part = "my title"

        for i in range(8):
            document_input.send_keys(second_part[i])
            time.sleep(randrange(1, 10) / 20.0)
            document_input2.send_keys(first_part[i])
            time.sleep(randrange(1, 10) / 20.0)

        self.assertEqual(
            16,
            len(self.get_title(self.driver))
        )

        self.assertEqual(
            self.get_title(self.driver2),
            self.get_title(self.driver)
        )

        # Chrome with selenium has problem with focusing elements, so we use
        # the ProseMirror internal methods for this.
        # Original document length was 16 (1 for each start/end tag of fields
        # with plaintext and 2 for richtext fields - abstract and contents).
        # Cursor needs to be in last element, so -2 for last end tag.
        # Added content is 16 characters long, so + 16.
        # Total: 30.
        self.driver.execute_script(
            'window.theEditor.pm.setTextSelection(30,30)')
        self.driver2.execute_script(
            'window.theEditor.pm.setTextSelection(30,30)')

        for char in self.TEST_TEXT:
            document_input.send_keys(char)
            time.sleep(randrange(1, 10) / 20.0)
            document_input2.send_keys(char)
            time.sleep(randrange(1, 10) / 20.0)

        self.assertEqual(
            len(self.TEST_TEXT) * 2,
            len(self.get_contents(self.driver))
        )

        self.assertEqual(
            self.get_contents(self.driver2),
            self.get_contents(self.driver)
        )


class ThreadedTypingTest(LiveTornadoTestCase, Manipulator):
    TEST_TEXT = "Lorem ipsum dolor sit amet."

    def setUp(self):
        self.getDrivers()
        self.user = self.createUser()
        self.loginUser(self.driver)
        self.loginUser(self.driver2)
        self.doc = self.createNewDocument()

    def tearDown(self):
        self.driver.quit()
        self.driver2.quit()

    def get_title(self, driver):
        # Title is child 0.
        return driver.execute_script(
            'return window.theEditor.pm.doc.content.content[0].textContent;'
        )

    def get_contents(self, driver):
        # Contents is child 5.
        return driver.execute_script(
            'return window.theEditor.pm.doc.content.content[5].textContent;'
        )

    def input_text(self, document_input, text):
        for char in text:
            document_input.send_keys(char)
            time.sleep(randrange(1, 20) / 20.0)

    def test_typing(self):
        self.loadDocumentEditor(self.driver, self.doc)
        self.loadDocumentEditor(self.driver2, self.doc)

        document_input = self.driver.find_element_by_xpath(
            '//*[@class="ProseMirror-content"]'
        )
        document_input2 = self.driver2.find_element_by_xpath(
            '//*[@class="ProseMirror-content"]'
        )
        # Chrome with selenium has problem with focusing elements, so we use
        # the ProseMirror internal methods for this.
        # First start tag is length 1, so placing after first start tag is
        # position 1
        self.driver.execute_script(
            'window.theEditor.pm.setTextSelection(1,1)')
        self.driver2.execute_script(
            'window.theEditor.pm.setTextSelection(1,1)')

        first_part = "Here is "
        second_part = "my title"

        p1 = multiprocessing.Process(
            target=self.input_text,
            args=(document_input, second_part)
        )
        p2 = multiprocessing.Process(
            target=self.input_text,
            args=(document_input2, first_part)
        )
        p1.start()
        p2.start()
        p1.join()
        p2.join()

        # Wait for the two editors to be synched
        time.sleep(1)

        self.assertEqual(
            16,
            len(self.get_title(self.driver))
        )

        self.assertEqual(
            self.get_title(self.driver2),
            self.get_title(self.driver)
        )

        # Chrome with selenium has problem with focusing elements, so we use
        # the ProseMirror internal methods for this.
        # Original document length was 16 (1 for each start/end tag of fields
        # with plaintext and 2 for richtext fields - abstract and contents).
        # Cursor needs to be in last element, so -2 for last end tag.
        # Added content is 16 characters long, so + 16.
        # Total: 30.
        self.driver.execute_script(
            'window.theEditor.pm.setTextSelection(30,30)')
        self.driver2.execute_script(
            'window.theEditor.pm.setTextSelection(30,30)')

        p1 = multiprocessing.Process(
            target=self.input_text,
            args=(document_input, self.TEST_TEXT)
        )
        p2 = multiprocessing.Process(
            target=self.input_text,
            args=(document_input2, self.TEST_TEXT)
        )
        p1.start()
        p2.start()
        p1.join()
        p2.join()

        # Wait for the two editors to be synched
        time.sleep(1)

        self.assertEqual(
            len(self.TEST_TEXT) * 2,
            len(self.get_contents(self.driver))
        )

        self.assertEqual(
            self.get_contents(self.driver2),
            self.get_contents(self.driver)
        )

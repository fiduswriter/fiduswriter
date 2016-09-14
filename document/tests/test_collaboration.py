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
from django.conf import settings


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
            if os.getenv("TRAVIS_BUILD_NUMBER"):
                capabilities["build"] = os.environ["TRAVIS_BUILD_NUMBER"]
                capabilities["tags"] = [
                    os.environ["TRAVIS_PYTHON_VERSION"],
                    "CI"
                ]
                capabilities["tunnel-identifier"] = os.environ[
                    "TRAVIS_JOB_NUMBER"
                ]

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


class ThreadManipulator(Manipulator):
    """
    Common functions used in threaded tests
    """
    def input_text(self, document_input, text):
        for char in text:
            document_input.send_keys(char)
            time.sleep(randrange(30, 40) / 200.0)

    def add_title(self, driver):
        title = "My title"
        driver.execute_script(
            'window.theEditor.pm.setTextSelection(1,1)')
        document_input = driver.find_element_by_xpath(
            '//*[@class="ProseMirror-content"]'
        )
        self.input_text(document_input, title)

    def wait_for_doc_size(self, driver, size, seconds=10.0):
        doc_size = driver.execute_script(
            'return window.theEditor.pm.doc.content.size')
        if doc_size < size and seconds > 0:
            time.sleep(0.1)
            self.wait_for_doc_size(driver, size, seconds - 0.1)

    def wait_for_doc_sync(self, driver, driver2, seconds=10.0):
        doc_str = driver.execute_script(
            'return window.theEditor.pm.doc.toString()')
        doc2_str = driver2.execute_script(
            'return window.theEditor.pm.doc.toString()')
        if (doc_str != doc2_str):
            # The strings don't match.
            time.sleep(0.1)
            self.wait_for_doc_sync(driver, driver2, seconds - 0.1)


class SimpleTypingTest(LiveTornadoTestCase, Manipulator):
    """
    Test typing in collaborative mode with one user using browser windows
    with the user typing separately at small, random intervals.
    """
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
            time.sleep(randrange(30, 40) / 200.0)
            document_input2.send_keys(first_part[i])
            time.sleep(randrange(30, 40) / 200.0)

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
            time.sleep(randrange(30, 40) / 200.0)
            document_input2.send_keys(char)
            time.sleep(randrange(30, 40) / 200.0)

        self.assertEqual(
            len(self.TEST_TEXT) * 2,
            len(self.get_contents(self.driver))
        )

        self.assertEqual(
            self.get_contents(self.driver2),
            self.get_contents(self.driver)
        )


class TypingTest(LiveTornadoTestCase, ThreadManipulator):
    """
    Test typing in collaborative mode with one user using browser windows
    with the user typing simultaneously in two different threads.
    """
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
        self.wait_for_doc_sync(self.driver, self.driver2)

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
        self.wait_for_doc_sync(self.driver, self.driver2)

        self.assertEqual(
            len(self.TEST_TEXT) * 2,
            len(self.get_contents(self.driver))
        )

        self.assertEqual(
            self.get_contents(self.driver2),
            self.get_contents(self.driver)
        )


class SelectAndBoldTest(LiveTornadoTestCase, ThreadManipulator):
    """
    Test typing in collaborative mode with one user typing and
    another user bold some part of the text in two different threads.
    """
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

    def make_bold(self, driver):
        button = driver.find_element_by_xpath(
            '//*[@id="button-bold"]')
        button.click()

    def get_boldtext(self, driver):
        btext = driver.find_element_by_xpath(
            '//*[@id="document-contents"]/p/strong')
        return btext.text
        # return driver.execute_script(
        #     'window.theEditor.pm.doc.content.content[5].content.content[0].content.content[0].text;'
        # )

    def test_select_and_bold(self):
        self.loadDocumentEditor(self.driver, self.doc)
        self.loadDocumentEditor(self.driver2, self.doc)

        self.add_title(self.driver)

        document_input = self.driver.find_element_by_xpath(
            '//*[@class="ProseMirror-content"]'
        )

        # Total: 22
        self.driver.execute_script(
            'window.theEditor.pm.setTextSelection(22,22)')

        p1 = multiprocessing.Process(
            target=self.input_text,
            args=(document_input, self.TEST_TEXT)
        )
        p1.start()

        # Wait for the first processor to write some text
        self.wait_for_doc_size(self.driver2, 32)

        # without clicking on content the buttons will not work
        content = self.driver2.find_element_by_xpath(
            '//*[@class="ProseMirror-content"]'
        )
        content.click()

        self.driver2.execute_script(
            'window.theEditor.pm.setTextSelection(22,27)')

        p2 = multiprocessing.Process(
            target=self.make_bold,
            args=(self.driver2,)
        )
        p2.start()
        p1.join()
        p2.join()

        self.assertEqual(
            5,
            len(self.get_boldtext(self.driver2))
        )

        self.assertEqual(
            len(self.get_boldtext(self.driver)),
            len(self.get_boldtext(self.driver2))
        )


class SelectAndItalicTest(LiveTornadoTestCase, ThreadManipulator):
    """
    Test typing in collaborative mode with one user typing and
    another user italic some part of the text in two different threads.
    """
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

    def make_bold(self, driver):
        button = driver.find_element_by_xpath(
            '//*[@id="button-italic"]')
        button.click()

    def get_boldtext(self, driver):
        itext = driver.find_element_by_xpath(
            '//*[@id="document-contents"]/p/em')
        return itext.text

    def test_select_and_italic(self):
        self.loadDocumentEditor(self.driver, self.doc)
        self.loadDocumentEditor(self.driver2, self.doc)

        self.add_title(self.driver)

        document_input = self.driver.find_element_by_xpath(
            '//*[@class="ProseMirror-content"]'
        )

        # Total: 22
        self.driver.execute_script(
            'window.theEditor.pm.setTextSelection(22,22)')

        p1 = multiprocessing.Process(
            target=self.input_text,
            args=(document_input, self.TEST_TEXT)
        )
        p1.start()

        # Wait for the first processor to write some text
        self.wait_for_doc_size(self.driver2, 32)

        # without clicking on content the buttons will not work
        content = self.driver2.find_element_by_xpath(
            '//*[@class="ProseMirror-content"]'
        )
        content.click()

        self.driver2.execute_script(
            'window.theEditor.pm.setTextSelection(22,27)')

        p2 = multiprocessing.Process(
            target=self.make_bold,
            args=(self.driver2,)
        )
        p2.start()
        p1.join()
        p2.join()

        self.assertEqual(
            5,
            len(self.get_boldtext(self.driver2))
        )

        self.assertEqual(
            len(self.get_boldtext(self.driver)),
            len(self.get_boldtext(self.driver2))
        )


class MakeNumberedlistTest(LiveTornadoTestCase, ThreadManipulator):
    """
        Test typing in collaborative mode with one user typing and
        another user use numbered list button in two different threads.
        """
    TEST_TEXT = "Lorem ipsum\ndolor sit amet."

    def setUp(self):
        self.getDrivers()
        self.user = self.createUser()
        self.loginUser(self.driver)
        self.loginUser(self.driver2)
        self.doc = self.createNewDocument()

    def tearDown(self):
        self.driver.quit()
        self.driver2.quit()

    def make_numberedlist(self, driver):
        button = driver.find_element_by_xpath(
            '//*[@id="button-ol"]')
        button.click()

    def get_numberedlist(self, driver):
        numberedTags = driver.find_elements_by_xpath(
            '//*[@id="document-contents"]//ol//li')
        return numberedTags

    def test_numberedlist(self):
        self.loadDocumentEditor(self.driver, self.doc)
        self.loadDocumentEditor(self.driver2, self.doc)
        self.add_title(self.driver)

        document_input = self.driver.find_element_by_xpath(
            '//*[@class="ProseMirror-content"]'
        )

        # Total: 22
        self.driver.execute_script(
            'window.theEditor.pm.setTextSelection(22,22)')

        p1 = multiprocessing.Process(
            target=self.input_text,
            args=(document_input, self.TEST_TEXT)
        )
        p1.start()

        # Wait for the first processor to write some text
        self.wait_for_doc_size(self.driver2, 28)

        # without clicking on content the buttons will not work
        content = self.driver2.find_element_by_xpath(
            '//*[@class="ProseMirror-content"]'
        )
        content.click()

        self.driver2.execute_script(
            'window.theEditor.pm.setTextSelection(22,22)')

        p2 = multiprocessing.Process(
            target=self.make_numberedlist,
            args=(self.driver2,)
        )
        p2.start()
        p2.join()

        # Wait for the first processor to write some text and go to next line
        self.wait_for_doc_size(self.driver2, 45)

        self.driver2.execute_script(
            'window.theEditor.pm.setTextSelection(40,40)')

        p2 = multiprocessing.Process(
            target=self.make_numberedlist,
            args=(self.driver2,)
        )
        p2.start()

        p1.join()
        p2.join()

        self.assertEqual(
            2,
            len(self.get_numberedlist(self.driver2))
        )

        self.assertEqual(
            len(self.get_numberedlist(self.driver)),
            len(self.get_numberedlist(self.driver2))
        )


class MakeBulletlistTest(LiveTornadoTestCase, ThreadManipulator):
    """
        Test typing in collaborative mode with one user typing and
        another user use bullet list button in two different threads.
        """
    TEST_TEXT = "Lorem ipsum\ndolor sit amet lorem ipsum."

    def setUp(self):
        self.getDrivers()
        self.user = self.createUser()
        self.loginUser(self.driver)
        self.loginUser(self.driver2)
        self.doc = self.createNewDocument()

    def tearDown(self):
        self.driver.quit()
        self.driver2.quit()

    def make_bulletlist(self, driver):
        button = driver.find_element_by_xpath(
            '//*[@id="button-ul"]')
        button.click()

    def get_bulletlist(self, driver):
        bulletTags = driver.find_elements_by_xpath(
            '//*[@id="document-contents"]//ul//li')
        return bulletTags

    def test_bulletlist(self):
        self.loadDocumentEditor(self.driver, self.doc)
        self.loadDocumentEditor(self.driver2, self.doc)

        self.add_title(self.driver)

        document_input = self.driver.find_element_by_xpath(
            '//*[@class="ProseMirror-content"]'
        )

        # Total: 22
        self.driver.execute_script(
            'window.theEditor.pm.setTextSelection(22,22)')

        p1 = multiprocessing.Process(
            target=self.input_text,
            args=(document_input, self.TEST_TEXT)
        )
        p1.start()

        # Wait for the first processor to write some text
        self.wait_for_doc_size(self.driver2, 28)

        # without clicking on content the buttons will not work
        content = self.driver2.find_element_by_xpath(
            '//*[@class="ProseMirror-content"]'
        )
        content.click()

        self.driver2.execute_script(
            'window.theEditor.pm.setTextSelection(22,22)')

        p2 = multiprocessing.Process(
            target=self.make_bulletlist,
            args=(self.driver2,)
        )
        p2.start()
        p2.join()

        # Wait for the first processor to write enough text and go to next line
        self.wait_for_doc_size(self.driver2, 45)

        self.driver2.execute_script(
            'window.theEditor.pm.setTextSelection(40,40)')

        p2 = multiprocessing.Process(
            target=self.make_bulletlist,
            args=(self.driver2,)
        )
        p2.start()

        p1.join()
        p2.join()

        self.assertEqual(
            2,
            len(self.get_bulletlist(self.driver2))
        )

        self.assertEqual(
            len(self.get_bulletlist(self.driver)),
            len(self.get_bulletlist(self.driver2))
        )


class MakeBlockqouteTest(LiveTornadoTestCase, ThreadManipulator):
    """
        Test typing in collaborative mode with one user typing and
        another user use block qoute button in two different threads.
        """
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

    def make_blockqoute(self, driver):
        button = driver.find_element_by_xpath(
            '//*[@id="button-blockquote"]')
        button.click()

    def get_blockqoute(self, driver):
        blockqouteTags = driver.find_elements_by_xpath(
            '//*[@id="document-contents"]/blockquote')
        return blockqouteTags

    def test_blockqoute(self):
        self.loadDocumentEditor(self.driver, self.doc)
        self.loadDocumentEditor(self.driver2, self.doc)

        self.add_title(self.driver)

        document_input = self.driver.find_element_by_xpath(
            '//*[@class="ProseMirror-content"]'
        )

        # Total: 22
        self.driver.execute_script(
            'window.theEditor.pm.setTextSelection(22,22)')

        p1 = multiprocessing.Process(
            target=self.input_text,
            args=(document_input, self.TEST_TEXT)
        )
        p1.start()

        # Wait for the first processor to write some text
        self.wait_for_doc_size(self.driver2, 25)

        # without clicking on content the buttons will not work
        content = self.driver2.find_element_by_xpath(
            '//*[@class="ProseMirror-content"]'
        )
        content.click()

        self.driver2.execute_script(
            'window.theEditor.pm.setTextSelection(22,22)')

        p2 = multiprocessing.Process(
            target=self.make_blockqoute,
            args=(self.driver2,)
        )
        p2.start()
        p2.join()
        p1.join()

        self.assertEqual(
            1,
            len(self.get_blockqoute(self.driver2))
        )

        self.assertEqual(
            len(self.get_blockqoute(self.driver)),
            len(self.get_blockqoute(self.driver2))
        )


class AddLinkTest(LiveTornadoTestCase, ThreadManipulator):
    """
    Test typing in collaborative mode with one user typing and
    another user select some part of the text and add link
    in two different threads.
    """
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

    def addlink(self, driver):
        button = driver.find_element_by_xpath(
            '//*[@id="button-link"]')
        button.click()

        # wait to load popup
        linktitle = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CLASS_NAME, "linktitle"))
        )
        linktitle.click()
        self.input_text(linktitle, "Test link")

        link = driver.find_element_by_class_name('link')
        self.input_text(link, "example.com")

        driver.find_element_by_xpath(
            "/html/body/div[5]/div[3]/div/button[1]").click()

    def get_link(self, driver):
        atag = driver.find_element_by_xpath(
            '//*[@id="document-contents"]/p/a')
        return atag.text

    def test_select_and_italic(self):
        self.loadDocumentEditor(self.driver, self.doc)
        self.loadDocumentEditor(self.driver2, self.doc)

        self.add_title(self.driver)

        document_input = self.driver.find_element_by_xpath(
            '//*[@class="ProseMirror-content"]'
        )

        # Total: 22
        self.driver.execute_script(
            'window.theEditor.pm.setTextSelection(22,22)')

        p1 = multiprocessing.Process(
            target=self.input_text,
            args=(document_input, self.TEST_TEXT)
        )
        p1.start()

        # Wait for the first processor to write some text
        self.wait_for_doc_size(self.driver2, 32)

        # without clicking on content the buttons will not work
        content = self.driver2.find_element_by_xpath(
            '//*[@class="ProseMirror-content"]'
        )
        content.click()

        self.driver2.execute_script(
            'window.theEditor.pm.setTextSelection(22,27)')

        p2 = multiprocessing.Process(
            target=self.addlink,
            args=(self.driver2,)
        )
        p2.start()
        p1.join()
        p2.join()

        self.assertEqual(
            5,
            len(self.get_link(self.driver2))
        )

        self.assertEqual(
            len(self.get_link(self.driver)),
            len(self.get_link(self.driver2))
        )


class AddFootnoteTest(LiveTornadoTestCase, ThreadManipulator):
    """
    Test typing in collaborative mode with one user typing and
    another user add a footnote in two different threads.
    """
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

    def make_footnote(self, driver):
        button = driver.find_element_by_id('button-footnote')
        button.click()

        # wait for footnote to be created
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located(
                (By.CLASS_NAME, "footnote-container")
            )
        )

        footnote_box = driver.find_element_by_id(
            'footnote-box-container')
        footnote_editor = footnote_box.find_element_by_class_name(
            'ProseMirror-content')
        footnote_editor.click()

        self.input_text(footnote_editor, "footnote Text")

    def get_footnote(self, driver):
        atag = driver.find_element_by_xpath(
            '//*[@id="footnote-box-container"]/div[2]/div/div[1]/p/span'
        )
        return atag.text

    def test_footnote(self):
        self.loadDocumentEditor(self.driver, self.doc)
        self.loadDocumentEditor(self.driver2, self.doc)

        self.add_title(self.driver)

        document_input = self.driver.find_element_by_xpath(
            '//*[@class="ProseMirror-content"]'
        )

        # Total: 22
        self.driver.execute_script(
            'window.theEditor.pm.setTextSelection(22,22)')

        p1 = multiprocessing.Process(
            target=self.input_text,
            args=(document_input, self.TEST_TEXT)
        )
        p1.start()

        # Wait for the first processor to write some text
        self.wait_for_doc_size(self.driver2, 32)

        # without clicking on content the buttons will not work
        content = self.driver2.find_element_by_xpath(
            '//*[@class="ProseMirror-content"]'
        )
        content.click()

        self.driver2.execute_script(
            'window.theEditor.pm.setTextSelection(27,27)')

        p2 = multiprocessing.Process(
            target=self.make_footnote,
            args=(self.driver2,)
        )
        p2.start()
        p1.join()
        p2.join()

        self.assertEqual(
            13,
            len(self.get_footnote(self.driver2))
        )

        self.assertEqual(
            len(self.get_footnote(self.driver)),
            len(self.get_footnote(self.driver2))
        )


class SelectDeleteUndoTest(LiveTornadoTestCase, ThreadManipulator):
    """
    Test typing in collaborative mode with one user typing and
    another user delete and undo some part of the text in two different
    threads.
    """
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

    def perform_delete_undo(self, driver):
        element = driver.find_element_by_class_name('ProseMirror-content')
        element.send_keys(Keys.BACKSPACE)

        button = driver.find_element_by_xpath(
            '//*[@id="button-undo"]')
        button.click()

    def get_undo(self, driver):
        content = driver.find_element_by_xpath(
            '//*[@id="document-contents"]'
        )

        return content.text

    def test_delete_undo(self):
        self.loadDocumentEditor(self.driver, self.doc)
        self.loadDocumentEditor(self.driver2, self.doc)

        self.add_title(self.driver)

        document_input = self.driver.find_element_by_xpath(
            '//*[@class="ProseMirror-content"]'
        )

        # Total: 22
        self.driver.execute_script(
            'window.theEditor.pm.setTextSelection(22,22)')

        p1 = multiprocessing.Process(
            target=self.input_text,
            args=(document_input, self.TEST_TEXT)
        )
        p1.start()

        # Wait for the first processor to write some text
        self.wait_for_doc_size(self.driver2, 32)

        # without clicking on content the buttons will not work
        content = self.driver2.find_element_by_xpath(
            '//*[@class="ProseMirror-content"]'
        )
        content.click()

        self.driver2.execute_script(
            'window.theEditor.pm.setTextSelection(22,27)')

        p2 = multiprocessing.Process(
            target=self.perform_delete_undo,
            args=(self.driver2,)
        )
        p2.start()
        p1.join()
        p2.join()

        self.assertEqual(
            self.TEST_TEXT,
            self.get_undo(self.driver2)
        )

        self.assertEqual(
            self.get_undo(self.driver),
            self.get_undo(self.driver2)
        )


class AddMathEquationTest(LiveTornadoTestCase, ThreadManipulator):
    """
    Test typing in collaborative mode with one user typing and
    another user insert math equation in middle of the text in two different
    threads.
    """
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

    def make_mathequation(self, driver):
        button = driver.find_element_by_id('button-math')
        button.click()

        # wait to load popup
        insert_button = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CLASS_NAME, "insert-math"))
        )
        insert_button.click()

    def get_mathequation(self, driver):
        math = driver.find_element_by_xpath(
            '//*[@id="document-contents"]/p[1]/span[2]'
            # OR '//*[@class="equation"]'
        )

        return math.text

    def test_mathequation(self):
        self.loadDocumentEditor(self.driver, self.doc)
        self.loadDocumentEditor(self.driver2, self.doc)

        self.add_title(self.driver)

        document_input = self.driver.find_element_by_xpath(
            '//*[@class="ProseMirror-content"]'
        )

        # Total: 22
        self.driver.execute_script(
            'window.theEditor.pm.setTextSelection(22,22)')

        p1 = multiprocessing.Process(
            target=self.input_text,
            args=(document_input, self.TEST_TEXT)
        )
        p1.start()

        # Wait for the first processor to write some text
        self.wait_for_doc_size(self.driver2, 32)

        # without clicking on content the buttons will not work
        content = self.driver2.find_element_by_xpath(
            '//*[@class="ProseMirror-content"]'
        )
        content.click()

        self.driver2.execute_script(
            'window.theEditor.pm.setTextSelection(27,27)')

        p2 = multiprocessing.Process(
            target=self.make_mathequation,
            args=(self.driver2,)
        )
        p2.start()
        p1.join()
        p2.join()

        self.assertEqual(
            55,
            len(self.get_mathequation(self.driver2))
        )

        self.assertEqual(
            len(self.get_mathequation(self.driver)),
            len(self.get_mathequation(self.driver2))
        )


class AddCommentTest(LiveTornadoTestCase, ThreadManipulator):
    """
    Test typing in collaborative mode with one user typing and
    another user add some comment in middle of the text in two different
    threads.
    """
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

    def add_comment(self, driver):
        button = driver.find_element_by_id('button-comment')
        button.click()

        textArea = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CLASS_NAME, "commentText"))
        )
        textArea.click()

        self.input_text(textArea, "My comment")

        driver.find_element_by_class_name("submitComment").click()

    def get_comment(self, driver):
        comment = driver.find_element_by_class_name('comment-text-wrapper')

        return comment.text

    def test_comment(self):
        self.loadDocumentEditor(self.driver, self.doc)
        self.loadDocumentEditor(self.driver2, self.doc)

        self.add_title(self.driver)

        document_input = self.driver.find_element_by_xpath(
            '//*[@class="ProseMirror-content"]'
        )

        # Total: 22
        self.driver.execute_script(
            'window.theEditor.pm.setTextSelection(22,22)')

        p1 = multiprocessing.Process(
            target=self.input_text,
            args=(document_input, self.TEST_TEXT)
        )
        p1.start()

        # Wait for the first processor to write some text
        self.wait_for_doc_size(self.driver2, 33)

        # without clicking on content the buttons will not work
        content = self.driver2.find_element_by_xpath(
            '//*[@class="ProseMirror-content"]'
        )
        content.click()

        self.driver2.execute_script(
            'window.theEditor.pm.setTextSelection(22,27)')

        p2 = multiprocessing.Process(
            target=self.add_comment,
            args=(self.driver2,)
        )
        p2.start()
        p1.join()
        p2.join()

        self.wait_for_doc_sync(self.driver, self.driver2)

        self.assertEqual(
            10,
            len(self.get_comment(self.driver2))
        )

        self.assertEqual(
            len(self.get_comment(self.driver)),
            len(self.get_comment(self.driver2))
        )


class AddImageTest(LiveTornadoTestCase, ThreadManipulator):
    """
    Test typing in collaborative mode with one user typing and
    another user insert figure middle of the text in two different threads.
    """
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

    def add_figure(self, driver):
        button = driver.find_element_by_xpath(
            '//*[@id="button-figure"]')
        button.click()

        caption = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CLASS_NAME, "caption"))
        )

        self.input_text(caption, "My figure")

        # click on 'Insert image' button
        driver.find_element_by_xpath(
            '//*[@id="insertFigureImage"]').click()

        upload_button = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, 'selectImageUploadButton'))
        )

        upload_button.click()

        # image path
        imagePath = os.path.join(
            settings.PROJECT_PATH,
            'document/tests/uploads/image.png'
        )

        # inorder to select the image we send the image path in the
        # LOCAL MACHINE to the input tag
        upload_image_url = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located(
                (By.XPATH, '//*[@id="uploadimage"]/form/div[1]/input[2]')
            )
        )
        upload_image_url.send_keys(imagePath)

        # click on 'Upload' button
        driver.find_element_by_xpath(
            '//*[contains(@class, "ui-button") and text()="Upload"]').click()

        # click on 'Use image' button
        WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable(
                (By.CSS_SELECTOR, '#select_imagelist tr.checked')
            )
        )

        driver.find_element_by_xpath(
            '//*[@id="selectImageSelectionButton"]').click()

        # click on 'Insert' button
        driver.find_element_by_xpath(
            '/html/body/div[5]/div[3]/div/button[1]').click()

    def get_image(self, driver):
        figure = driver.find_element_by_xpath(
            '//*[@id="document-contents"]/figure'
        )
        image = figure.find_elements_by_tag_name('img')

        return image

    def get_caption(self, driver):
        caption = driver.find_element_by_xpath(
            '//*[@id="document-contents"]/figure/figcaption/span[2]'
        )

        return caption.text

    def test_insertFigure(self):
        self.loadDocumentEditor(self.driver, self.doc)
        self.loadDocumentEditor(self.driver2, self.doc)

        self.add_title(self.driver)

        document_input = self.driver.find_element_by_xpath(
            '//*[@class="ProseMirror-content"]'
        )

        # Total: 22
        self.driver.execute_script(
            'window.theEditor.pm.setTextSelection(22,22)')

        p1 = multiprocessing.Process(
            target=self.input_text,
            args=(document_input, self.TEST_TEXT)
        )
        p1.start()

        # Wait for the first processor to write some text
        self.wait_for_doc_size(self.driver2, 32)

        # without clicking on content the buttons will not work
        content = self.driver2.find_element_by_xpath(
            '//*[@class="ProseMirror-content"]'
        )
        content.click()

        self.driver2.execute_script(
            'window.theEditor.pm.setTextSelection(27,27)')

        p2 = multiprocessing.Process(
            target=self.add_figure,
            args=(self.driver2,)
        )
        p2.start()
        p1.join()
        p2.join()

        self.assertEqual(
            1,
            len(self.get_image(self.driver2))
        )

        self.assertEqual(
            len(self.get_image(self.driver)),
            len(self.get_image(self.driver2))
        )

        self.assertEqual(
            9,
            len(self.get_caption(self.driver2))
        )
        self.assertEqual(
            len(self.get_caption(self.driver)),
            len(self.get_caption(self.driver2))
        )


class AddCiteTest(LiveTornadoTestCase, ThreadManipulator):
    """
    Test typing in collaborative mode with one user typing and
    another user add cite in two different threads.
    """
    TEST_TEXT = "Lorem ipsum dolor sit amet."
    # Load bibliography data
    fixtures = ["initial_bib_rules.json", ]

    def setUp(self):
        self.getDrivers()
        self.user = self.createUser()
        self.loginUser(self.driver)
        self.loginUser(self.driver2)
        self.doc = self.createNewDocument()

    def tearDown(self):
        self.driver.quit()
        self.driver2.quit()

    def add_citation(self, driver):
        button = driver.find_element_by_id('button-cite')
        button.click()

        # click on 'Register new source' button
        register_new_source = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located(
                (By.CLASS_NAME, 'register-new-bib-source')
            )
        )
        register_new_source.click()

        # select source
        select_source = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, 'source-type-selection'))
        )
        select_source.click()

        # click on article
        driver.find_element_by_xpath(
            '//*[@id="source-type-selection"]/div/ul/li[1]/span').click()

        # fill the values
        title_of_publication = driver.find_element_by_xpath(
            '//*[@id="id_eFieldjournaltitle"]')
        title_of_publication.click()
        title_of_publication.send_keys("My publication title")

        title = driver.find_element_by_xpath(
            '//*[@id="id_eFieldtitle"]')
        title.click()
        title.send_keys("My title")

        author_firstName = driver.find_element_by_xpath(
            '//*[@id="optionTab1"]/table/tbody/tr[3]/td/div/input[1]')
        author_firstName.click()
        author_firstName.send_keys("John")

        author_lastName = driver.find_element_by_xpath(
            '//*[@id="optionTab1"]/table/tbody/tr[3]/td/div/input[2]')
        author_lastName.click()
        author_lastName.send_keys("Doe")

        publication_date = driver.find_element_by_xpath(
            '//*[@id="optionTab1"]/table/tbody' +
            '/tr[4]/td/table/tbody/tr/td[3]/input'
        )
        publication_date.click()
        publication_date.send_keys("2012")

        # click on Submit button
        driver.find_element_by_xpath(
            '//*[contains(@class, "ui-button") and text()="Submit"]').click()

        # Wait for source to be listed
        WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable(
                (
                    By.CSS_SELECTOR,
                    '#selected-cite-source-table .selected-source'
                )
            )
        )

        # click on Insert button
        driver.find_element_by_css_selector('.insert-citation').click()

    def get_citation_within_text(self, driver):
        cite_within_doc = driver.find_element_by_xpath(
            '//*[@id="document-contents"]/p[1]/span[2]'
        )
        return cite_within_doc.text

    def get_citation_bib(self, driver):
        cite_bib = driver.find_element_by_xpath(
            '//*[@id="document-bibliography"]'
        )
        return cite_bib.text

    def test_citation(self):
        self.loadDocumentEditor(self.driver, self.doc)
        self.loadDocumentEditor(self.driver2, self.doc)

        self.add_title(self.driver)

        document_input = self.driver.find_element_by_xpath(
            '//*[@class="ProseMirror-content"]'
        )

        # Total: 22
        self.driver.execute_script(
            'window.theEditor.pm.setTextSelection(22,22)')

        p1 = multiprocessing.Process(
            target=self.input_text,
            args=(document_input, self.TEST_TEXT)
        )
        p1.start()

        # Wait for the first processor to write some text
        self.wait_for_doc_size(self.driver2, 32)

        # without clicking on content the buttons will not work
        content = self.driver2.find_element_by_xpath(
            '//*[@class="ProseMirror-content"]'
        )
        content.click()

        self.driver2.execute_script(
            'window.theEditor.pm.setTextSelection(27,27)')

        p2 = multiprocessing.Process(
            target=self.add_citation,
            args=(self.driver2,)
        )
        p2.start()
        p1.join()
        p2.join()

        self.wait_for_doc_sync(self.driver, self.driver2)

        self.assertEqual(
            10,
            len(self.get_citation_within_text(self.driver2))
        )

        self.assertEqual(
            len(self.get_citation_within_text(self.driver)),
            len(self.get_citation_within_text(self.driver2))
        )

        self.assertEqual(
            46,
            len(self.get_citation_bib(self.driver))
        )

        self.assertEqual(
            len(self.get_citation_bib(self.driver)),
            len(self.get_citation_bib(self.driver2))
        )

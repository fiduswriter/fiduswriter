import unittest
import time
from selenium import webdriver
from random import randrange
from selenium.webdriver.common.keys import Keys
import os

SERVER_IP_ADDRESS = os.environ.get('FIDUS_GESIS_SERVER')
SERVER_ADDRESS = 'http://{}/account/login/?next=/'.format(SERVER_IP_ADDRESS)

USERNAME = os.environ.get('FIDUS_USERNAME')
PASSWORD = os.environ.get('FIDUS_PASSWORD')


class TypingTest(unittest.TestCase):
    TEST_TEXT = "Lorem ipsum dolor sit amet, "  \
                "consectetur adipiscing elit. Sed lobortis tellus urna, quis semper ante " \
                "tristique sodales. Vestibulum bibendum ligula elit, eget ultricies turpis finibus sit amet. Integer " \
                "bibendum neque in aliquam vehicula. Donec finibus lacinia mauris et dictum. Ut interdum, nibh ut finibus " \
                "finibus, sapien nisi pretium nulla, non scelerisque tortor tortor a nunc. Etiam feugiat metus ac varius" \
                " sagittis. Nam nec lectus consectetur, posuere dolor et, tincidunt tellus. Aenean augue mauris," \
                " porta eu scelerisque quis, elementum at nunc. Aliquam malesuada erat pellentesque enim aliquet," \
                " scelerisque auctor neque dapibus. Vivamus justo sem, efficitur nec elit nec, malesuada congue" \
                " lectus. Morbi ipsum turpis, cursus eget arcu non, ultricies faucibus lorem. Suspendisse est dui," \
                " tristique ac elit non, maximus condimentum justo. Sed sit amet risus sapien. Phasellus hendrerit" \
                " efficitur rhoncus. Etiam in consectetur dui. Sed fermentum mauris ut metus molestie, ac porttitor" \
                " ex ullamcorper."

    def setUp(self):
        self.driver = webdriver.Chrome()

    def test_typing(self):
        URL = SERVER_ADDRESS
        self.driver.get(URL)
        user_id = self.driver.find_element_by_id('id_login')
        user_pw = self.driver.find_element_by_id('id_password')
        user_id.send_keys(USERNAME)
        user_pw.send_keys(PASSWORD)
        login_button = self.driver.find_element_by_css_selector(
            'button[type="submit"]')
        login_button.click()
        time.sleep(1)
        try:
            ok = self.driver.find_element_by_class_name('ui-button')
            ok.click()
        except:
            print("There is no pop up!")

        # create_new_button = driver.find_element_by_class_name('createNew') # IT WILL CATCH THE CREATE NEW DOCUMENT BUTTON
        # create_new_button.click()

        shared_doc_button = self.driver.find_element_by_class_name(
            'doc-title')  # IT WILL CATCH FIRST DOCUMENT IN THE TABLE
        shared_doc_button.click()
        time.sleep(3)
        document_title = self.driver.find_element_by_xpath(
            '//*[@class="ProseMirror-content"]')
        # document_title.click()
        self.driver.execute_script(
            'document.getElementsByClassName("ProseMirror-content")[0].click();')  # <- This one works better

        print("Clicked on ProseMirror-content")
        time.sleep(2)
        # Just delete the current title and type new one
        try:
            title_size = int(self.driver.find_element_by_xpath(
                '//*[@id="document-title"]/span').get_attribute("pm-size"))
            print "Number of characters in title = ", title_size
            title = self.driver.find_element_by_xpath(
                '//*[@id="document-title"]/span').text

            for i in range(title_size):
                document_title.send_keys(Keys.ARROW_RIGHT)
            time.sleep(1)
            for i in range(title_size + 1):
                document_title.send_keys(Keys.BACKSPACE)
        except Exception as e:
            print e
            print "Untitled"

        for char in "My title":
            document_title.send_keys(char)
            time.sleep(randrange(1, 20) / 10.0)
        # Chrome with selenium have problem with focus element ( it cannot focus on content part ), I decided to use
        # Right Arrow to continue typing in content part
        document_title.send_keys(Keys.ARROW_RIGHT)

        try:
            # document_contents = driver.find_element_by_xpath('//*[@id="document-contents"]/p/span')
            content_size = len(self.driver.find_element_by_xpath(
                '//*[@id="document-contents"]').text)
            # content_size = int(document_contents.get_attribute("pm-size"))
            print "content_size = ", content_size
            document_contents = document_title
            for i in range(content_size + 1):
                document_contents.send_keys(Keys.ARROW_RIGHT)
            document_contents.send_keys(Keys.SPACE)
        except:
            document_contents = document_title
            print "No Content"

        time.sleep(3)
        for char in self.TEST_TEXT:
            document_contents.send_keys(char)
            time.sleep(randrange(1, 20) / 10.0)
        time.sleep(5)  # Let the user actually see something!

    def tearDown(self):
        self.driver.quit()


class SelectAndChange(unittest.TestCase):
    start_character = 5
    end_character = 10
    em_or_span_or_strong = 'span'  # PROCESS WILL PERFORM ON THIS TAG
    # 0 IS THE FIRST SELECTED TAG ( PLEASE CHECK THE PAGE SOURCE TO PICK THE
    # ELEMENT THAT YOU WANT )
    tag_number = 0
    button_id = "button-italic"
    #button_id = "button-bold"

    def setUp(self):
        self.driver = webdriver.Chrome()

    def Login(self, URL, userName, password):
        self.driver.get(URL)
        user_id = self.driver.find_element_by_id('id_login')
        user_pw = self.driver.find_element_by_id('id_password')
        user_id.send_keys(userName)
        user_pw.send_keys(password)
        login_button = self.driver.find_element_by_css_selector(
            'button[type="submit"]')
        login_button.click()
        time.sleep(1)
        userIdFromPage = self.driver.find_element_by_class_name("fw-name").text
        # print userIdFromPage == userName
        # return driver

    def test_selection_and_change(self):
        URL = SERVER_ADDRESS

        self.Login(URL, USERNAME, PASSWORD)

        time.sleep(1)
        try:
            ok = self.driver.find_element_by_class_name('ui-button')
            ok.click()
        except:
            print("There is no pop up!")

        shared_doc_button = self.driver.find_element_by_class_name(
            'doc-title')  # IT WILL CATCH FIRST DOCUMENT IN THE TABLE
        shared_doc_button.click()
        time.sleep(3)
        script = """
                start = arguments[0];
                end = arguments[1];
                tag = arguments[2];
                tagNumber = arguments[3];
                SelectText(start,end, tag);
                function SelectText(start, end, tag) {
                    var element_id = 'document-contents',
                    doc = document,
                    element = document.getElementById(element_id),
                    range, selection;
                     if (doc.body.createTextRange) {
                     range = document.body.createTextRange();
                     range.moveToElementText(text);
                     range.select();
                     } else if (window.getSelection) {
                        if ( tag=='span' && element.querySelectorAll('span:not([pm-inner-offset])')[tagNumber]) {
                        element = element.querySelectorAll('span:not([pm-inner-offset]):not(.footnote-marker)')[tagNumber];
                        console.log(element);
                    } else if (tag=='em')  {
                        if (element.getElementsByTagName('em')[tagNumber].children[0].tagName == "STRONG"){
                            element = element.getElementsByTagName('em')[0].getElementsByTagName('strong')[tagNumber];
                        } else {
                                element = element.getElementsByTagName('em')[tagNumber];
                          }
                       } else if (tag=='strong'){
                            element = element.getElementsByTagName('strong')[tagNumber];
                        }

                    var textNode = element.firstChild;
                    selection = window.getSelection();
                    range = document.createRange();

                    if (start < 0){
                        start = 0
                        range.setStart(textNode, start);
                    } else {
                        range.setStart(textNode, start);
                    }
                    if (end >= textNode.length ){
                        range.setEnd(textNode, textNode.length);
                    } else {
                        range.setEnd(textNode, end);
                    }
                    selection.removeAllRanges();
                    selection.addRange(range);
                    }
                }
            """
        try:
            self.driver.execute_script(
                script,
                self.start_character,
                self.end_character,
                self.em_or_span_or_strong,
                self.tag_number)
            time.sleep(2)
        except Exception as e:
            print e
            self.driver.close()

        button = self.driver.find_element_by_xpath(
            '//*[@id="{}"]'.format(self.button_id))
        button.click()
        time.sleep(2)
        self.driver.find_element_by_id('document-contents').click()
        time.sleep(10)

    def tearDown(self):
        self.driver.quit()


class SelectAndMakeNumberedlist(unittest.TestCase):
    start_character = 5
    end_character = 10
    em_or_span_or_strong = 'span'  # PROCESS WILL PERFORM ON THIS TAG
    # 0 IS THE FIRST SELECTED TAG ( PLEASE CHECK THE PAGE SOURCE TO PICK THE
    # ELEMENT THAT YOU WANT )
    tag_number = 0

    button_id = "button-ol"

    def setUp(self):
        self.driver = webdriver.Chrome()

    def Login(self, URL, userName, password):
        self.driver.get(URL)
        user_id = self.driver.find_element_by_id('id_login')
        user_pw = self.driver.find_element_by_id('id_password')
        user_id.send_keys(userName)
        user_pw.send_keys(password)
        login_button = self.driver.find_element_by_css_selector(
            'button[type="submit"]')
        login_button.click()
        time.sleep(1)
        userIdFromPage = self.driver.find_element_by_class_name("fw-name").text
        # print userIdFromPage == userName
        # return driver

    def test_MakeNumberedlist(self):
        URL = SERVER_ADDRESS
        self.Login(URL, USERNAME, PASSWORD)

        time.sleep(1)
        try:
            ok = self.driver.find_element_by_class_name('ui-button')
            ok.click()
        except:
            print("There is no pop up!")

        shared_doc_button = self.driver.find_element_by_class_name(
            'doc-title')  # IT WILL CATCH FIRST DOCUMENT IN THE TABLE
        shared_doc_button.click()
        time.sleep(3)
        script = """
        start = arguments[0];
        end = arguments[1];
        tag = arguments[2];
        tagNumber = arguments[3];
        SelectText(start,end, tag);
        function SelectText(start, end, tag) {
            var element_id = 'document-contents', doc = document, element = document.getElementById(element_id), range, selection;
             if (doc.body.createTextRange) {
             range = document.body.createTextRange();
             range.moveToElementText(text);
             range.select();
             } else if (window.getSelection) {
              if (tag=='span' && element.parentElement.parentNode.parentNode.tagName != "OL")  {
                    element = element.querySelectorAll('span:not([pm-inner-offset]):not(.footnote-marker)')[tagNumber];
               }  else if (tag=='em' && element.parentElement.parentNode.parentNode.tagName != "OL")  {
                    element = element.getElementsByTagName('em')[tagNumber];
               } else if (tag=='strong' && element.parentElement.parentNode.parentNode.tagName != "OL"){
                    element = element.getElementsByTagName('strong')[tagNumber];
                } else if (tag=='ol'){
                    element = element.getElementsByTagName('ol')[0].getElementsByTagName('span')[tagNumber];
               }

            var textNode = element.firstChild;
            selection = window.getSelection();
            range = document.createRange();

            if (start < 0 || start >= textNode.length){
                start = 0
                range.setStart(textNode, start);
            } else {
                range.setStart(textNode, start);
            }
            if (end >= textNode.length ){
                range.setEnd(textNode, textNode.length);
            } else {
                range.setEnd(textNode, end);
            }
            selection.removeAllRanges();
            selection.addRange(range);
            }
        }
        """

        try:
            self.driver.execute_script(
                script,
                self.start_character,
                self.end_character,
                self.em_or_span_or_strong,
                self.tag_number)
            time.sleep(2)
        except Exception as e:
            print e
            self.driver.close()

        button = self.driver.find_element_by_xpath(
            '//*[@id="{}"]'.format(self.button_id))
        button.click()
        time.sleep(2)
        self.driver.find_element_by_id('document-contents').click()
        time.sleep(5)

        # print 'Execute for second time it should remove the tag ????!!!!'
        # self.driver.find_element_by_id('document-contents').click()
        # try:
        #     self.driver.execute_script(script, self.start_character, self.end_character, self.em_or_span_or_strong,
        #                                self.tag_number)
        #     time.sleep(2)
        # except Exception as e:
        #     print e
        #     self.driver.close()
        #
        # button = self.driver.find_element_by_xpath('//*[@id="{}"]'.format(self.button_id))
        # button.click()
        # time.sleep(2)

        document_title = self.driver.find_element_by_xpath(
            '//*[@class="ProseMirror-content"]')
        self.driver.execute_script(
            'document.getElementsByClassName("ProseMirror-content")[0].click();')

        document_title.send_keys(Keys.ARROW_RIGHT)
        document_title.send_keys(Keys.ENTER)
        time.sleep(5)

        try:
            numberedLists = self.driver.find_element_by_id(
                'document-contents').find_element_by_tag_name('ol').find_elements_by_tag_name('li')
        except:
            self.assertRaises("can not find element")
        self.assertEqual(
            len(numberedLists),
            2,
            "There Should be 2  ( <li> element! )")

    def tearDown(self):
        self.driver.quit()


class SelectAndMakeBulletedlist(unittest.TestCase):
    start_character = 5
    end_character = 10
    em_or_span_or_strong = 'span'  # PROCESS WILL PERFORM ON THIS TAG
    # 0 IS THE FIRST SELECTED TAG ( PLEASE CHECK THE PAGE SOURCE TO PICK THE
    # ELEMENT THAT YOU WANT )
    tag_number = 0
    button_id = "button-ul"

    def setUp(self):
        self.driver = webdriver.Chrome()

    def Login(self, URL, userName, password):
        self.driver.get(URL)
        user_id = self.driver.find_element_by_id('id_login')
        user_pw = self.driver.find_element_by_id('id_password')
        user_id.send_keys(userName)
        user_pw.send_keys(password)
        login_button = self.driver.find_element_by_css_selector(
            'button[type="submit"]')
        login_button.click()
        time.sleep(1)
        userIdFromPage = self.driver.find_element_by_class_name("fw-name").text
        # print userIdFromPage == userName
        # return driver

    def test_MakeBulletedlist(self):
        URL = SERVER_ADDRESS

        self.Login(URL, USERNAME, PASSWORD)
        time.sleep(1)
        try:
            ok = self.driver.find_element_by_class_name('ui-button')
            ok.click()
        except:
            print("There is no pop up!")

        shared_doc_button = self.driver.find_element_by_class_name(
            'doc-title')  # IT WILL CATCH FIRST DOCUMENT IN THE TABLE
        shared_doc_button.click()
        time.sleep(3)
        script = """
        start = arguments[0];
        end = arguments[1];
        tag = arguments[2];
        tagNumber = arguments[3];
        SelectText(start,end, tag);
        function SelectText(start, end, tag) {
            var element_id = 'document-contents', doc = document,
            element = document.getElementById(element_id), range, selection;
             if (doc.body.createTextRange) {
             range = document.body.createTextRange();
             range.moveToElementText(text);
             range.select();
             } else if (window.getSelection) {
              if (tag=='span' && element.parentElement.parentNode.parentNode.tagName != "UL")  {
               element = element.querySelectorAll('span:not([pm-inner-offset]):not(.footnote-marker)')[tagNumber];
               }  else if (tag=='em' && element.parentElement.parentNode.parentNode.tagName != "UL")  {
               element = element.getElementsByTagName('em')[tagNumber];
               } else if (tag=='strong' && element.parentElement.parentNode.parentNode.tagName != "UL"){
                    element = element.getElementsByTagName('strong')[tagNumber];
                } else if (tag=='ul'){
                element = element.getElementsByTagName('ul')[0].getElementsByTagName('span')[tagNumber];
               }

            var textNode = element.firstChild;
            selection = window.getSelection();
            range = document.createRange();

            if (start < 0 || start >= textNode.length){
                start = 0
                range.setStart(textNode, start);
            } else {
                range.setStart(textNode, start);
            }
            if (end >= textNode.length ){
                range.setEnd(textNode, textNode.length);
            } else {
                range.setEnd(textNode, end);
            }
            selection.removeAllRanges();
            selection.addRange(range);
            }
        }
        """

        try:
            self.driver.execute_script(
                script,
                self.start_character,
                self.end_character,
                self.em_or_span_or_strong,
                self.tag_number)
            time.sleep(2)
        except Exception as e:
            print e
            self.driver.close()

        self.driver.find_element_by_xpath(
            '//*[@id="{}"]'.format(self.button_id)).click()
        time.sleep(2)
        self.driver.find_element_by_id('document-contents').click()
        time.sleep(10)

        # ==============================
        # print 'Execute for second time it should remove the tag BUT???!!!'
        # self.driver.find_element_by_id('document-contents').click()
        # try:
        #     self.driver.execute_script(script, self.start_character, self.end_character - 10 , 'ul',
        #                                self.tag_number)
        #     time.sleep(2)
        # except Exception as e:
        #     print e
        #     self.driver.close()
        #
        # button = self.driver.find_element_by_xpath('//*[@id="{}"]'.format(self.button_id))
        # button.click()
        # time.sleep(2)
        # ============================
        document_title = self.driver.find_element_by_xpath(
            '//*[@class="ProseMirror-content"]')
        self.driver.execute_script(
            'document.getElementsByClassName("ProseMirror-content")[0].click();')

        document_title.send_keys(Keys.ARROW_RIGHT)
        document_title.send_keys(Keys.ENTER)
        time.sleep(5)
        numberedLists = self.driver.find_element_by_id(
            'document-contents').find_element_by_tag_name('ul').find_elements_by_tag_name('li')

        self.assertEqual(
            len(numberedLists),
            2,
            "There Should be 2 bullet ( <li> element! )")

    def tearDown(self):
        self.driver.quit()


class SelectAndMakeQuoted(unittest.TestCase):
    start_character = 5
    end_character = 10
    em_or_span_or_strong = 'span'  # PROCESS WILL PERFORM ON THIS TAG
    # 0 IS THE FIRST SELECTED TAG ( PLEASE CHECK THE PAGE SOURCE TO PICK THE
    # ELEMENT THAT YOU WANT )
    tag_number = 0
    button_id = "button-blockquote"

    def setUp(self):
        self.driver = webdriver.Chrome()

    def Login(self, URL, userName, password):
        self.driver.get(URL)
        user_id = self.driver.find_element_by_id('id_login')
        user_pw = self.driver.find_element_by_id('id_password')
        user_id.send_keys(userName)
        user_pw.send_keys(password)
        login_button = self.driver.find_element_by_css_selector(
            'button[type="submit"]')
        login_button.click()
        time.sleep(1)
        userIdFromPage = self.driver.find_element_by_class_name("fw-name").text
        # print userIdFromPage == userName
        # return driver

    def test_MakeQuoted(self):
        URL = SERVER_ADDRESS
        print(USERNAME, PASSWORD)
        self.Login(URL, USERNAME, PASSWORD)
        time.sleep(1)
        try:
            ok = self.driver.find_element_by_class_name('ui-button')
            ok.click()
        except:
            print("There is no pop up!")

        shared_doc_button = self.driver.find_element_by_class_name(
            'doc-title')  # IT WILL CATCH FIRST DOCUMENT IN THE TABLE
        shared_doc_button.click()
        time.sleep(3)
        script = """
        start = arguments[0];
        end = arguments[1];
        tag = arguments[2];
        tagNumber = arguments[3];
        SelectText(start,end, tag);
        function SelectText(start, end, tag) {
            var element_id = 'document-contents', doc = document,
            element = document.getElementById(element_id), range, selection;
             if (doc.body.createTextRange) {
             range = document.body.createTextRange();
             range.moveToElementText(text);
             range.select();
             } else if (window.getSelection) {
              if (tag=='span')  {
               element = element.querySelectorAll('span:not(.footnote-marker)')[tagNumber];
               }  else if (tag=='em')  {
               element = element.getElementsByTagName('em')[tagNumber];
               } else if (tag=='strong'){
                    element = element.getElementsByTagName('strong')[tagNumber];
                } else if (tag=='blockquote'){
                element = element.getElementsByTagName('blockquote')[0].getElementsByTagName('span')[tagNumber];
               }

            var textNode = element.firstChild;
            selection = window.getSelection();
            range = document.createRange();

            if (start < 0 || start >= textNode.length){
                start = 0
                range.setStart(textNode, start);
            } else {
                range.setStart(textNode, start);
            }
            if (end >= textNode.length ){
                range.setEnd(textNode, textNode.length);
            } else {
                range.setEnd(textNode, end);
            }
            selection.removeAllRanges();
            selection.addRange(range);
            }
        }
        """

        try:
            self.driver.execute_script(
                script,
                self.start_character,
                self.end_character,
                self.em_or_span_or_strong,
                self.tag_number)
            time.sleep(2)
        except Exception as e:
            print e
            self.driver.close()

        button = self.driver.find_element_by_xpath(
            '//*[@id="{}"]'.format(self.button_id))
        button.click()
        time.sleep(3)

        # ==== CHECK THE LIMITATION OF TOTAL NUMBER OF CLICK ON QUOTE BUTTON
        print "Check the limitation..."
        button = self.driver.find_element_by_xpath(
            '//*[@id="{}"]'.format(self.button_id))
        numberOfRepeat = 20
        for _ in range(numberOfRepeat):
            button.click()
        time.sleep(5)
        # ====================

        self.driver.find_element_by_id('document-contents').click()
        time.sleep(5)

        blockquoteList = self.driver.find_element_by_id(
            "document-contents").find_elements_by_tag_name("blockquote")
        self.assertLess(
            len(blockquoteList),
            numberOfRepeat,
            "There is no limitation for number of BlockQuotes!")

    def tearDown(self):
        self.driver.quit()


class SelectAndLink(unittest.TestCase):
    start_character = 5
    end_character = 10
    em_or_span_or_strong = 'span'  # PROCESS WILL PERSORM ON THIS TAG
    # 0 IS THE FIRST SELECTED TAG ( PLEASE CHECK THE PAGE SOURCE TO PICK THE
    # ELEMENT THAT YOU WANT )
    tag_number = 0

    button_id = "button-link"

    def setUp(self):
        self.driver = webdriver.Chrome()

    def Login(self, URL, userName, password):
        self.driver.get(URL)
        user_id = self.driver.find_element_by_id('id_login')
        user_pw = self.driver.find_element_by_id('id_password')
        user_id.send_keys(userName)
        user_pw.send_keys(password)
        login_button = self.driver.find_element_by_css_selector(
            'button[type="submit"]')
        login_button.click()
        time.sleep(1)
        userIdFromPage = self.driver.find_element_by_class_name("fw-name").text
        # print userIdFromPage == userName
        # return driver

    def test_addLink(self):
        URL = SERVER_ADDRESS

        self.Login(URL, USERNAME, PASSWORD)
        time.sleep(1)
        try:
            ok = self.driver.find_element_by_class_name('ui-button')
            ok.click()
        except:
            print("There is no pop up!")

        shared_doc_button = self.driver.find_element_by_class_name(
            'doc-title')  # IT WILL CATCH FIRST DOCUMENT IN THE TABLE
        shared_doc_button.click()
        time.sleep(3)

        old_links = self.driver.find_element_by_id(
            'document-contents').find_elements_by_tag_name('a')

        script = """
        start = arguments[0];
        end = arguments[1];
        tag = arguments[2];
        tagNumber = arguments[3];
        SelectText(start,end, tag);
        function SelectText(start, end, tag) {
            var element_id = 'document-contents', doc = document,
            element = document.getElementById(element_id), range, selection;
             if (doc.body.createTextRange) {
             range = document.body.createTextRange();
             range.moveToElementText(text);
             range.select();
             } else if (window.getSelection) {
              if (tag=='span')  {
               element = element.querySelectorAll('span:not(.footnote-marker)')[tagNumber];
               }  else if (tag=='em')  {
               element = element.getElementsByTagName('em')[tagNumber];
               } else if (tag=='strong'){
                    element = element.getElementsByTagName('strong')[tagNumber];
                } else if (tag=='blockquote'){
                element = element.getElementsByTagName('blockquote')[0].getElementsByTagName('span')[tagNumber];
               }

            var textNode = element.firstChild;
            selection = window.getSelection();
            range = document.createRange();

            if (start < 0 || start >= textNode.length){
                start = 0
                range.setStart(textNode, start);
            } else {
                range.setStart(textNode, start);
            }
            if (end >= textNode.length ){
                range.setEnd(textNode, textNode.length);
            } else {
                range.setEnd(textNode, end);
            }
            selection.removeAllRanges();
            selection.addRange(range);
            }
        }
        """

        try:
            self.driver.execute_script(
                script,
                self.start_character,
                self.end_character,
                self.em_or_span_or_strong,
                self.tag_number)
            time.sleep(2)
        except Exception as e:
            print e
            self.driver.close()

        button = self.driver.find_element_by_xpath(
            '//*[@id="{}"]'.format(self.button_id))
        button.click()
        time.sleep(2)

        time.sleep(2)
        self.driver.find_element_by_class_name('linktitle').click()
        linktitle = self.driver.find_element_by_class_name('linktitle')

        for char in "Test link":
            linktitle.send_keys(char)
            time.sleep(randrange(1, 20) / 10.0)

        link = self.driver.find_element_by_class_name('link')
        for char in "example.com":
            link.send_keys(char)
            time.sleep(randrange(1, 20) / 10.0)
        self.driver.find_element_by_xpath(
            "/html/body/div[5]/div[3]/div/button[1]").click()

        self.driver.find_element_by_id('document-contents').click()
        time.sleep(10)

        links = self.driver.find_element_by_id(
            'document-contents').find_elements_by_tag_name('a')

        self.assertEqual(len(links), len(old_links) +
                         1, "There should be one more <a> tag in text!")
        # TODO: Remove the added link

    def tearDown(self):
        self.driver.quit()


class SelectAndAddComment(unittest.TestCase):
    start_character = 5
    end_character = 10
    em_or_span_or_strong = 'span'  # PROCESS WILL PERSORM ON THIS TAG
    # 0 IS THE FIRST SELECTED TAG ( PLEASE CHECK THE PAGE SOURCE TO PICK THE
    # ELEMENT THAT YOU WANT )
    tag_number = 1

    button_id = "button-comment"

    def setUp(self):
        self.driver = webdriver.Chrome()

    def Login(self, URL, userName, password):
        self.driver.get(URL)
        user_id = self.driver.find_element_by_id('id_login')
        user_pw = self.driver.find_element_by_id('id_password')
        user_id.send_keys(userName)
        user_pw.send_keys(password)
        login_button = self.driver.find_element_by_css_selector(
            'button[type="submit"]')
        login_button.click()
        time.sleep(1)
        userIdFromPage = self.driver.find_element_by_class_name("fw-name").text
        # print userIdFromPage == userName
        # return driver

    def test_addComment(self):
        URL = SERVER_ADDRESS

        self.Login(URL, USERNAME, PASSWORD)
        time.sleep(1)
        try:
            ok = self.driver.find_element_by_class_name('ui-button')
            ok.click()
        except:
            print("There is no pop up!")

        shared_doc_button = self.driver.find_element_by_class_name(
            'doc-title')  # IT WILL CATCH FIRST DOCUMENT IN THE TABLE
        shared_doc_button.click()
        time.sleep(3)

        old_comments = self.driver.find_elements_by_class_name('comment')

        script = """
        start = arguments[0];
        end = arguments[1];
        tag = arguments[2];
        tagNumber = arguments[3];
        SelectText(start,end, tag);
        function SelectText(start, end, tag) {
            var element_id = 'document-contents', doc = document,
            element = document.getElementById(element_id), range, selection;
             if (doc.body.createTextRange) {
             range = document.body.createTextRange();
             range.moveToElementText(text);
             range.select();
             } else if (window.getSelection) {
              if (tag=='span')  {
               element =element.querySelectorAll('span:not(.footnote-marker)')[tagNumber];
               }  else if (tag=='em')  {
               element = element.getElementsByTagName('em')[tagNumber];
               } else if (tag=='strong'){
                    element = element.getElementsByTagName('strong')[tagNumber];
                } else if (tag=='blockquote'){
                element = element.getElementsByTagName('blockquote')[0].getElementsByTagName('span')[tagNumber];
               }

            var textNode = element.firstChild;
            selection = window.getSelection();
            range = document.createRange();

            if (start < 0 || start >= textNode.length){
                start = 0
                range.setStart(textNode, start);
            } else {
                range.setStart(textNode, start);
            }
            if (end >= textNode.length ){
                range.setEnd(textNode, textNode.length);
            } else {
                range.setEnd(textNode, end);
            }
            selection.removeAllRanges();
            selection.addRange(range);
            }
        }
        """

        try:
            self.driver.execute_script(
                script,
                self.start_character,
                self.end_character,
                self.em_or_span_or_strong,
                self.tag_number)
            time.sleep(2)
        except Exception as e:
            print e
            self.driver.close()

        button = self.driver.find_element_by_xpath(
            '//*[@id="{}"]'.format(self.button_id))
        button.click()
        time.sleep(2)

        self.driver.find_element_by_class_name('commentText').click()
        # is_major = driver.find_element_by_class_name('comment_is_major')

        textArea = self.driver.find_element_by_class_name('commentText')
        for char in "This is a comment":
            textArea.send_keys(char)
            time.sleep(randrange(1, 20) / 10.0)
        self.driver.find_element_by_class_name("submitComment").click()

        self.driver.find_element_by_id('document-contents').click()
        time.sleep(10)

        comments = self.driver.find_element_by_id(
            'document-contents').find_elements_by_class_name('comment')
        self.assertEqual(
            len(comments),
            len(old_comments) + 1,
            "There should be one more comment in text!")

    def tearDown(self):
        self.driver.quit()


class SelectDeleteUndoRedo(unittest.TestCase):
    start_character = 5
    end_character = 20
    em_or_span_or_strong = 'span'  # PROCESS WILL PERSORM ON THIS TAG
    # 0 IS THE FIRST SELECTED TAG ( PLEASE CHECK THE PAGE SOURCE TO PICK THE
    # ELEMENT THAT YOU WANT )
    tag_number = 0

    def setUp(self):
        self.driver = webdriver.Chrome()

    def Login(self, URL, userName, password):
        self.driver.get(URL)
        user_id = self.driver.find_element_by_id('id_login')
        user_pw = self.driver.find_element_by_id('id_password')
        user_id.send_keys(userName)
        user_pw.send_keys(password)
        login_button = self.driver.find_element_by_css_selector(
            'button[type="submit"]')
        login_button.click()
        time.sleep(1)
        userIdFromPage = self.driver.find_element_by_class_name("fw-name").text
        # print userIdFromPage == userName
        # return driver

    def test_DeleteUndoRedo(self):
        URL = SERVER_ADDRESS

        self.Login(URL, USERNAME, PASSWORD)
        time.sleep(1)
        try:
            ok = self.driver.find_element_by_class_name('ui-button')
            ok.click()
        except:
            print("There is no pop up!")

        shared_doc_button = self.driver.find_element_by_class_name(
            'doc-title')  # IT WILL CATCH FIRST DOCUMENT IN THE TABLE
        shared_doc_button.click()
        time.sleep(3)
        script = """
        start = arguments[0];
        end = arguments[1];
        tag = arguments[2];
        tagNumber = arguments[3];
        SelectText(start,end, tag);
        function SelectText(start, end, tag) {
            var element_id = 'document-contents', doc = document,
            element = document.getElementById(element_id), range, selection;
             if (doc.body.createTextRange) {
             range = document.body.createTextRange();
             range.moveToElementText(text);
             range.select();
             } else if (window.getSelection) {
              if (tag=='span')  {
               element = element.querySelectorAll('span:not(.footnote-marker)')[tagNumber];
               }  else if (tag=='em')  {
               element = element.getElementsByTagName('em')[tagNumber];
               } else if (tag=='strong'){
                    element = element.getElementsByTagName('strong')[tagNumber];
                } else if (tag=='blockquote'){
                element = element.getElementsByTagName('blockquote')[0].getElementsByTagName('span')[tagNumber];
               }

            var textNode = element.firstChild;
            selection = window.getSelection();
            range = document.createRange();
            if (start < 0 || start >= textNode.length){
                start = 0
                range.setStart(textNode, start);
            } else {
                range.setStart(textNode, start);
            }
            if (end >= textNode.length ){
                range.setEnd(textNode, textNode.length);
            } else {
                range.setEnd(textNode, end);
            }
            selection.removeAllRanges();
            selection.addRange(range);
            }
        }
        """

        try:
            self.driver.execute_script(
                script,
                self.start_character,
                self.end_character,
                self.em_or_span_or_strong,
                self.tag_number)
            time.sleep(2)
        except Exception as e:
            print e
            self.driver.close()

        element = self.driver.find_element_by_class_name('ProseMirror-content')
        element.send_keys(Keys.BACKSPACE)
        time.sleep(3)

        button = self.driver.find_element_by_xpath(
            '//*[@id="{}"]'.format("button-undo"))
        button.click()
        time.sleep(3)

        button = self.driver.find_element_by_xpath(
            '//*[@id="{}"]'.format("button-redo"))
        button.click()
        time.sleep(3)

    def tearDown(self):
        self.driver.quit()


class AddFootnote(unittest.TestCase):
    position = 5
    em_or_span_or_strong = 'span'  # PROCESS WILL PERSORM ON THIS TAG
    # 0 IS THE FIRST SELECTED TAG ( PLEASE CHECK THE PAGE SOURCE TO PICK THE
    # ELEMENT THAT YOU WANT )
    tag_number = 0
    button_id = "button-comment"

    def setUp(self):
        self.driver = webdriver.Chrome()

    def Login(self, URL, userName, password):
        self.driver.get(URL)
        user_id = self.driver.find_element_by_id('id_login')
        user_pw = self.driver.find_element_by_id('id_password')
        user_id.send_keys(userName)
        user_pw.send_keys(password)
        login_button = self.driver.find_element_by_css_selector(
            'button[type="submit"]')
        login_button.click()
        time.sleep(1)
        userIdFromPage = self.driver.find_element_by_class_name("fw-name").text
        # print userIdFromPage == userName
        # return driver

    def test_addFootnote(self):
        URL = SERVER_ADDRESS

        self.Login(URL, USERNAME, PASSWORD)
        time.sleep(1)
        try:
            ok = self.driver.find_element_by_class_name('ui-button')
            ok.click()
        except:
            print("There is no pop up!")

        shared_doc_button = self.driver.find_element_by_class_name(
            'doc-title')  # IT WILL CATCH FIRST DOCUMENT IN THE TABLE
        shared_doc_button.click()
        time.sleep(3)
        script = """
        position = arguments[0];
        tag = arguments[1];
        tagNumber = arguments[2];
        SelectText(position, tag);
        function SelectText(position, tag) {
                var element_id = 'document-contents', doc = document,
                element = document.getElementById(element_id), range, selection;
                 if (doc.body.createTextRange) {
                 range = document.body.createTextRange();
                 range.moveToElementText(text);
                 range.select();
                 } else if (window.getSelection) {
                  if (tag=='span' && element.querySelectorAll('span:not(.footnote-marker)')[tagNumber])  {
                   element = element.querySelectorAll('span:not(.footnote-marker)')[tagNumber];
                   }  else if (tag=='em')  {
                   element = element.getElementsByTagName('em')[tagNumber];
                   } else if (tag=='strong'){
                        element = element.getElementsByTagName('strong')[tagNumber];
                    } else if (tag=='blockquote'){
                    element = element.getElementsByTagName('blockquote')[0].getElementsByTagName('span')[tagNumber];
                   }

                var textNode = element.firstChild;
                selection = window.getSelection();
                range = document.createRange();
                if (position < 0 || position >= textNode.length){
                    position = 0
                    range.setStart(textNode, position);
                } else {
                    range.setStart(textNode, position);
                }

                selection.removeAllRanges();
                selection.addRange(range);

                }
            }
        """

        try:
            self.driver.execute_script(
                script,
                self.position,
                self.em_or_span_or_strong,
                self.tag_number)
            time.sleep(2)
        except Exception as e:
            print e
            self.driver.close()

        button = self.driver.find_element_by_xpath(
            '//*[@id="{}"]'.format("button-footnote"))
        button.click()
        time.sleep(3)

        footnote_box = self.driver.find_element_by_id('footnote-box-container')
        footnote = footnote_box.find_element_by_class_name(
            'ProseMirror-content')
        footnote.click()

        for char in "This is a footnote Text.":
            footnote.send_keys(char)
            time.sleep(randrange(1, 20) / 10.0)

    def tearDown(self):
        self.driver.quit()


class InsertMath(unittest.TestCase):
    position = 5
    em_or_span_or_strong = 'span'  # PROCESS WILL PERSORM ON THIS TAG
    # 0 IS THE FIRST SELECTED TAG ( PLEASE CHECK THE PAGE SOURCE TO PICK THE
    # ELEMENT THAT YOU WANT )
    tag_number = 0

    button_id = "button-math"

    def setUp(self):
        self.driver = webdriver.Chrome()

    def Login(self, URL, userName, password):
        self.driver.get(URL)
        user_id = self.driver.find_element_by_id('id_login')
        user_pw = self.driver.find_element_by_id('id_password')
        user_id.send_keys(userName)
        user_pw.send_keys(password)
        login_button = self.driver.find_element_by_css_selector(
            'button[type="submit"]')
        login_button.click()
        time.sleep(1)
        userIdFromPage = self.driver.find_element_by_class_name("fw-name").text
        # print userIdFromPage == userName
        # return driver

    def test_insertMath(self):
        URL = SERVER_ADDRESS

        self.Login(URL, USERNAME, PASSWORD)
        time.sleep(1)
        try:
            ok = self.driver.find_element_by_class_name('ui-button')
            ok.click()
        except:
            print("There is no pop up!")

        shared_doc_button = self.driver.find_element_by_class_name(
            'doc-title')  # IT WILL CATCH FIRST DOCUMENT IN THE TABLE
        shared_doc_button.click()
        time.sleep(3)
        script = """
        position = arguments[0];
        tag = arguments[1];
        tagNumber = arguments[2];
        SelectText(position, tag);
        function SelectText(position, tag) {
                var element_id = 'document-contents', doc = document,
                element = document.getElementById(element_id), range, selection;
                 if (doc.body.createTextRange) {
                 range = document.body.createTextRange();
                 range.moveToElementText(text);
                 range.select();
                 } else if (window.getSelection) {
                  if (tag=='span' )  {
                   element = element.querySelectorAll('span:not(.footnote-marker)')[tagNumber];
                   }  else if (tag=='em')  {
                   element = element.getElementsByTagName('em')[tagNumber];
                   } else if (tag=='strong'){
                        element = element.getElementsByTagName('strong')[tagNumber];
                    } else if (tag=='blockquote'){
                    element = element.getElementsByTagName('blockquote')[0].getElementsByTagName('span')[tagNumber];
                   }

                var textNode = element.firstChild;
                selection = window.getSelection();
                range = document.createRange();
                if (position < 0){
                    position = 0
                    range.setStart(textNode, position);
                } if (position > textNode.length ){
                    range.setEnd(textNode, textNode.length);
                } else {
                    range.setStart(textNode, position);
                }

                selection.removeAllRanges();
                selection.addRange(range);

                }
            }
        """

        try:
            self.driver.execute_script(
                script,
                self.position,
                self.em_or_span_or_strong,
                self.tag_number)
            time.sleep(2)
        except Exception as e:
            print e
            self.driver.close()

        button = self.driver.find_element_by_xpath(
            '//*[@id="{}"]'.format(self.button_id))
        button.click()
        time.sleep(2)

        try:
            raw = self.driver.find_element_by_class_name(
                "ui-dialog-buttnset").find_element_by_link_text("Raw")
            raw.click()
        except:
            raw = self.driver.find_element_by_class_name(
                "ui-dialog-buttonset").find_elements_by_tag_name("button")[2]
            raw.click()

        input_math = self.driver.find_element_by_class_name("math-field")
        input_math.clear()
        input_math.send_keys("\$x=\frac{-b\pm{b^2-4ac}}{2a}")
        time.sleep(3)

        try:
            insert_btn = self.driver.find_element_by_class_name(
                "ui-dialog-buttnset").find_element_by_link_text("Insert")
            insert_btn.click()
        except:
            insert_btn = self.driver.find_element_by_class_name(
                "ui-dialog-buttonset").find_element_by_tag_name("button")
            insert_btn.click()

        time.sleep(5)

    def tearDown(self):
        self.driver.quit()


class InsertImage(unittest.TestCase):
    position = 0
    em_or_span_or_strong = 'span'  # PROCESS WILL PERSORM ON THIS TAG
    # 0 IS THE FIRST SELECTED TAG ( PLEASE CHECK THE PAGE SOURCE TO PICK THE
    # ELEMENT THAT YOU WANT )
    tag_number = 0

    def setUp(self):
        self.driver = webdriver.Chrome()

    def Login(self, URL, userName, password):
        self.driver.get(URL)
        user_id = self.driver.find_element_by_id('id_login')
        user_pw = self.driver.find_element_by_id('id_password')
        user_id.send_keys(userName)
        user_pw.send_keys(password)
        login_button = self.driver.find_element_by_css_selector(
            'button[type="submit"]')
        login_button.click()
        time.sleep(1)
        userIdFromPage = self.driver.find_element_by_class_name("fw-name").text
        # print userIdFromPage == userName
        # return driver

    def test_insertImage(self):
        URL = SERVER_ADDRESS

        self.Login(URL, USERNAME, PASSWORD)
        time.sleep(1)
        try:
            ok = self.driver.find_element_by_class_name('ui-button')
            ok.click()
        except:
            print("There is no pop up!")

        shared_doc_button = self.driver.find_element_by_class_name(
            'doc-title')  # IT WILL CATCH FIRST DOCUMENT IN THE TABLE
        shared_doc_button.click()
        time.sleep(3)
        script = """
        position = arguments[0];
        tag = arguments[1];
        tagNumber = arguments[2];
        SelectText(position, tag);
        function SelectText(position, tag) {
                var element_id = 'document-contents', doc = document,
                element = document.getElementById(element_id), range, selection;
                 if (doc.body.createTextRange) {
                 range = document.body.createTextRange();
                 range.moveToElementText(text);
                 range.select();
                 } else if (window.getSelection) {
                  if (tag=='span' && element.querySelectorAll('span:not(.footnote-marker)')[tagNumber])  {
                   element = element.querySelectorAll('span:not(.footnote-marker)')[tagNumber];
                   }  else if (tag=='em')  {
                   element = element.getElementsByTagName('em')[tagNumber];
                   } else if (tag=='strong'){
                        element = element.getElementsByTagName('strong')[tagNumber];
                    } else if (tag=='blockquote'){
                    element = element.getElementsByTagName('blockquote')[0].getElementsByTagName('span')[tagNumber];
                   }

                var textNode = element.firstChild;
                selection = window.getSelection();
                range = document.createRange();
                if (position < 0 || position >= textNode.length){
                    position = 0
                    range.setStart(textNode, position);
                } else {
                    range.setStart(textNode, position);
                }

                selection.removeAllRanges();
                selection.addRange(range);

                }
            }
        """
        try:
            self.driver.execute_script(
                script,
                self.position,
                self.em_or_span_or_strong,
                self.tag_number)
            time.sleep(2)
        except Exception as e:
            print e
            self.driver.close()

        button = self.driver.find_element_by_xpath(
            '//*[@id="{}"]'.format("button-figure"))
        button.click()
        time.sleep(3)

        caption = self.driver.find_element_by_class_name('caption')
        caption.send_keys("My figure")
        time.sleep(2)

        button = self.driver.find_element_by_xpath(
            '//*[@id="{}"]'.format("insertFigureImage"))
        button.click()
        time.sleep(2)

        image = self.driver.find_element_by_xpath(
            '//*[@id="Image_1"]/td[1]/img')
        image.click()
        time.sleep(2)

        self.driver.find_element_by_xpath(
            '//*[@id="{}"]'.format("selectImageSelectionButton")).click()
        time.sleep(2)

        self.driver.find_element_by_xpath(
            '/html/body/div[5]/div[3]/div/button[1]').click()
        time.sleep(10)

    def tearDown(self):
        self.driver.quit()


class AddCite(unittest.TestCase):
    position = 5
    em_or_span_or_strong = 'span'  # PROCESS WILL PERSORM ON THIS TAG
    # 0 IS THE FIRST SELECTED TAG ( PLEASE CHECK THE PAGE SOURCE TO PICK THE
    # ELEMENT THAT YOU WANT )
    tag_number = 0

    def setUp(self):
        self.driver = webdriver.Chrome()

    def Login(self, URL, userName, password):
        self.driver.get(URL)
        user_id = self.driver.find_element_by_id('id_login')
        user_pw = self.driver.find_element_by_id('id_password')
        user_id.send_keys(userName)
        user_pw.send_keys(password)
        login_button = self.driver.find_element_by_css_selector(
            'button[type="submit"]')
        login_button.click()
        time.sleep(1)
        userIdFromPage = self.driver.find_element_by_class_name("fw-name").text
        # print userIdFromPage == userName
        # return driver

    def test_addCite(self):
        URL = SERVER_ADDRESS

        self.Login(URL, USERNAME, PASSWORD)
        time.sleep(1)
        try:
            ok = self.driver.find_element_by_class_name('ui-button')
            ok.click()
        except:
            print("There is no pop up!")

        shared_doc_button = self.driver.find_element_by_class_name(
            'doc-title')  # IT WILL CATCH FIRST DOCUMENT IN THE TABLE
        shared_doc_button.click()
        time.sleep(3)
        script = """
        position = arguments[0];
        tag = arguments[1];
        tagNumber = arguments[2];
        SelectText(position, tag);
        function SelectText(position, tag) {
                var element_id = 'document-contents', doc = document,
                element = document.getElementById(element_id), range, selection;
                 if (doc.body.createTextRange) {
                 range = document.body.createTextRange();
                 range.moveToElementText(text);
                 range.select();
                 } else if (window.getSelection) {
                  if (tag=='span' && element.querySelectorAll('span:not(.footnote-marker)')[tagNumber])  {
                   element = element.querySelectorAll('span:not(.footnote-marker)')[tagNumber];
                   }  else if (tag=='em')  {
                   element = element.getElementsByTagName('em')[tagNumber];
                   } else if (tag=='strong'){
                        element = element.getElementsByTagName('strong')[tagNumber];
                    } else if (tag=='blockquote'){
                    element = element.getElementsByTagName('blockquote')[0].getElementsByTagName('span')[tagNumber];
                   }

               var textNode = element.firstChild;
                //var textNode = document.createTextNode(text);
                selection = window.getSelection();
                range = document.createRange();
                //range.selectNodeContents(element);
                if (position < 0 || position >= textNode.length){
                    position = 0
                    range.setStart(textNode, position);
                } else {
                    range.setStart(textNode, position);
                }

                selection.removeAllRanges();
                selection.addRange(range);

                }
            }
        """
        try:
            self.driver.execute_script(
                script,
                self.position,
                self.em_or_span_or_strong,
                self.tag_number)
            time.sleep(2)
        except Exception as e:
            print e
            self.driver.close()

        button = self.driver.find_element_by_xpath(
            '//*[@id="{}"]'.format("button-cite"))
        button.click()
        time.sleep(3)

        self.driver.find_element_by_class_name(
            'fw-document-table-title').click()
        time.sleep(2)

        self.driver.find_element_by_xpath('//*[@id="add-cite-book"]').click()
        time.sleep(2)

        self.driver.find_element_by_xpath(
            '/html/body/div[5]/div[3]/div/button[2]').click()

        time.sleep(5)

    def tearDown(self):
        self.driver.quit()


if __name__ == '__main__':
    unittest.main()

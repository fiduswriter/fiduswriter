import time
import os

from testing.testcases import LiveTornadoTestCase
from testing.selenium_helper import SeleniumHelper
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains

from django.core import mail
from django.conf import settings

from allauth.account.models import EmailConfirmationHMAC, EmailAddress


class EditorTest(LiveTornadoTestCase, SeleniumHelper):
    fixtures = [
        'initial_documenttemplates.json',
        'initial_styles.json',
    ]

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.base_url = cls.live_server_url
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
        self.verificationErrors = []
        self.accept_next_alert = True
        self.user1 = self.create_user(
            username='Yeti',
            email='yeti@snowman.com',
            passtext='otter'
        )

    def tearDown(self):
        self.leave_site(self.driver)

    def test_crossrefs_and_internal_links(self):
        self.driver.get(self.base_url)
        self.driver.find_element(By.ID, "id_login").send_keys("Yeti")
        self.driver.find_element(By.ID, "id_password").send_keys("otter")
        self.driver.find_element(By.ID, "login-submit").click()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.element_to_be_clickable(
                (
                    By.CSS_SELECTOR,
                    ".new_document button"
                )
            )
        ).click()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.CLASS_NAME, 'editor-toolbar'))
        )
        self.driver.find_element(By.CSS_SELECTOR, ".article-title").click()
        self.driver.find_element(By.CSS_SELECTOR, ".article-title").send_keys(
            "Test"
        )
        # We enable the abstract
        self.driver.find_element(
            By.CSS_SELECTOR,
            "#header-navigation > div:nth-child(3) > span"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            (
                "#header-navigation > div:nth-child(3) > div "
                "> ul > li:nth-child(1) > span"
            )
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            (
                "#header-navigation > div:nth-child(3) > div "
                "> ul > li:nth-child(1) > div > ul > li:nth-child(3) > span"
            )
        ).click()
        self.driver.find_element(By.CSS_SELECTOR, ".article-body").click()
        ActionChains(self.driver).send_keys(
            Keys.LEFT
        ).send_keys(
            "An abstract title"
        ).perform()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "#toolbar > div > div > div:nth-child(3) > div"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            (
                "#toolbar > div > div > div:nth-child(3) > div > div > "
                "ul > li:nth-child(4) > span > label"
            )
        ).click()
        # We type in th body
        self.driver.find_element(By.CSS_SELECTOR, ".article-body").send_keys(
            "Body"
        )
        # We add a figure
        button = self.driver.find_element_by_xpath('//*[@title="Figure"]')
        button.click()

        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.CLASS_NAME, "caption"))
        ).send_keys('Caption')
        self.driver.find_element_by_id("figure-category-btn").click()
        self.driver.find_element_by_id("figure-category-photo").click()

        # click on 'Insert image' button
        self.driver.find_element_by_id('insert-figure-image').click()

        upload_button = WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (
                    By.XPATH,
                    '//*[normalize-space()="Add new image"]'
                )
            )
        )

        upload_button.click()

        # image path
        image_path = os.path.join(
            settings.PROJECT_PATH,
            'document/tests/uploads/image.png'
        )

        # in order to select the image we send the image path in the
        # LOCAL MACHINE to the input tag
        upload_image_url = WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (By.XPATH, '//*[@id="editimage"]/div[1]/input[2]')
            )
        )
        upload_image_url.send_keys(image_path)

        # click on 'Upload' button
        self.driver.find_element_by_xpath(
            '//*[contains(@class, "ui-button") and normalize-space()="Upload"]'
        ).click()

        # click on 'Use image' button
        WebDriverWait(self.driver, self.wait_time).until(
            EC.element_to_be_clickable(
                (By.CSS_SELECTOR, '.fw-data-table i.fa-check')
            )
        )

        self.driver.find_element_by_xpath(
            '//*[normalize-space()="Use image"]'
        ).click()
        self.driver.find_element_by_css_selector("button.fw-dark").click()
        ActionChains(self.driver).send_keys(
            Keys.RIGHT
        ).perform()
        # We add a cross reference for the heading
        self.driver.find_element(
            By.CSS_SELECTOR,
            "#toolbar > div > div > div:nth-child(9) > button > span > i"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "#edit-link > div:nth-child(2) > select"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "#edit-link > div:nth-child(2) > select > option:nth-child(2)"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            (
                "body > div.ui-dialog.ui-corner-all.ui-widget."
                "ui-widget-content.ui-front.ui-dialog-buttons > "
                "div.ui-dialog-buttonpane.ui-widget-content."
                "ui-helper-clearfix > div > button.fw-dark."
                "fw-button.ui-button.ui-corner-all.ui-widget"
            )
        ).click()
        cross_reference = self.driver.find_element(
            By.CSS_SELECTOR,
            ".article-body .cross-reference"
        )
        assert cross_reference.text == 'An abstract title'
        # We add a second cross reference to the figure
        self.driver.find_element(
            By.CSS_SELECTOR,
            "#toolbar > div > div > div:nth-child(9) > button > span > i"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "#edit-link > div:nth-child(2) > select"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "#edit-link > div:nth-child(2) > select > option:nth-child(3)"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            (
                "body > div.ui-dialog.ui-corner-all.ui-widget."
                "ui-widget-content.ui-front.ui-dialog-buttons > "
                "div.ui-dialog-buttonpane.ui-widget-content."
                "ui-helper-clearfix > div > button.fw-dark."
                "fw-button.ui-button.ui-corner-all.ui-widget"
            )
        ).click()
        figure_cross_reference = self.driver.find_elements(
            By.CSS_SELECTOR,
            ".article-body .cross-reference"
        )[1]
        assert figure_cross_reference.text == 'Photo 1'
        # We add an internal link
        self.driver.find_element(
            By.CSS_SELECTOR,
            "#toolbar > div > div > div:nth-child(9) > button > span > i"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "#edit-link > div:nth-child(5) > select"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "#edit-link > div:nth-child(5) > select > option:nth-child(2)"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            (
                "body > div.ui-dialog.ui-corner-all.ui-widget."
                "ui-widget-content.ui-front.ui-dialog-buttons > "
                "div.ui-dialog-buttonpane.ui-widget-content."
                "ui-helper-clearfix > div > button.fw-dark."
                "fw-button.ui-button.ui-corner-all.ui-widget"
            )
        ).click()
        internal_link = self.driver.find_element(
            By.CSS_SELECTOR,
            ".article-body a"
        )
        assert internal_link.text == 'An abstract title'
        # We change the link text.
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".article-abstract h3"
        ).click()
        ActionChains(self.driver).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).perform()
        internal_link = self.driver.find_element(
            By.CSS_SELECTOR,
            ".article-body a"
        )
        assert internal_link.text == 'An abstract title'
        assert internal_link.get_attribute("title") == 'An abstract'
        cross_reference = self.driver.find_element(
            By.CSS_SELECTOR,
            ".article-body .cross-reference"
        )
        assert cross_reference.text == 'An abstract'
        # We add a second photo figure to increase the count
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".article-body figure"
        ).click()
        ActionChains(self.driver).send_keys(
            Keys.LEFT
        ).perform()
        button = self.driver.find_element_by_xpath('//*[@title="Figure"]')
        button.click()

        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.CLASS_NAME, "caption"))
        ).send_keys('Caption 2')
        self.driver.find_element_by_id("figure-category-btn").click()
        self.driver.find_element_by_id("figure-category-photo").click()

        # click on 'Insert image' button
        self.driver.find_element_by_id('insert-figure-image').click()
        # click on 'Use image' button
        WebDriverWait(self.driver, self.wait_time).until(
            EC.element_to_be_clickable(
                (By.CSS_SELECTOR, '.dataTable-container img')
            )
        ).click()

        self.driver.find_element_by_xpath(
            '//*[normalize-space()="Use image"]'
        ).click()
        self.driver.find_element_by_css_selector("button.fw-dark").click()
        time.sleep(1)
        figure_cross_reference = self.driver.find_elements(
            By.CSS_SELECTOR,
            ".article-body .cross-reference"
        )[1]
        assert figure_cross_reference.text == 'Photo 2'

        # We delete the contents from the heading
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".article-abstract h3"
        ).click()
        ActionChains(self.driver).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).perform()
        cross_reference = self.driver.find_element(
            By.CSS_SELECTOR,
            ".article-body .cross-reference.missing-target"
        )
        assert cross_reference.text == 'MISSING TARGET'
        internal_link = self.driver.find_element(
            By.CSS_SELECTOR,
            ".article-body a.missing-target"
        )
        assert internal_link.get_attribute("title") == 'Missing target'
        self.assertEqual(
            len(self.driver.find_elements_by_css_selector(
                '.margin-box.warning'
            )),
            2
        )
        # We add text to the heading again
        ActionChains(self.driver).send_keys(
            'Title'
        ).perform()
        cross_reference = self.driver.find_element(
            By.CSS_SELECTOR,
            ".article-body .cross-reference"
        )
        assert cross_reference.text == 'Title'
        internal_link = self.driver.find_element(
            By.CSS_SELECTOR,
            ".article-body a"
        )
        assert internal_link.get_attribute("title") == 'Title'
        self.assertEqual(
            len(self.driver.find_elements_by_css_selector(
                '.margin-box.warning'
            )),
            0
        )
        # We remove the second figure
        self.driver.find_elements(
            By.CSS_SELECTOR,
            ".article-body figure"
        )[1].click()
        button = self.driver.find_element_by_xpath('//*[@title="Figure"]')
        button.click()
        self.driver.find_element_by_xpath(
            '//*[contains(@class, "ui-button") and normalize-space()="Remove"]'
        ).click()
        time.sleep(1)
        figure_cross_reference = self.driver.find_elements(
            By.CSS_SELECTOR,
            ".article-body .cross-reference"
        )[1]
        assert figure_cross_reference.text == 'MISSING TARGET'

    def check_body(self, driver, body_text, seconds=False):
        if seconds is False:
            seconds = self.wait_time
        # Contents is child 5.
        current_body_text = driver.execute_script(
            'return window.theApp.page.view.state.doc.firstChild'
            '.child(5).textContent;'
        )
        if seconds < 0:
            assert False, "Body text incorrect: {}".format(current_body_text)
        elif current_body_text == body_text:
            return True
        else:
            time.sleep(0.1)
            return self.check_body(driver, body_text, seconds - 0.1)

    def test_track_changes(self):
        self.driver.get(self.base_url)
        self.driver.find_element(By.ID, "id_login").send_keys("Yeti")
        self.driver.find_element(By.ID, "id_password").send_keys("otter")
        self.driver.find_element(By.ID, "login-submit").click()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.element_to_be_clickable(
                (
                    By.CSS_SELECTOR,
                    ".new_document button"
                )
            )
        ).click()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.CLASS_NAME, 'editor-toolbar'))
        )
        self.driver.find_element(By.CSS_SELECTOR, ".article-title").click()
        self.driver.find_element(By.CSS_SELECTOR, ".article-title").send_keys(
            "A test article with tracked changes"
        )
        self.driver.find_element(By.CSS_SELECTOR, ".article-body").click()
        self.driver.find_element(By.CSS_SELECTOR, ".article-body").send_keys(
            "First I type "
        )
        self.driver.find_element(
            By.CSS_SELECTOR,
            "button[title=Strong]"
        ).click()
        self.driver.find_element(By.CSS_SELECTOR, ".article-body").send_keys(
            "some"
        )
        self.driver.find_element(
            By.CSS_SELECTOR,
            "button[title=Strong]"
        ).click()
        self.driver.find_element(By.CSS_SELECTOR, ".article-body").send_keys(
            " standard "
        )
        self.driver.find_element(
            By.CSS_SELECTOR,
            "button[title=Emphasis]"
        ).click()
        self.driver.find_element(By.CSS_SELECTOR, ".article-body").send_keys(
            "text"
        )
        self.driver.find_element(
            By.CSS_SELECTOR,
            "button[title=Emphasis]"
        ).click()
        self.driver.find_element(By.CSS_SELECTOR, ".article-body").send_keys(
            " here.\nI'll even write a second paragraph."
        )
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".header-menu:nth-child(5) > .header-nav-item"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "li:nth-child(1) > .fw-pulldown-item"
        ).click()
        self.driver.find_element(By.CSS_SELECTOR, ".article-body").click()
        ActionChains(self.driver).double_click(
            self.driver.find_element(By.CSS_SELECTOR, ".article-body strong")
        ).perform()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "button[title=Strong]"
        ).click()
        ActionChains(self.driver).double_click(
            self.driver.find_element(By.CSS_SELECTOR, ".article-body em")
        ).perform()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "button[title=Strong]"
        ).click()
        ActionChains(self.driver).send_keys(
            Keys.RIGHT
        ).send_keys(
            Keys.RIGHT
        ).send_keys(
            Keys.RIGHT
        ).send_keys(
            Keys.RIGHT
        ).send_keys(
            Keys.RIGHT
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.RIGHT
        ).send_keys(
            Keys.RIGHT
        ).send_keys(
            Keys.RIGHT
        ).send_keys(
            "insertion"
        ).send_keys(
            Keys.RIGHT
        ).send_keys(
            Keys.RIGHT
        ).send_keys(
            Keys.RIGHT
        ).send_keys(
            Keys.ENTER
        ).send_keys(
            Keys.UP
        ).perform()
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".editor-toolbar .multiButtons"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".editor-toolbar .multiButtons .ui-button:nth-child(5)"
        ).click()

        change_tracking_boxes = self.driver.find_elements_by_css_selector(
            '.margin-box.track'
        )
        self.assertEqual(
            len(change_tracking_boxes),
            6
        )

    def test_share_document(self):
        self.create_user(
            username='Yeti2',
            email='yeti2@snowman.com',
            passtext='otter'
        )
        self.driver.get(self.base_url)
        self.driver.find_element(By.ID, "id_login").send_keys("Yeti")
        self.driver.find_element(By.ID, "id_password").send_keys("otter")
        self.driver.find_element(By.ID, "login-submit").click()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.element_to_be_clickable(
                (
                    By.CSS_SELECTOR,
                    ".new_document button"
                )
            )
        ).click()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.CLASS_NAME, 'editor-toolbar'))
        )
        self.driver.find_element(By.CSS_SELECTOR, ".article-title").click()
        self.driver.find_element(By.CSS_SELECTOR, ".article-title").send_keys(
            "A test article to share"
        )
        # Open share dialog
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".header-menu:nth-child(1) > .header-nav-item"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "li:nth-child(1) > .fw-pulldown-item"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".ui-dialog .fw-add-button"
        ).click()
        self.driver.find_element(
            By.ID,
            "new-member-user-string"
        ).click()
        self.driver.find_element(By.ID, "new-member-user-string").send_keys(
            "yeti2@snowman.com"
        )
        ActionChains(self.driver).send_keys(
            Keys.TAB
        ).send_keys(
            Keys.RETURN
        ).perform()
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".ui-dialog .fw-add-button"
        ).click()
        self.driver.find_element(
            By.ID,
            "new-member-user-string"
        ).click()
        self.driver.find_element(By.ID, "new-member-user-string").send_keys(
            "yeti3@snowman.com"
        )
        ActionChains(self.driver).send_keys(
            Keys.TAB
        ).send_keys(
            Keys.RETURN
        ).perform()
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".ui-dialog .fw-add-button"
        ).click()
        self.driver.find_element(
            By.ID,
            "new-member-user-string"
        ).click()
        self.driver.find_element(By.ID, "new-member-user-string").send_keys(
            "yeti4@snowman.com"
        )
        ActionChains(self.driver).send_keys(
            Keys.TAB
        ).send_keys(
            Keys.RETURN
        ).perform()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.element_to_be_clickable(
                (By.CSS_SELECTOR, ".collaborator-tr .fa-caret-down")
            )
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".fw-pulldown-item[data-rights=write]"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "#my-contacts"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "tr:nth-child(3) .fa-caret-down"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "tr:nth-child(3) .fw-pulldown-item[data-rights=write]"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "#my-contacts"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".ui-dialog .fw-dark"
        ).click()
        time.sleep(1)
        # We keep track of the invitation email to open it later.
        user4_invitation_email = mail.outbox[-1].body
        #  Reopen the share dialog and add a fifth user
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".header-menu:nth-child(1) > .header-nav-item"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "li:nth-child(1) > .fw-pulldown-item"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".ui-dialog .fw-add-button"
        ).click()
        self.driver.find_element(
            By.ID,
            "new-member-user-string"
        ).click()
        self.driver.find_element(By.ID, "new-member-user-string").send_keys(
            "yeti5@snowman.com"
        )
        ActionChains(self.driver).send_keys(
            Keys.TAB
        ).send_keys(
            Keys.RETURN
        ).perform()
        # Downgrade the write rights to read rights for user4
        self.driver.find_element(
            By.CSS_SELECTOR,
            "tr:nth-child(3) .fa-caret-down.edit-right"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "tr:nth-child(3) .fw-pulldown-item[data-rights=read]"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "#my-contacts"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".ui-dialog .fw-dark"
        ).click()
        time.sleep(1)
        # We keep track of the invitation email to open it later.
        user5_invitation_email = mail.outbox[-1].body
        # We close the editor
        self.driver.find_element(
            By.ID,
            "close-document-top"
        ).click()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.element_to_be_clickable((By.ID, 'preferences-btn'))
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".fw-logout-button"
        ).click()
        # Second user logs in, verifies that he has access
        self.driver.find_element(By.ID, "id_login").send_keys("Yeti2")
        self.driver.find_element(By.ID, "id_password").send_keys("otter")
        self.driver.find_element(By.ID, "login-submit").click()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (
                    By.CSS_SELECTOR,
                    ".new_document button"
                )
            )
        )
        documents = self.driver.find_elements_by_css_selector(
            '.fw-contents tbody tr'
        )
        self.assertEqual(
            len(documents),
            1
        )
        write_access_rights = self.driver.find_elements_by_css_selector(
            '.fw-contents tbody tr .icon-access-write'
        )
        self.assertEqual(
            len(write_access_rights),
            1
        )
        self.driver.find_element_by_css_selector(
            '.fw-contents tbody tr a.doc-title'
        ).click()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.CLASS_NAME, 'editor-toolbar'))
        )
        self.driver.find_element(By.CSS_SELECTOR, ".article-body").click()
        ActionChains(self.driver).send_keys(
            "The body"
        ).send_keys(
            Keys.ENTER
        ).perform()
        assert self.driver.find_element(
            By.CSS_SELECTOR,
            ".article-title"
        ).text == "A test article to share"
        self.check_body(self.driver, 'The body')
        self.driver.find_element(
            By.ID,
            "close-document-top"
        ).click()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.element_to_be_clickable((By.ID, 'preferences-btn'))
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".fw-logout-button"
        ).click()
        # First user logs in again, removes access rights of second user
        self.driver.find_element(By.ID, "id_login").send_keys("Yeti")
        self.driver.find_element(By.ID, "id_password").send_keys("otter")
        self.driver.find_element(By.ID, "login-submit").click()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (
                    By.CSS_SELECTOR,
                    ".new_document button"
                )
            )
        )
        documents = self.driver.find_elements_by_css_selector(
            '.fw-contents tbody tr a.doc-title'
        )
        self.assertEqual(
            len(documents),
            1
        )
        self.driver.find_element_by_css_selector(
            '.fw-contents tbody tr a.doc-title'
        ).click()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.CLASS_NAME, 'editor-toolbar'))
        )
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".header-menu:nth-child(1) > .header-nav-item"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "li:nth-child(1) > .fw-pulldown-item"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".delete-collaborator"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".ui-dialog .fw-dark"
        ).click()
        self.driver.find_element(
            By.ID,
            "close-document-top"
        ).click()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.element_to_be_clickable((By.ID, 'preferences-btn'))
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".fw-logout-button"
        ).click()
        # Second user logs in again to verify that access rights are gone
        self.driver.find_element(By.ID, "id_login").send_keys("Yeti2")
        self.driver.find_element(By.ID, "id_password").send_keys("otter")
        self.driver.find_element(By.ID, "login-submit").click()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (
                    By.CSS_SELECTOR,
                    ".new_document button"
                )
            )
        )
        documents = self.driver.find_elements_by_css_selector(
            '.fw-contents tbody tr a.doc-title'
        )
        self.assertEqual(
            len(documents),
            0
        )
        WebDriverWait(self.driver, self.wait_time).until(
            EC.element_to_be_clickable((By.ID, 'preferences-btn'))
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".fw-logout-button"
        ).click()
        # Third user signs up
        self.driver.find_element(
            By.CSS_SELECTOR,
            'a[title="Sign up"]'
        ).click()
        self.driver.find_element(
            By.ID,
            'id_username'
        ).send_keys('Yeti3')
        self.driver.find_element(
            By.ID,
            'id_password1'
        ).send_keys('password')
        self.driver.find_element(
            By.ID,
            'id_password2'
        ).send_keys('password')
        self.driver.find_element(
            By.ID,
            'id_email'
        ).send_keys('yeti3@snowman.com')
        self.driver.find_element(
            By.ID,
            'signup-submit'
        ).click()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (
                    By.CSS_SELECTOR,
                    'a[href="mailto:yeti3@snowman.com"]'
                )
            )
        )
        email = EmailAddress.objects.filter(email='yeti3@snowman.com').first()
        self.assertIsNotNone(email)
        confirmation_key = EmailConfirmationHMAC(email).key
        self.driver.get(
            self.base_url +
            "/account/confirm-email/" +
            confirmation_key +
            "/"
        )
        self.driver.find_element(
            By.ID,
            'terms-check'
        ).click()
        self.driver.find_element(
            By.ID,
            'test-check'
        ).click()
        self.driver.find_element(
            By.ID,
            'submit'
        ).click()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.text_to_be_present_in_element(
                (
                    By.CSS_SELECTOR,
                    ".fw-contents h1"
                ),
                "Thanks for verifying!"
            )
        )
        self.driver.find_element(
            By.CSS_SELECTOR,
            'a[href="/"]'
        ).click()
        self.driver.find_element(By.ID, "id_login").send_keys("Yeti3")
        self.driver.find_element(By.ID, "id_password").send_keys("password")
        self.driver.find_element(By.ID, "login-submit").click()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (
                    By.CSS_SELECTOR,
                    ".new_document button"
                )
            )
        )
        documents = self.driver.find_elements_by_css_selector(
            '.fw-contents tbody tr'
        )
        self.assertEqual(
            len(documents),
            1
        )
        read_access_rights = self.driver.find_elements_by_css_selector(
            '.fw-contents tbody tr .icon-access-read'
        )
        self.assertEqual(
            len(read_access_rights),
            1
        )
        self.driver.find_element_by_css_selector(
            '.fw-contents tbody tr a.doc-title'
        ).click()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.CLASS_NAME, 'editor-toolbar'))
        )
        self.driver.find_element(By.CSS_SELECTOR, ".article-body").click()
        self.driver.find_element(By.CSS_SELECTOR, ".article-body").send_keys(
            "Some extra content that doesn't show"
        )
        assert self.driver.find_element(
            By.CSS_SELECTOR,
            ".article-title"
        ).text == "A test article to share"
        self.check_body(self.driver, 'The body')
        # Make a copy of the file
        old_body = self.driver.find_element(By.CSS_SELECTOR, ".article-body")
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".header-menu:nth-child(1) > .header-nav-item"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "li:nth-child(4) > .fw-pulldown-item"
        ).click()
        # Check whether user now has write access
        WebDriverWait(self.driver, self.wait_time).until(
            EC.staleness_of(old_body)
        )
        self.driver.find_element(By.CSS_SELECTOR, ".article-body").click()
        self.driver.find_element(By.CSS_SELECTOR, ".article-body").send_keys(
            "Some extra content that does show"
        )
        self.check_body(
            self.driver,
            'The bodySome extra content that does show'
        )
        # Give user 1 write access to document
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".header-menu:nth-child(1) > .header-nav-item"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "li:nth-child(1) > .fw-pulldown-item"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "#my-contacts > table > tbody > tr > td"
        ).click()
        self.driver.find_element(
            By.ID,
            "add-share-member"
        ).click()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.element_to_be_clickable(
                (By.CSS_SELECTOR, ".collaborator-tr .fa-caret-down")
            )
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".fw-pulldown-item[data-rights=write]"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".ui-dialog .fw-dark"
        ).click()
        # Tag user 1 in comment
        self.driver.find_element(By.CSS_SELECTOR, ".article-body").click()
        ActionChains(self.driver).key_down(
            Keys.SHIFT
        ).send_keys(
            Keys.LEFT
        ).send_keys(
            Keys.LEFT
        ).send_keys(
            Keys.LEFT
        ).send_keys(
            Keys.LEFT
        ).key_up(
            Keys.SHIFT
        ).perform()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "button .fa-comment"
        ).click()
        ActionChains(self.driver).send_keys(
            'Hello @Yeti'
        ).perform()
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".tag-user"
        ).click()
        emails_sent_before_comment = len(mail.outbox)
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".comment-btns .submit"
        ).click()
        time.sleep(1)
        self.assertEqual(
            emails_sent_before_comment + 1,
            len(mail.outbox)
        )
        self.driver.find_element(
            By.ID,
            "close-document-top"
        ).click()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.element_to_be_clickable((By.ID, 'preferences-btn'))
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".fw-logout-button"
        ).click()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.element_to_be_clickable(
                (By.CSS_SELECTOR, 'a[href="/account/sign-up/"]')
            )
        )
        # User 4 signs up using invitation link but different email than what
        # was in the invitation email (this should work)
        invitation_link = self.find_urls(user4_invitation_email)[0]
        self.driver.get(invitation_link)
        self.driver.find_element(
            By.CSS_SELECTOR,
            'a[title="Sign up"]'
        ).click()
        self.driver.find_element(
            By.ID,
            'id_username'
        ).send_keys('Yeti4')
        self.driver.find_element(
            By.ID,
            'id_password1'
        ).send_keys('password')
        self.driver.find_element(
            By.ID,
            'id_password2'
        ).send_keys('password')
        self.driver.find_element(
            By.ID,
            'id_email'
        ).send_keys('yeti4a@snowman.com')
        self.driver.find_element(
            By.ID,
            'signup-submit'
        ).click()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (
                    By.CSS_SELECTOR,
                    'a[href="mailto:yeti4a@snowman.com"]'
                )
            )
        )
        confirmation_link = self.find_urls(mail.outbox[-1].body)[0]
        self.driver.get(
            confirmation_link
        )
        self.driver.find_element(
            By.ID,
            'terms-check'
        ).click()
        self.driver.find_element(
            By.ID,
            'test-check'
        ).click()
        self.driver.find_element(
            By.ID,
            'submit'
        ).click()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.text_to_be_present_in_element(
                (
                    By.CSS_SELECTOR,
                    ".fw-contents h1"
                ),
                "Thanks for verifying!"
            )
        )
        self.driver.find_element(
            By.CSS_SELECTOR,
            'a[href="/"]'
        ).click()
        self.driver.find_element(By.ID, "id_login").send_keys("Yeti4")
        self.driver.find_element(By.ID, "id_password").send_keys("password")
        self.driver.find_element(By.ID, "login-submit").click()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (
                    By.CSS_SELECTOR,
                    ".new_document button"
                )
            )
        )
        documents = self.driver.find_elements_by_css_selector(
            '.fw-contents tbody tr a.doc-title'
        )
        self.assertEqual(
            len(documents),
            1
        )
        self.driver.find_element(
            By.CSS_SELECTOR,
            "#preferences-btn"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".fw-logout-button"
        ).click()
        # User 5 signs up with a different email first and then clicks the
        # invitation link. This should land user 5 directly in the editor.
        self.create_user(
            username='Yeti5',
            email='yeti5a@snowman.com',
            passtext='password'
        )
        self.driver.find_element(By.ID, "id_login").send_keys("Yeti5")
        self.driver.find_element(By.ID, "id_password").send_keys("password")
        self.driver.find_element(By.ID, "login-submit").click()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (
                    By.CSS_SELECTOR,
                    ".new_document button"
                )
            )
        )
        documents = self.driver.find_elements_by_css_selector(
            '.fw-contents tbody tr a.doc-title'
        )
        self.assertEqual(
            len(documents),
            0
        )
        invitation_link = self.find_urls(user5_invitation_email)[0]
        self.driver.get(invitation_link)
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.CLASS_NAME, 'editor-toolbar'))
        )
        self.driver.find_element(
            By.ID,
            "close-document-top"
        ).click()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.element_to_be_clickable((By.ID, 'preferences-btn'))
        )
        documents = self.driver.find_elements_by_css_selector(
            '.fw-contents tbody tr a.doc-title'
        )
        self.assertEqual(
            len(documents),
            1
        )

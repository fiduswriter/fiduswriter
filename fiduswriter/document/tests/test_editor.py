import time

from testing.testcases import LiveTornadoTestCase
from testing.selenium_helper import SeleniumHelper
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains

from allauth.account.models import EmailConfirmationHMAC, EmailAddress


class EditorTest(LiveTornadoTestCase, SeleniumHelper):
    fixtures = [
        'initial_documenttemplates.json',
        'initial_styles.json',
    ]

    @classmethod
    def setUpClass(cls):
        super(EditorTest, cls).setUpClass()
        cls.base_url = cls.live_server_url
        driver_data = cls.get_drivers(1)
        cls.driver = driver_data["drivers"][0]
        cls.client = driver_data["clients"][0]
        cls.driver.implicitly_wait(driver_data["wait_time"])
        cls.wait_time = driver_data["wait_time"]

    @classmethod
    def tearDownClass(cls):
        cls.driver.quit()
        super(EditorTest, cls).tearDownClass()

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

    def check_body(self, driver, body_text, seconds=False):
        if seconds is False:
            seconds = self.wait_time
        # Contents is child 5.
        current_body_text = driver.execute_script(
            'return window.theApp.page.view.state.doc.firstChild'
            '.child(5).textContent;'
        )
        if seconds < 0:
            assert False, "Body text incorrect"
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
        self.driver.find_element(By.CSS_SELECTOR, ".article-body").send_keys(
            "The body"
        )
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

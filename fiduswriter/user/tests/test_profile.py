import time
import os

from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver.common.by import By
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from testing.testcases import LiveTornadoTestCase
from testing.selenium_helper import SeleniumHelper
from selenium.common.exceptions import StaleElementReferenceException

from django.core import mail
from django.conf import settings
from django.contrib.auth.models import User


class ProfileTest(LiveTornadoTestCase, SeleniumHelper):

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
        self.user = self.create_user(
            username='Yeti',
            email='yeti@snowman.com',
            passtext='otter1'
        )
        self.login_user(self.user, self.driver, self.client)

    def assertInfoAlert(self, message):
        i = 0
        message_found = False
        while(i < 100):
            i = i + 1
            try:
                if self.driver.find_element(
                    By.CSS_SELECTOR,
                    "body #alerts-outer-wrapper .alerts-info"
                ).text == message:
                    message_found = True
                    break
                else:
                    time.sleep(0.1)
                    continue
            except StaleElementReferenceException:
                time.sleep(0.1)
                continue
        self.assertTrue(message_found)

    def test_edit_profile(self):
        driver = self.driver
        driver.get(self.base_url + "/")
        driver.find_element_by_id("preferences-btn").click()
        driver.find_element_by_css_selector(".fw-avatar-card").click()
        driver.find_element_by_id("first_name").clear()
        driver.find_element_by_id("first_name").send_keys("Snowman")
        driver.find_element_by_id("last_name").clear()
        driver.find_element_by_id("last_name").send_keys("Yeti")
        driver.find_element_by_id("submit-profile").click()
        pwd_button = driver.find_element_by_id("fw-edit-profile-pwd")
        WebDriverWait(self.driver, self.wait_time).until(
            EC.staleness_of(
                pwd_button
            )
        )
        driver.find_element_by_id("fw-edit-profile-pwd").click()
        driver.find_element_by_id("old-password-input").clear()
        driver.find_element_by_id("old-password-input").send_keys("otter1")
        driver.find_element_by_id("new-password-input1").clear()
        driver.find_element_by_id("new-password-input1").send_keys("otter2")
        driver.find_element_by_id("new-password-input2").clear()
        driver.find_element_by_id("new-password-input2").send_keys("otter2")
        driver.find_element_by_xpath("(//button[@type='button'])[2]").click()
        self.assertInfoAlert("The password has been changed.")
        driver.find_element_by_id("fw-edit-profile-pwd").click()
        driver.find_element_by_id("old-password-input").clear()
        driver.find_element_by_id("old-password-input").send_keys("otter2")
        driver.find_element_by_id("new-password-input1").clear()
        driver.find_element_by_id("new-password-input1").send_keys("otter1")
        driver.find_element_by_id("new-password-input2").clear()
        driver.find_element_by_id("new-password-input2").send_keys("otter1")
        driver.find_element_by_xpath("(//button[@type='button'])[2]").click()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.invisibility_of_element_located(
                (
                    By.CSS_SELECTOR,
                    "#fw-change-pwd-dialog"
                )
            )
        )
        driver.refresh()
        try:
            self.assertEqual("Yeti", driver.find_element_by_id(
                "last_name").get_attribute("value"))
        except AssertionError as e:
            self.verificationErrors.append(str(e))
        try:
            self.assertEqual("Snowman", driver.find_element_by_id(
                "first_name").get_attribute("value"))
        except AssertionError as e:
            self.verificationErrors.append(str(e))
        try:
            self.assertEqual("Yeti", driver.find_element_by_id(
                "username").get_attribute("value"))
        except AssertionError as e:
            self.verificationErrors.append(str(e))

        # Test avatar upload
        self.assertEqual(
            len(driver.find_elements_by_css_selector(
                '#profile-avatar img'
            )),
            0
        )
        driver.find_element_by_id("edit-avatar-btn").click()
        driver.find_element_by_css_selector(".change-avatar").click()

        image_path = os.path.join(
            settings.PROJECT_PATH,
            'document/tests/uploads/image.png'
        )
        driver.find_element_by_css_selector(
            ".ui-dialog input[type=file]"
        ).send_keys(
            image_path
        )
        driver.find_element_by_css_selector(
            ".ui-dialog .fw-dark"
        ).click()
        self.assertEqual(
            len(driver.find_elements_by_css_selector(
                '#profile-avatar img'
            )),
            1
        )
        driver.find_element_by_id("edit-avatar-btn").click()
        driver.find_element_by_css_selector(".delete-avatar").click()
        driver.find_element_by_css_selector(
            ".ui-dialog .fw-dark"
        ).click()
        time.sleep(1)
        self.assertEqual(
            len(driver.find_elements_by_css_selector(
                '#profile-avatar img'
            )),
            0
        )

        # Test emails
        driver.find_element_by_id("add-profile-email").click()
        driver.find_element_by_id("new-profile-email").send_keys(
            "yeti@snowman2.com"
        )
        driver.find_element_by_css_selector("button.fw-dark").click()
        self.assertInfoAlert("Confirmation e-mail sent to: yeti@snowman2.com")
        assert self.driver.find_element(
            By.CSS_SELECTOR,
            ".profile-email-table tbody tr:nth-child(2) .emailaddress"
        ).text == "yeti@snowman2.com"
        self.assertEqual(
            1,
            len(mail.outbox)
        )
        # We check that yeti@snowman2.com is not verified and does not have a
        # radio button for primary email account
        self.assertEqual(
            len(self.driver.find_elements(
                By.CSS_SELECTOR,
                (
                    ".profile-email-table tbody tr:nth-child(2) .fa-check, "
                    ".profile-email-table tbody tr:nth-child(2) "
                    ".primary-email-radio"
                )
            )),
            0
        )
        urls = self.find_urls(mail.outbox[0].body)
        self.driver.get(urls[0])
        assert self.driver.find_element(
            By.CSS_SELECTOR,
            ".fw-login-title"
        ).text == "CONFIRM E-MAIL ADDRESS"
        self.driver.find_element(
            By.ID,
            "submit"
        ).click()
        self.assertEqual(
            len(self.driver.find_elements(
                By.CSS_SELECTOR,
                (
                    ".profile-email-table tbody tr:nth-child(2) .fa-check, "
                    ".profile-email-table tbody tr:nth-child(2) "
                    ".primary-email-radio"
                )
            )),
            2
        )
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".profile-email-table tbody tr:nth-child(2) .primary-email-radio"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".ui-dialog-buttonset .fw-dark"
        ).click()
        self.assertInfoAlert("The primary email has been updated.")
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".profile-email-table tbody tr:nth-child(1) .delete-email"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "button.fw-dark"
        ).click()
        self.assertInfoAlert("Email successfully deleted!")
        self.assertEqual(
            len(self.driver.find_elements_by_css_selector(
                ".profile-email-table tbody tr"
            )),
            2
        )
        driver.find_element_by_id("add-profile-email").click()
        driver.find_element_by_id("new-profile-email").send_keys(
            "yeti@snowman3.com"
        )
        driver.find_element_by_css_selector("button.fw-dark").click()
        self.assertInfoAlert("Confirmation e-mail sent to: yeti@snowman3.com")
        assert self.driver.find_element(
            By.CSS_SELECTOR,
            ".profile-email-table tbody tr:nth-child(2) .emailaddress"
        ).text == "yeti@snowman3.com"
        self.assertEqual(
            2,
            len(mail.outbox)
        )
        driver.find_element_by_id("add-profile-email").click()
        driver.find_element_by_id("new-profile-email").send_keys(
            "yeti@snowman4.com"
        )
        driver.find_element_by_css_selector("button.fw-dark").click()
        self.assertInfoAlert("Confirmation e-mail sent to: yeti@snowman4.com")
        assert self.driver.find_element(
            By.CSS_SELECTOR,
            ".profile-email-table tbody tr:nth-child(3) .emailaddress"
        ).text == "yeti@snowman4.com"
        self.assertEqual(
            3,
            len(mail.outbox)
        )
        # This time we log out first. We shoudld then be redirected to the page
        # that tells us to log in after verification.
        self.driver.find_element_by_id(
            "preferences-btn"
        ).click()
        self.driver.find_element_by_css_selector(
            ".fw-logout-button"
        ).click()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.title_is(
                "Login - Fidus Writer"
            )
        )
        urls = self.find_urls(mail.outbox[1].body)
        self.driver.get(urls[0])
        assert self.driver.find_element(
            By.CSS_SELECTOR,
            ".fw-login-title"
        ).text == "CONFIRM E-MAIL ADDRESS"
        self.driver.find_element(
            By.ID,
            "submit"
        ).click()
        time.sleep(1)
        assert self.driver.find_element(
            By.CSS_SELECTOR,
            ".fw-contents.prelogin h1"
        ).text == "Thanks for verifying!"
        # This time we log in as a different user and then try to verify the
        # email. This should log us out automatically.
        user2 = self.create_user(
            username='Yeti2',
            email='yeti@snowman5.com',
            passtext='otter1'
        )
        self.login_user(user2, self.driver, self.client)
        driver.get(self.base_url + "/")
        urls = self.find_urls(mail.outbox[2].body)
        self.driver.get(urls[0])
        assert self.driver.find_element(
            By.CSS_SELECTOR,
            ".fw-login-title"
        ).text == "CONFIRM E-MAIL ADDRESS"
        self.driver.find_element(
            By.ID,
            "submit"
        ).click()
        time.sleep(1)
        assert self.driver.find_element(
            By.CSS_SELECTOR,
            ".fw-contents.prelogin h1"
        ).text == "Thanks for verifying!"
        # Log in and delete account
        self.login_user(user2, self.driver, self.client)
        self.driver.get(self.base_url + "/")
        driver.find_element_by_id("preferences-btn").click()
        driver.find_element_by_css_selector(".fw-avatar-card").click()
        driver.find_element_by_id("delete-account").click()
        driver.find_element_by_id("username-confirmation").send_keys(
            'Yeti2'
        )
        driver.find_element_by_id("password").send_keys(
            'otter1'
        )
        self.assertEqual(
            len(User.objects.filter(username='Yeti2')),
            1
        )
        driver.find_element_by_css_selector(".ui-dialog .fw-dark").click()
        time.sleep(1)
        login_header = self.driver.find_elements(
            By.CSS_SELECTOR,
            "h1.fw-login-title"
        )
        self.assertEqual(
            len(login_header),
            1
        )
        self.assertEqual(
            len(User.objects.filter(username='Yeti2')),
            0
        )

    def is_element_present(self, how, what):
        try:
            self.driver.find_element(by=how, value=what)
        except NoSuchElementException:
            return False
        return True

    def tearDown(self):
        self.assertEqual([], self.verificationErrors)

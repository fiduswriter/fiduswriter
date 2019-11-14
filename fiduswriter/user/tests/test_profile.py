import time

from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver.common.by import By
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from testing.testcases import LiveTornadoTestCase
from testing.selenium_helper import SeleniumHelper


class EditProfileTest(LiveTornadoTestCase, SeleniumHelper):

    @classmethod
    def setUpClass(cls):
        super(EditProfileTest, cls).setUpClass()
        cls.base_url = cls.live_server_url
        driver_data = cls.get_drivers(1)
        cls.driver = driver_data["drivers"][0]
        cls.client = driver_data["clients"][0]
        cls.driver.implicitly_wait(driver_data["wait_time"])
        cls.wait_time = driver_data["wait_time"]

    @classmethod
    def tearDownClass(cls):
        cls.driver.quit()
        super(EditProfileTest, cls).tearDownClass()

    def setUp(self):
        self.verificationErrors = []
        self.accept_next_alert = True
        self.user = self.create_user(
            username='Yeti',
            email='yeti@snowman.com',
            passtext='otter1'
        )
        self.login_user(self.user, self.driver, self.client)

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
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (
                    By.CSS_SELECTOR,
                    "#alerts-wrapper .alerts-info"
                )
            )
        )
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
        driver.find_element_by_id("add-profile-email").click()
        driver.find_element_by_id("new-profile-email").send_keys(
            "yeti@snowman2.com"
        )
        driver.find_element_by_css_selector("button.fw-dark").click()
        assert self.driver.find_element(
            By.CSS_SELECTOR,
            "#alerts-outer-wrapper .alerts-info"
        ).text == "Confirmation e-mail sent to: yeti@snowman2.com"
        assert self.driver.find_element(
            By.CSS_SELECTOR,
            ".profile-email-table tbody tr:nth-child(2) .emailaddress"
        ).text == "yeti@snowman2.com"
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".profile-email-table tbody tr:nth-child(2) .delete-email"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "button.fw-dark"
        ).click()
        i = 0
        message_found = False
        while(i < 100):
            i = i + 1
            if self.driver.find_element(
                By.CSS_SELECTOR,
                "body #alerts-outer-wrapper .alerts-info"
            ).text == "Email succesfully deleted!":
                message_found = True
                break
            else:
                time.sleep(0.1)
                continue
        self.assertTrue(message_found)
        self.assertEqual(
            len(self.driver.find_elements_by_css_selector(
                ".profile-email-table tbody tr"
            )),
            2
        )
        driver.find_element_by_id("first_name").clear()
        driver.find_element_by_id("first_name").send_keys("")
        driver.find_element_by_id("last_name").clear()
        driver.find_element_by_id("last_name").send_keys("")
        driver.find_element_by_id("submit-profile").click()
        pwd_button = driver.find_element_by_id("fw-edit-profile-pwd")
        WebDriverWait(self.driver, self.wait_time).until(
            EC.staleness_of(
                pwd_button
            )
        )
        driver.find_element_by_id("preferences-btn").click()
        driver.find_element_by_css_selector("button.fw-logout-button").click()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.title_is(
                "Login - Fidus Writer"
            )
        )

    def is_element_present(self, how, what):
        try:
            self.driver.find_element(by=how, value=what)
        except NoSuchElementException:
            return False
        return True

    def tearDown(self):
        self.assertEqual([], self.verificationErrors)

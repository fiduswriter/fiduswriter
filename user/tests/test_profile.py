from selenium.common.exceptions import NoSuchElementException
import time

from test.testcases import LiveTornadoTestCase
from test.selenium_helper import SeleniumHelper


class EditProfileTest(LiveTornadoTestCase, SeleniumHelper):

    @classmethod
    def setUpClass(cls):
        super(EditProfileTest, cls).setUpClass()
        cls.base_url = cls.live_server_url
        driver_data = cls.get_drivers(1)
        cls.driver = driver_data["drivers"][0]
        cls.client = driver_data["clients"][0]
        cls.driver.implicitly_wait(driver_data["wait_time"])

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
        time.sleep(0.3)
        for i in range(100):
            if len(
                driver.find_elements_by_css_selector(
                    "#fw-edit-profile-pwd"
                )
            ) == 1:
                break
            time.sleep(0.1)
        else:
            self.fail("time out")
        driver.find_element_by_id("fw-edit-profile-pwd").click()
        driver.find_element_by_id("old-password-input").clear()
        driver.find_element_by_id("old-password-input").send_keys("otter1")
        driver.find_element_by_id("new-password-input1").clear()
        driver.find_element_by_id("new-password-input1").send_keys("otter2")
        driver.find_element_by_id("new-password-input2").clear()
        driver.find_element_by_id("new-password-input2").send_keys("otter2")
        driver.find_element_by_xpath("(//button[@type='button'])[2]").click()
        for i in range(100):
            time.sleep(0.1)
            if len(
                driver.find_elements_by_css_selector(
                    "#alerts-wrapper .alerts-info"
                )
            ) > 0:
                break
        else:
            self.fail("time out")
        driver.find_element_by_id("fw-edit-profile-pwd").click()
        driver.find_element_by_id("old-password-input").clear()
        driver.find_element_by_id("old-password-input").send_keys("otter2")
        driver.find_element_by_id("new-password-input1").clear()
        driver.find_element_by_id("new-password-input1").send_keys("otter1")
        driver.find_element_by_id("new-password-input2").clear()
        driver.find_element_by_id("new-password-input2").send_keys("otter1")
        driver.find_element_by_xpath("(//button[@type='button'])[2]").click()
        for i in range(30):
            time.sleep(0.3)
            if len(
                driver.find_elements_by_css_selector("#fw-change-pwd-dialog")
            ) == 0:
                break
        else:
            self.fail("time out")
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
        driver.find_element_by_id("first_name").clear()
        driver.find_element_by_id("first_name").send_keys("")
        driver.find_element_by_id("last_name").clear()
        driver.find_element_by_id("last_name").send_keys("")
        driver.find_element_by_id("submit-profile").click()
        time.sleep(1)
        for i in range(30):
            time.sleep(0.3)
            if len(
                driver.find_elements_by_css_selector(
                    "#preferences-btn"
                )
            ) == 1:
                break
        else:
            self.fail("time out")
        driver.find_element_by_id("preferences-btn").click()
        driver.find_element_by_css_selector("button.fw-logout-button").click()
        time.sleep(1)
        try:
            self.assertEqual("Login - Fidus Writer", driver.title)
        except AssertionError as e:
            self.verificationErrors.append(str(e))

    def is_element_present(self, how, what):
        try:
            self.driver.find_element(by=how, value=what)
        except NoSuchElementException:
            return False
        return True

    def tearDown(self):
        self.assertEqual([], self.verificationErrors)

# -*- coding: utf-8 -*-
from selenium.common.exceptions import NoSuchElementException
from selenium.common.exceptions import NoAlertPresentException
import time

from test.testcases import LiveTornadoTestCase
from test.selenium_helper import SeleniumHelper
from pyvirtualdisplay import Display

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
        driver.find_element_by_link_text("Edit profile").click()
        driver.find_element_by_id("first_name").clear()
        driver.find_element_by_id("first_name").send_keys("Snowman")
        driver.find_element_by_id("last_name").clear()
        driver.find_element_by_id("last_name").send_keys("Yeti")
        driver.find_element_by_id("submit-profile").click()
        driver.find_element_by_id("fw-edit-profile-pwd").click()
        driver.find_element_by_id("old-password-input").clear()
        driver.find_element_by_id("old-password-input").send_keys("otter1")
        driver.find_element_by_id("new-password-input1").clear()
        driver.find_element_by_id("new-password-input1").send_keys("otter2")
        driver.find_element_by_id("new-password-input2").clear()
        driver.find_element_by_id("new-password-input2").send_keys("otter2")
        driver.find_element_by_xpath("(//button[@type='button'])[2]").click()
        for i in range(60):
            try:
                alert_text = self.close_alert_and_get_its_text()
                if "The password has been changed." == alert_text:
                    break
            except:
                pass
            time.sleep(1)
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
        for i in range(60):
            try:
                alert_text = self.close_alert_and_get_its_text()
                if "The password has been changed." == alert_text:
                    break
            except:
                pass
            time.sleep(1)
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
        driver.find_element_by_id("preferences-btn").click()
        driver.find_element_by_css_selector("button.fw-logout-button").click()
        try:
            self.assertEqual("Fidus Writer - Log In.", driver.title)
        except AssertionError as e:
            self.verificationErrors.append(str(e))

    def is_element_present(self, how, what):
        try:
            self.driver.find_element(by=how, value=what)
        except NoSuchElementException:
            return False
        return True

    def is_alert_present(self):
        try:
            self.driver.switch_to_alert()
        except NoAlertPresentException:
            return False
        return True

    def close_alert_and_get_its_text(self):
        try:
            alert = self.driver.switch_to_alert()
            alert_text = alert.text
            if self.accept_next_alert:
                alert.accept()
            else:
                alert.dismiss()
            return alert_text
        finally:
            self.accept_next_alert = True

    def tearDown(self):
        self.assertEqual([], self.verificationErrors)

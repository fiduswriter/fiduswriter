# -*- coding: utf-8 -*-
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import Select
from selenium.common.exceptions import NoSuchElementException
from selenium.common.exceptions import NoAlertPresentException
import unittest, time, re, os
from django.contrib.auth.models import User
from allauth.account.models import EmailAddress
from django.contrib.auth.hashers import make_password

from django.test import LiveServerTestCase
from test.testcases import LiveTornadoTestCase

class EditProfileTest(LiveTornadoTestCase):

    @classmethod
    def setUpClass(cls):
        super(EditProfileTest, cls).setUpClass()
        cls.setUpDriver()
        cls.base_url = cls.live_server_url
        cls.driver.implicitly_wait(30)

    @classmethod
    def setUpDriver(cls):
        if os.getenv("SAUCE_USERNAME"):
            username = os.environ["SAUCE_USERNAME"]
            access_key = os.environ["SAUCE_ACCESS_KEY"]
            capabilities = {}
            capabilities["build"] = os.environ["TRAVIS_BUILD_NUMBER"]
            capabilities["tags"] = [os.environ["TRAVIS_PYTHON_VERSION"], "CI"]
            capabilities["tunnel-identifier"] = os.environ["TRAVIS_JOB_NUMBER"]
            capabilities["browserName"] = "chrome"
            hub_url = "%s:%s@localhost:4445" % (username, access_key)
            cls.driver = webdriver.Remote(
                desired_capabilities=capabilities,
                command_executor="http://%s/wd/hub" % hub_url
            )
        else:
            cls.driver = webdriver.Chrome()

    @classmethod
    def tearDownClass(cls):
        cls.driver.quit()
        super(EditProfileTest, cls).tearDownClass()

    def setUp(self):
        self.verificationErrors = []
        self.accept_next_alert = True

    # create django data
    def createUser(self, username, email, passtext):
        user = User.objects.create(
            username=username,
            password=make_password(passtext),
            is_active=True
        )
        user.save()

        # avoid the unverified-email login trap
        EmailAddress.objects.create(
            user=user,
            email=email,
            verified=True,
        ).save()

        return user

    def test_edit_profile(self):
        self.createUser('Yeti','yeti@example.com','otter1')
        driver = self.driver
        driver.get(self.base_url + "/account/login/")
        driver.find_element_by_id("id_login").clear()
        driver.find_element_by_id("id_login").send_keys("Yeti")
        driver.find_element_by_id("id_password").clear()
        driver.find_element_by_id("id_password").send_keys("otter1")
        driver.find_element_by_xpath("//button[@type='submit']").click()
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
                if "The password has been changed." == self.close_alert_and_get_its_text(): break
            except: pass
            time.sleep(1)
        else: self.fail("time out")
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
                if "The password has been changed." == self.close_alert_and_get_its_text(): break
            except: pass
            time.sleep(1)
        else: self.fail("time out")
        driver.refresh()
        try: self.assertEqual("Yeti", driver.find_element_by_id("last_name").get_attribute("value"))
        except AssertionError as e: self.verificationErrors.append(str(e))
        try: self.assertEqual("Snowman", driver.find_element_by_id("first_name").get_attribute("value"))
        except AssertionError as e: self.verificationErrors.append(str(e))
        try: self.assertEqual("Yeti", driver.find_element_by_id("username").get_attribute("value"))
        except AssertionError as e: self.verificationErrors.append(str(e))
        driver.find_element_by_id("first_name").clear()
        driver.find_element_by_id("first_name").send_keys("")
        driver.find_element_by_id("last_name").clear()
        driver.find_element_by_id("last_name").send_keys("")
        driver.find_element_by_id("submit-profile").click()
        driver.find_element_by_id("preferences-btn").click()
        driver.find_element_by_css_selector("button.fw-logout-button").click()
        try: self.assertEqual("Fidus Writer - Log In.", driver.title)
        except AssertionError as e: self.verificationErrors.append(str(e))

    def is_element_present(self, how, what):
        try: self.driver.find_element(by=how, value=what)
        except NoSuchElementException as e: return False
        return True

    def is_alert_present(self):
        try: self.driver.switch_to_alert()
        except NoAlertPresentException as e: return False
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
        finally: self.accept_next_alert = True

    def tearDown(self):
        self.assertEqual([], self.verificationErrors)

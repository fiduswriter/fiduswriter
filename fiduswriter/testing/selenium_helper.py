from builtins import object
import re
import os
import time
from urllib3.exceptions import MaxRetryError
from selenium.common.exceptions import ElementClickInterceptedException
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromiumService
from webdriver_manager.chrome import ChromeDriverManager
from webdriver_manager.core.os_manager import ChromeType

from allauth.account.models import EmailAddress
from django.contrib.auth.hashers import make_password
from django.contrib.auth import get_user_model
from django.test import Client
import logging

logger = logging.getLogger(__name__)


class SeleniumHelper(object):
    """
    Methods for manipulating django and the browser for testing purposes.
    """

    def find_urls(self, string):
        return re.findall(
            (
                "http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*(),]|"
                "(?:%[0-9a-fA-F][0-9a-fA-F]))+"
            ),
            string,
        )

    # create django data
    def create_user(
        self, username="User", email="test@example.com", passtext="p4ssw0rd"
    ):
        User = get_user_model()
        user = User.objects.create(
            username=username,
            email=email,
            password=make_password(passtext),
            is_active=True,
        )
        user.save()

        # avoid the unverified-email login trap
        EmailAddress.objects.create(
            user=user, email=email, verified=True, primary=True
        ).save()

        return user

    # drive browser
    def login_user(self, user, driver, client):
        client.force_login(user=user)
        cookie = client.cookies["sessionid"]
        if driver.current_url == "data:,":
            # To set the cookie at the right domain we load the front page.
            driver.get("%s%s" % (self.live_server_url, "/"))
        driver.add_cookie(
            {
                "name": "sessionid",
                "value": cookie.value,
                "secure": False,
                "path": "/",
            }
        )
        driver.refresh()

    def logout_user(self, driver, client):
        client.logout()
        driver.delete_cookie("sessionid")

    def wait_until_file_exists(self, path, wait_time):
        count = 0
        while not os.path.exists(path):
            time.sleep(1)
            count += 1
            if count > wait_time:
                break

    def retry_click(self, driver, selector, retries=5):
        count = 0
        while count < retries:
            try:
                WebDriverWait(driver, self.wait_time).until(
                    EC.element_to_be_clickable(selector)
                ).click()
                break
            except ElementClickInterceptedException:
                count += 1
                time.sleep(1)

    @classmethod
    def get_drivers(cls, number, download_dir=False, user_agent=False):
        # django native clients, to be used for faster login.
        clients = []
        for i in range(number):
            clients.append(Client())
        drivers = []
        wait_time = 0
        options = webdriver.ChromeOptions()
        if download_dir:
            prefs = {
                "download.default_directory": download_dir,
                "download.prompt_for_download": False,
                "download.directory_upgrade": True,
            }
            options.add_experimental_option("prefs", prefs)
        if user_agent:
            options.add_argument("user-agent={}".format(user_agent))
        if os.getenv("CI"):
            options.binary_location = "/usr/bin/google-chrome-stable"
            options.add_argument("--headless=new")
            options.add_argument("--disable-gpu")
            wait_time = 20
        else:
            wait_time = 6
        for i in range(number):
            driver = webdriver.Chrome(
                service=ChromiumService(
                    ChromeDriverManager(
                        chrome_type=ChromeType.GOOGLE
                    ).install()
                ),
                options=options,
            )
            drivers.append(driver)
        for driver in drivers:
            # Set sizes of browsers so that all buttons are visible.
            driver.set_window_position(0, 0)
            driver.set_window_size(1920, 1080)
        cls.drivers = drivers
        return {"clients": clients, "drivers": drivers, "wait_time": wait_time}

    def tearDown(self):
        # Source: https://stackoverflow.com/a/39606065
        result = self._outcome.result
        ok = all(
            test != self for test, text in result.errors + result.failures
        )
        if ok:
            for driver in self.drivers:
                self.leave_site(driver)
        else:
            if not os.path.exists("screenshots"):
                os.makedirs("screenshots")
            for id, driver in enumerate(self.drivers, start=1):
                screenshotfile = (
                    f"screenshots/driver{id}-{self._testMethodName}.png"
                )
                logger.info(f"Saving {screenshotfile}")
                driver.save_screenshot(screenshotfile)
                self.leave_site(driver)
        return super().tearDown()

    def leave_site(self, driver):
        try:
            driver.execute_script(
                "if (window.theApp) {window.theApp.page = null;}"
            )
            driver.get("data:,")
        except MaxRetryError:
            pass

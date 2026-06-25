import os
import time
import sys
from testing.live_server import ChannelsLiveServerTestCase
from testing.selenium_helper import SeleniumHelper
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from django.conf import settings


class UsermediaOverviewTest(SeleniumHelper, ChannelsLiveServerTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
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
        self.base_url = self.live_server_url
        self.verificationErrors = []
        self.accept_next_alert = True
        self.user = self.create_user(
            username="Yeti", email="yeti@snowman.com", passtext="otter1"
        )
        self.login_user(self.user, self.driver, self.client)

    def tearDown(self):
        super().tearDown()
        if "coverage" in sys.modules.keys():
            # Cool down
            time.sleep(self.wait_time / 3)

    def test_overview(self):
        driver = self.driver
        driver.get(f"{self.base_url}/usermedia/")
        driver.find_element(
            By.CSS_SELECTOR, "button[title='Edit categories (Alt-e)']"
        ).click()

        def fill_last_category_input(text):
            inputs = driver.find_elements(
                By.CSS_SELECTOR, "#editCategoryList input.category-form"
            )
            last_input = inputs[-1]
            last_input.click()
            last_input.clear()
            last_input.send_keys(text)

        fill_last_category_input("landscape")
        driver.find_element(
            By.CSS_SELECTOR, "#editCategoryList tr:last-child .fw-add-input"
        ).click()
        fill_last_category_input("people")
        driver.find_element(
            By.CSS_SELECTOR, "#editCategoryList tr:last-child .fw-add-input"
        ).click()
        fill_last_category_input("scientific")
        driver.find_element(
            By.CSS_SELECTOR, ".fw-dialog-buttonpane button.fw-dark"
        ).click()
        driver.refresh()
        driver.find_element(
            By.CSS_SELECTOR, "button[title='Edit categories (Alt-e)']"
        ).click()
        category_titles = [
            el.get_attribute("value")
            for el in driver.find_elements(
                By.CSS_SELECTOR, "#editCategoryList input.category-form"
            )
            if el.get_attribute("value")
        ]
        self.assertCountEqual(
            ["landscape", "people", "scientific"],
            category_titles,
        )
        driver.find_element(
            By.CSS_SELECTOR, ".fw-dialog-buttonpane button.fw-orange"
        ).click()
        driver.find_element(
            By.CSS_SELECTOR, "button[title='Upload new image (Alt-u)']"
        ).click()
        driver.find_element(By.NAME, "title").click()
        driver.find_element(By.NAME, "title").send_keys("An image")
        driver.find_element(
            By.XPATH,
            "//div[contains(@class,'fw-checkable-label') and contains(text(), 'landscape')]",
        ).click()
        driver.find_element(
            By.XPATH,
            "//div[contains(@class,'fw-checkable-label') and contains(text(), 'people')]",
        ).click()
        # image path
        imagePath = os.path.join(
            settings.PROJECT_PATH, "usermedia/tests/uploads/image.png"
        )
        driver.find_element(By.NAME, "image").send_keys(imagePath)
        driver.find_element(
            By.CSS_SELECTOR, ".fw-dialog-buttonpane button.fw-dark"
        ).click()
        WebDriverWait(driver, self.wait_time).until(
            EC.text_to_be_present_in_element(
                (By.CSS_SELECTOR, ".edit-image"), "An image"
            )
        )
        self.assertEqual(
            "An image",
            driver.find_element(By.CSS_SELECTOR, ".edit-image").text,
        )
        search_input = driver.find_element(
            By.CSS_SELECTOR,
            ".fw-overview-menu-item .fw-button input[type=search]",
        )
        search_input.click()
        search_input.send_keys("fish")
        self.assertEqual(
            "No images found",
            driver.find_element(By.CSS_SELECTOR, ".fw-data-table td").text,
        )
        search_input.send_keys(Keys.BACKSPACE)
        search_input.send_keys(Keys.BACKSPACE)
        search_input.send_keys(Keys.BACKSPACE)
        search_input.send_keys(Keys.BACKSPACE)
        self.assertEqual(
            "An image",
            driver.find_element(By.CSS_SELECTOR, ".edit-image").text,
        )
        driver.find_element(By.CSS_SELECTOR, ".delete-image").click()
        driver.find_element(
            By.CSS_SELECTOR, ".fw-dialog-buttonpane button.fw-dark"
        ).click()
        image_placeholder = WebDriverWait(driver, self.wait_time).until(
            EC.presence_of_element_located((By.CLASS_NAME, "datatable-empty"))
        )
        self.assertEqual(
            "File Size (px) Added\nNo images available", image_placeholder.text
        )
        self.assertEqual([], self.verificationErrors)

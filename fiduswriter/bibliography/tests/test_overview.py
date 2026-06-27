import os
import time
from tempfile import mkdtemp

from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select

from django.conf import settings

from testing.selenium_helper import SeleniumHelper
from testing.live_server import ChannelsLiveServerTestCase


class BibliographyOverviewTest(SeleniumHelper, ChannelsLiveServerTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.download_dir = mkdtemp()
        driver_data = cls.get_drivers(1, cls.download_dir)
        cls.driver = driver_data["drivers"][0]
        cls.client = driver_data["clients"][0]
        cls.driver.implicitly_wait(driver_data["wait_time"])
        cls.wait_time = driver_data["wait_time"]

    @classmethod
    def tearDownClass(cls):
        cls.driver.quit()
        os.rmdir(cls.download_dir)
        super().tearDownClass()

    def setUp(self):
        self.base_url = self.live_server_url
        self.verificationErrors = []
        self.accept_next_alert = True
        self.user = self.create_user(
            username="Yeti", email="yeti@snowman.com", passtext="otter1"
        )
        self.login_user(self.user, self.driver, self.client)

    def test_overview(self):
        driver = self.driver
        driver.get(self.base_url + "/bibliography/")
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

        fill_last_category_input("Fish")
        driver.find_element(
            By.CSS_SELECTOR, "#editCategoryList tr:last-child .fw-add-input"
        ).click()
        fill_last_category_input("Table")
        driver.find_element(
            By.CSS_SELECTOR, "#editCategoryList tr:last-child .fw-add-input"
        ).click()
        fill_last_category_input("Jungle")
        driver.find_element(
            By.CSS_SELECTOR, ".fw-dialog-buttonpane button.fw-dark"
        ).click()

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
        try:
            self.assertCountEqual(
                ["Fish", "Table", "Jungle"],
                category_titles,
            )
        except AssertionError as e:
            self.verificationErrors.append(str(e))
        close_btn = driver.find_element(
            By.CSS_SELECTOR, ".fw-dialog-buttonpane button.fw-orange"
        )
        driver.execute_script("arguments[0].click();", close_btn)
        WebDriverWait(driver, self.wait_time).until(
            EC.invisibility_of_element_located((By.ID, "edit-categories"))
        )
        driver.find_element(
            By.CSS_SELECTOR,
            "button[title='Register new source (Alt-n)']",
        ).click()
        Select(driver.find_element(By.ID, "select-bibtype")).select_by_value(
            "article"
        )
        title_of_publication = WebDriverWait(driver, self.wait_time).until(
            EC.element_to_be_clickable(
                (By.CSS_SELECTOR, ".journaltitle .ProseMirror")
            )
        )
        title_of_publication.click()
        title_of_publication.send_keys("Title of publication")
        title = driver.find_element(By.CSS_SELECTOR, ".title .ProseMirror")
        title.click()
        title.send_keys("The title")
        first_name = driver.find_element(
            By.CSS_SELECTOR, ".given .ProseMirror"
        )
        first_name.click()
        first_name.click()  # TODO: We should not need two clicks
        first_name.send_keys("Hans")
        last_name = driver.find_element(
            By.CSS_SELECTOR, ".family .ProseMirror"
        )
        last_name.click()
        last_name.send_keys("Hansen")
        date_field = driver.find_element(By.CSS_SELECTOR, "input.fw-date")
        date_field.click()
        date_field.send_keys("1984")
        driver.find_element(By.LINK_TEXT, "Categories").click()
        WebDriverWait(driver, self.wait_time).until(
            EC.visibility_of_element_located(
                (By.CSS_SELECTOR, "#categories-field .fw-checkable-label")
            )
        )
        driver.find_element(
            By.XPATH,
            "//div[contains(@class,'fw-checkable-label') and normalize-space(text())='Table']",
        ).click()
        driver.find_element(
            By.XPATH,
            "//div[contains(@class,'fw-checkable-label') and normalize-space(text())='Jungle']",
        ).click()
        try:
            self.assertIn(
                "Jungle",
                [
                    el.text.strip()
                    for el in driver.find_elements(
                        By.CSS_SELECTOR,
                        "#categories-field .fw-checkable-label.fw-checked",
                    )
                ],
            )
        except AssertionError as e:
            self.verificationErrors.append(str(e))
        self.retry_click(
            driver, (By.CSS_SELECTOR, ".fw-dialog-buttonpane button.fw-dark")
        )
        # Make change to citation source
        self.retry_click(driver, (By.CSS_SELECTOR, ".edit-bib"))
        date_input = driver.find_element(
            By.CSS_SELECTOR, ".fw-entry-field.date input.fw-date"
        )
        date_input.click()
        date_input.send_keys(Keys.BACKSPACE)
        date_input.send_keys("5")
        self.retry_click(
            driver, (By.CSS_SELECTOR, ".fw-dialog-buttonpane button.fw-dark")
        )
        # Closed citation dialog
        search_input = driver.find_element(
            By.CSS_SELECTOR,
            ".fw-overview-menu-item .fw-button input[type=search]",
        )
        search_input.click()
        search_input.send_keys("women")
        try:
            self.assertEqual(
                "No sources found",
                driver.find_element(
                    By.CSS_SELECTOR,
                    ".fw-data-table.fw-large.datatable-table td",
                ).text,
            )
        except AssertionError as e:
            self.verificationErrors.append(str(e))
        search_input.send_keys(Keys.BACKSPACE)
        search_input.send_keys(Keys.BACKSPACE)
        search_input.send_keys(Keys.BACKSPACE)
        search_input.send_keys(Keys.BACKSPACE)
        search_input.send_keys(Keys.BACKSPACE)
        try:
            self.assertEqual(
                "The title",
                driver.find_element(
                    By.CSS_SELECTOR, ".fw-data-table-title .edit-bib"
                ).text,
            )
        except AssertionError as e:
            self.verificationErrors.append(str(e))
        driver.find_element(
            By.CSS_SELECTOR, "button[title='Import bibliography (Alt-u)']"
        ).click()
        # bibliography path
        bib_path = os.path.join(
            settings.PROJECT_PATH,
            "bibliography/tests/uploads/bibliography.bib",
        )
        driver.find_element(By.ID, "bib-uploader").send_keys(bib_path)
        driver.find_element(By.CSS_SELECTOR, "button.submit-import").click()
        book_title_el = WebDriverWait(driver, self.wait_time).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, ".fw-data-table tr:nth-child(2) .edit-bib")
            )
        )
        self.assertEqual(
            "Lean UX: Applying lean principles to improve user experience",
            book_title_el.text,
        )

        # Export through dropdown menu
        self.driver.find_element(
            By.CSS_SELECTOR, "tr:nth-child(1) > td > label"
        ).click()
        driver.find_element(By.CSS_SELECTOR, ".dt-bulk-dropdown").click()
        driver.find_element(
            By.CSS_SELECTOR, "li.content-menu-item:nth-child(2)"
        ).click()
        time.sleep(1)
        assert os.path.isfile(
            os.path.join(self.download_dir, "bibliography.zip")
        )
        os.remove(os.path.join(self.download_dir, "bibliography.zip"))

        # Delete bib entry
        entries = self.driver.find_elements(
            By.CSS_SELECTOR, ".fw-data-table .edit-bib"
        )
        self.assertEqual(len(entries), 2)
        driver.find_element(By.CSS_SELECTOR, ".delete-bib").click()
        driver.find_element(By.CSS_SELECTOR, "button.fw-dark").click()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.staleness_of(entries[0])
        )
        entries = self.driver.find_elements(
            By.CSS_SELECTOR, ".fw-data-table .edit-bib"
        )
        self.assertEqual(len(entries), 1)

        # Delete through dropdown menu
        self.driver.find_element(
            By.CSS_SELECTOR, "tr:nth-child(1) > td > label"
        ).click()
        driver.find_element(By.CSS_SELECTOR, ".dt-bulk-dropdown").click()
        driver.find_element(
            By.CSS_SELECTOR, "li.content-menu-item:nth-child(1)"
        ).click()
        driver.find_element(By.CSS_SELECTOR, "button.fw-dark").click()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.staleness_of(entries[0])
        )
        entries = self.driver.find_elements(
            By.CSS_SELECTOR, ".fw-data-table .edit-bib"
        )
        self.assertEqual(len(entries), 0)
        # Delete category
        driver.find_element(
            By.CSS_SELECTOR, "button[title='Edit categories (Alt-e)']"
        ).click()
        category_inputs = self.driver.find_elements(
            By.CSS_SELECTOR, "#editCategoryList tr"
        )
        self.assertEqual(len(category_inputs), 4)
        driver.find_element(
            By.CSS_SELECTOR, ".fw-add-input.icon-addremove"
        ).click()
        driver.find_element(
            By.CSS_SELECTOR, ".fw-dialog-buttonpane button.fw-dark"
        ).click()
        driver.find_element(
            By.CSS_SELECTOR, "button[title='Edit categories (Alt-e)']"
        ).click()
        category_inputs = self.driver.find_elements(
            By.CSS_SELECTOR, "#editCategoryList tr"
        )
        self.assertEqual(len(category_inputs), 3)

    def tearDown(self):
        self.assertEqual([], self.verificationErrors)
        return super().tearDown()

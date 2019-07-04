import os
from test.testcases import LiveTornadoTestCase
from test.selenium_helper import SeleniumHelper
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from django.conf import settings


class BibliographyOverviewTest(LiveTornadoTestCase, SeleniumHelper):

    @classmethod
    def setUpClass(cls):
        super(BibliographyOverviewTest, cls).setUpClass()
        cls.base_url = cls.live_server_url
        driver_data = cls.get_drivers(1)
        cls.driver = driver_data["drivers"][0]
        cls.client = driver_data["clients"][0]
        cls.driver.implicitly_wait(driver_data["wait_time"])
        cls.wait_time = driver_data["wait_time"]

    @classmethod
    def tearDownClass(cls):
        cls.driver.quit()
        super(BibliographyOverviewTest, cls).tearDownClass()

    def setUp(self):
        self.verificationErrors = []
        self.accept_next_alert = True
        self.user = self.create_user(
            username='Yeti',
            email='yeti@snowman.com',
            passtext='otter1'
        )
        self.login_user(self.user, self.driver, self.client)

    def test_overview(self):
        driver = self.driver
        driver.get(self.base_url + "/bibliography/")
        driver.find_element_by_xpath(
            "(.//*[normalize-space(text()) and normalize-space(.)="
            "'All categories'])[1]/following::button[1]"
        ).click()
        driver.find_element_by_xpath(
            "(.//*[normalize-space(text()) and normalize-space(.)="
            "'Edit Categories'])[1]/following::input[1]"
        ).click()
        driver.find_element_by_xpath(
            "(.//*[normalize-space(text()) and normalize-space(.)="
            "'Edit Categories'])[1]/following::input[1]"
        ).clear()
        driver.find_element_by_xpath(
            "(.//*[normalize-space(text()) and normalize-space(.)="
            "'Edit Categories'])[1]/following::input[1]"
        ).send_keys("Fish")
        driver.find_element_by_xpath(
            "(.//*[normalize-space(text()) and normalize-space(.)="
            "'Edit Categories'])[1]/following::span[3]"
        ).click()
        driver.find_element_by_xpath(
            "(.//*[normalize-space(text()) and normalize-space(.)="
            "'Edit Categories'])[1]/following::input[2]"
        ).click()
        driver.find_element_by_xpath(
            "(.//*[normalize-space(text()) and normalize-space(.)="
            "'Edit Categories'])[1]/following::input[2]"
        ).clear()
        driver.find_element_by_xpath(
            "(.//*[normalize-space(text()) and normalize-space(.)="
            "'Edit Categories'])[1]/following::input[2]"
        ).send_keys("Table")
        driver.find_element_by_xpath(
            "(.//*[normalize-space(text()) and normalize-space(.)="
            "'Edit Categories'])[1]/following::span[4]"
        ).click()
        driver.find_element_by_xpath(
            "(.//*[normalize-space(text()) and normalize-space(.)="
            "'Edit Categories'])[1]/following::input[3]"
        ).click()
        driver.find_element_by_xpath(
            "(.//*[normalize-space(text()) and normalize-space(.)="
            "'Edit Categories'])[1]/following::input[3]"
        ).clear()
        driver.find_element_by_xpath(
            "(.//*[normalize-space(text()) and normalize-space(.)="
            "'Edit Categories'])[1]/following::input[3]"
        ).send_keys("Jungle")
        driver.find_element_by_xpath(
            "(.//*[normalize-space(text()) and normalize-space(.)="
            "'Edit Categories'])[1]/following::button[2]"
        ).click()
        driver.find_element_by_xpath(
            "(.//*[normalize-space(text()) and normalize-space(.)="
            "'All categories'])[1]/following::button[1]"
        ).click()
        try:
            self.assertEqual("Fish", driver.find_element_by_id(
                "categoryTitle_1").get_attribute("value"))
        except AssertionError as e:
            self.verificationErrors.append(str(e))
        try:
            self.assertEqual("Table", driver.find_element_by_id(
                "categoryTitle_2").get_attribute("value"))
        except AssertionError as e:
            self.verificationErrors.append(str(e))
        driver.find_element_by_xpath(
            "(.//*[normalize-space(text()) and normalize-space(.)="
            "'Edit Categories'])[1]/following::button[2]"
        ).click()
        driver.find_element_by_xpath(
            "(.//*[normalize-space(text()) and normalize-space(.)="
            "'Edit categories'])[1]/following::button[1]"
        ).click()
        driver.find_element_by_id("select-bibtype").click()
        driver.find_element_by_css_selector(
            "#select-bibtype option[value=article]").click()
        title_of_publication = driver.find_element_by_css_selector(
            ".journaltitle .ProseMirror")
        title_of_publication.click()
        title_of_publication.send_keys("Title of publication")
        title = driver.find_element_by_css_selector(".title .ProseMirror")
        title.click()
        title.send_keys("The title")
        first_name = driver.find_element_by_css_selector(".given .ProseMirror")
        first_name.click()
        first_name.click()  # TODO: We should not need two clicks
        first_name.send_keys("Hans")
        last_name = driver.find_element_by_css_selector(".family .ProseMirror")
        last_name.click()
        last_name.send_keys("Hansen")
        date_field = driver.find_element_by_css_selector("input.date")
        date_field.click()
        date_field.send_keys("1984")
        driver.find_element_by_link_text("Categories").click()
        driver.find_element_by_xpath(
            "(.//*[normalize-space(text()) and normalize-space(.)="
            "'Categories'])[2]/following::div[1]"
        ).click()
        driver.find_element_by_xpath(
            "(.//*[normalize-space(text()) and normalize-space(.)="
            "'Table'])[1]/following::div[1]"
        ).click()
        try:
            self.assertEqual("Jungle", driver.find_element_by_xpath(
                "(.//*[normalize-space(text()) and normalize-space(.)="
                "'Table'])[1]/following::div[1]"
            ).text)
        except AssertionError as e:
            self.verificationErrors.append(str(e))
        driver.find_element_by_css_selector(
            "button.fw-dark"
        ).click()
        # Closed citation dialog
        search_input = driver.find_element_by_css_selector(
            ".fw-overview-menu-item .fw-button input[type=text]")
        search_input.click()
        search_input.send_keys("women")
        try:
            self.assertEqual(
                "No sources registered",
                driver.find_element_by_css_selector(
                    ".fw-data-table.fw-large.dataTable-table td"
                ).text
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
                driver.find_element_by_css_selector(
                    ".fw-data-table-title .edit-bib").text
            )
        except AssertionError as e:
            self.verificationErrors.append(str(e))
        driver.find_element_by_css_selector(
            "button[title='Upload BibTeX file']").click()
        # bibliography path
        bib_path = os.path.join(
            settings.PROJECT_PATH,
            'bibliography/tests/uploads/bibliography.bib'
        )
        driver.find_element_by_id("bib-uploader").send_keys(bib_path)
        driver.find_element_by_css_selector(
            "button.submit-import").click()
        book_title_el = WebDriverWait(driver, self.wait_time).until(
            EC.presence_of_element_located(
                (
                    By.CSS_SELECTOR,
                    ".fw-data-table tr:nth-child(2) .edit-bib"
                )
            )
        )
        self.assertEqual(
            'Lean UX: Applying lean principles to improve user experience',
            book_title_el.text
        )

    def tearDown(self):
        self.driver.quit()
        self.assertEqual([], self.verificationErrors)

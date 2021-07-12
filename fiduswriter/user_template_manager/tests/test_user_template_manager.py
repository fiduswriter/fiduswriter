import time
import os
from tempfile import mkdtemp

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.wait import WebDriverWait
from testing.testcases import LiveTornadoTestCase
from testing.selenium_helper import SeleniumHelper


class UserTemplateManagerTest(LiveTornadoTestCase, SeleniumHelper):
    fixtures = [
        'initial_documenttemplates.json',
        'initial_styles.json'
    ]

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.base_url = cls.live_server_url
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
        self.user = self.create_user(
            username='Yeti',
            email='yeti@snowman.com',
            passtext='otter1'
        )
        self.login_user(self.user, self.driver, self.client)

    def tearDown(self):
        self.leave_site(self.driver)

    def test_template_export_import(self):
        driver = self.driver
        driver.get(f"{self.base_url}/templates/")
        templates = self.driver.find_elements_by_css_selector(
            '.fw-contents tbody tr .far.fa-file'
        )
        self.assertEqual(
            len(templates),
            1
        )
        editable_templates = self.driver.find_elements_by_css_selector(
            '.fw-contents tbody tr .fw-data-table-title a'
        )
        self.assertEqual(
            len(editable_templates),
            0
        )
        self.driver.find_element_by_css_selector(
            '.entry-select'
        ).click()
        # Try to delete the default template - should fail
        self.driver.find_element_by_css_selector(
            '.dt-bulk-dropdown'
        ).click()
        self.driver.find_element_by_css_selector(
            'li.content-menu-item[data-index="0"]'
        ).click()
        alert_element = WebDriverWait(self.driver, self.wait_time).until(
            EC.visibility_of_element_located(
                (By.CLASS_NAME, 'alerts-error')
            )
        )
        self.assertEqual(alert_element.is_displayed(), True)
        # Duplicate default template
        self.driver.find_element_by_css_selector(
            '.dt-bulk-dropdown'
        ).click()
        self.driver.find_element_by_css_selector(
            'li.content-menu-item[data-index="1"]'
        ).click()
        time.sleep(1)
        editable_templates = self.driver.find_elements_by_css_selector(
            '.fw-contents tbody tr .fw-data-table-title a'
        )
        self.assertEqual(
            len(editable_templates),
            1
        )
        # Enter copied template and modify title
        editable_templates[0].click()
        title_field = self.driver.find_element_by_css_selector(
            'input.title'
        )
        title_field.send_keys(' COPY')
        self.driver.find_element_by_css_selector(
            'button.save'
        ).click()
        alert_element = WebDriverWait(self.driver, self.wait_time).until(
            EC.visibility_of_element_located(
                (By.CLASS_NAME, 'alerts-info')
            )
        )
        self.assertEqual(alert_element.is_displayed(), True)
        self.driver.refresh()
        # Download the file
        self.driver.find_element_by_css_selector(
            'button.download'
        ).click()
        alert_element = WebDriverWait(self.driver, self.wait_time).until(
            EC.visibility_of_element_located(
                (By.CLASS_NAME, 'alerts-info')
            )
        )
        self.assertEqual(alert_element.is_displayed(), True)
        time.sleep(1)
        file_path = os.path.join(
            self.download_dir,
            'copy-of-standard-article-copy.fidustemplate'
        )
        assert os.path.isfile(file_path)
        self.driver.refresh()
        self.driver.find_element_by_css_selector(
            'button.close'
        ).click()
        time.sleep(1)
        upload_button = WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (
                    By.XPATH,
                    '//*[normalize-space()="Upload FIDUSTEMPLATE file"]'
                )
            )
        )
        upload_button.click()
        self.driver.find_element_by_css_selector(
            '#fidus-template-uploader'
        ).send_keys(file_path)
        self.driver.find_element_by_xpath(
            '//*[normalize-space()="Import"]'
        ).click()
        time.sleep(1)
        editable_templates = self.driver.find_elements_by_css_selector(
            '.fw-contents tbody tr .fw-data-table-title a'
        )
        self.assertEqual(
            len(editable_templates),
            2
        )
        os.remove(file_path)

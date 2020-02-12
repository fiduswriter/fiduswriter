import time
from selenium.webdriver.common.by import By
from testing.testcases import LiveTornadoTestCase
from testing.selenium_helper import SeleniumHelper


class PreloginTest(LiveTornadoTestCase, SeleniumHelper):
    fixtures = [
        'initial_terms.json',
    ]

    @classmethod
    def setUpClass(cls):
        super(PreloginTest, cls).setUpClass()
        cls.base_url = cls.live_server_url
        driver_data = cls.get_drivers(1)
        cls.driver = driver_data["drivers"][0]
        cls.client = driver_data["clients"][0]
        cls.driver.implicitly_wait(driver_data["wait_time"])
        cls.wait_time = driver_data["wait_time"]

    @classmethod
    def tearDownClass(cls):
        cls.driver.quit()
        super(PreloginTest, cls).tearDownClass()

    def test_flatpage(self):
        self.driver.get(self.base_url + "/")
        self.driver.find_element(
            By.CSS_SELECTOR,
            "a[href='/pages/terms/']"
        ).click()
        time.sleep(1)
        self.assertEqual(
            self.driver.find_element(
                By.CSS_SELECTOR,
                "h3"
            ).text,
            'Your Account and Documents on the Website'
        )
        self.driver.find_element(
            By.CSS_SELECTOR,
            "a[href='/pages/privacy/']"
        ).click()
        self.assertEqual(
            self.driver.find_element(
                By.CSS_SELECTOR,
                "h3:nth-child(4)"
            ).text,
            'B. Collecting personal information'
        )

    def test_language_switch(self):
        driver = self.driver
        driver.get(self.base_url + "/")
        self.driver.find_element(
            By.ID,
            "lang-selection"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "#lang-selection option[value=es]"
        ).click()
        self.assertEqual(
            self.driver.find_element(
                By.CSS_SELECTOR,
                "html[lang=es] h1.fw-login-title"
            ).text,
            'INICIAR SESIÓN'
        )
        self.assertEqual(
            self.driver.find_element(
                By.ID,
                "lang-selection"
            ).get_attribute('value'),
            'es'
        )
        self.driver.find_element(
            By.ID,
            "lang-selection"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "#lang-selection option[value=en]"
        ).click()
        self.assertEqual(
            self.driver.find_element(
                By.CSS_SELECTOR,
                "html[lang=en] h1.fw-login-title"
            ).text,
            'LOG IN'
        )
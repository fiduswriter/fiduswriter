from selenium.webdriver.common.by import By
from testing.testcases import LiveTornadoTestCase
from testing.selenium_helper import SeleniumHelper


class AccessTest(LiveTornadoTestCase, SeleniumHelper):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.base_url = cls.live_server_url
        cls.wait_time = 10

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()

    def test_ie11(self):
        driver_data = self.get_drivers(
            1,
            user_agent=(
                'Mozilla/5.0 (compatible, MSIE 11, Windows NT 6.3; '
                'Trident/7.0; rv:11.0) like Gecko'
            )
        )
        driver = driver_data["drivers"][0]
        driver.implicitly_wait(driver_data["wait_time"])
        driver.get(self.base_url + "/")
        h1 = driver.find_element(
            By.CSS_SELECTOR,
            "h1"
        )
        self.assertEqual(
            h1.text,
            'Browser not supported'
        )
        driver.quit()

    def test_robots(self):
        driver_data = self.get_drivers(
            1,
            user_agent=(
                'Mozilla/5.0 (compatible; Googlebot/2.1; '
                '+http://www.google.com/bot.html)'
            )
        )
        driver = driver_data["drivers"][0]
        driver.implicitly_wait(driver_data["wait_time"])
        driver.get(self.base_url + "/robots.txt")
        body = driver.find_element(
            By.CSS_SELECTOR,
            "body"
        )
        self.assertEqual(
            body.text,
            'User-agent: * Disallow: /* Allow: /$'
        )
        driver.quit()

    def test_hello(self):
        driver_data = self.get_drivers(1)
        driver = driver_data["drivers"][0]
        driver.implicitly_wait(driver_data["wait_time"])
        driver.get(self.base_url + "/hello-tornado")
        body = driver.find_element(
            By.CSS_SELECTOR,
            "body"
        )
        self.assertEqual(
            body.text,
            'Hello from tornado'
        )
        driver.quit()

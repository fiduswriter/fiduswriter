from testing.testcases import LiveTornadoTestCase
from testing.selenium_helper import SeleniumHelper
from selenium.webdriver.common.by import By
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


class SendFeedbackTest(LiveTornadoTestCase, SeleniumHelper):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.base_url = cls.live_server_url
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
        self.verificationErrors = []
        self.accept_next_alert = True
        self.user = self.create_user(
            username='Yeti',
            email='yeti@snowman.com',
            passtext='otter1'
        )

    def test_sendfeedback(self):
        self.driver.get(self.base_url)
        self.driver.find_element(By.CSS_SELECTOR, ".feedback-tab").click()
        self.driver.find_element(By.ID, "message").click()
        self.driver.find_element(By.ID, "message").send_keys(
            "I found a problem."
        )
        self.driver.find_element(By.ID, "feedbackbutton").click()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.element_to_be_clickable(
                (
                    By.ID,
                    "response-message"
                )
            )
        )
        assert self.driver.find_element(
            By.ID,
            "response-message"
        ).text == "Thank you for your report!"
        self.driver.find_element(By.ID, "closeFeedback").click()
        self.driver.find_element(By.ID, "id_login").send_keys("Yeti")
        self.driver.find_element(By.ID, "id_password").send_keys("otter1")
        self.driver.find_element(By.ID, "login-submit").click()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (
                    By.ID,
                    "preferences-btn"
                )
            )
        )
        self.driver.find_element(By.CSS_SELECTOR, ".feedback-tab").click()
        self.driver.find_element(By.ID, "message").click()
        self.driver.find_element(By.ID, "message").send_keys(
            "I found another problem."
        )
        self.driver.find_element(By.ID, "feedbackbutton").click()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.element_to_be_clickable(
                (
                    By.ID,
                    "response-message"
                )
            )
        )
        assert self.driver.find_element(
            By.ID,
            "response-message"
        ).text == "Thank you for your report!"
        self.driver.find_element(By.ID, "closeFeedback").click()
        self.driver.find_element(By.ID, "preferences-btn").click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "#preferences-btn > .fw-string-avatar"
        ).click()
        self.driver.find_element(By.CSS_SELECTOR, ".fw-logout-button").click()

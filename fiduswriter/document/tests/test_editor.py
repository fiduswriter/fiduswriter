from testing.testcases import LiveTornadoTestCase
from testing.selenium_helper import SeleniumHelper
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains


class EditorTest(LiveTornadoTestCase, SeleniumHelper):
    fixtures = [
        'initial_documenttemplates.json',
        'initial_styles.json',
    ]

    @classmethod
    def setUpClass(cls):
        super(EditorTest, cls).setUpClass()
        cls.base_url = cls.live_server_url
        driver_data = cls.get_drivers(1)
        cls.driver = driver_data["drivers"][0]
        cls.client = driver_data["clients"][0]
        cls.driver.implicitly_wait(driver_data["wait_time"])
        cls.wait_time = driver_data["wait_time"]

    @classmethod
    def tearDownClass(cls):
        cls.driver.quit()
        super(EditorTest, cls).tearDownClass()

    def setUp(self):
        self.verificationErrors = []
        self.accept_next_alert = True
        self.user1 = self.create_user(
            username='Yeti',
            email='yeti@snowman.com',
            passtext='otter'
        )

    def tearDown(self):
        self.leave_site(self.driver)

    def test_track_changes(self):
        self.driver.get(self.base_url)
        self.driver.find_element(By.ID, "id_login").send_keys("Yeti")
        self.driver.find_element(By.ID, "id_password").send_keys("otter")
        self.driver.find_element(By.ID, "login-submit").click()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (
                    By.CSS_SELECTOR,
                    ".new_document button"
                )
            )
        )
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".new_document button"
        ).click()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.CLASS_NAME, 'editor-toolbar'))
        )
        self.driver.find_element(By.CSS_SELECTOR, ".article-title").click()
        self.driver.find_element(By.CSS_SELECTOR, ".article-title").send_keys(
            "A test article with tracked changes"
        )
        self.driver.find_element(By.CSS_SELECTOR, ".article-body").click()
        self.driver.find_element(By.CSS_SELECTOR, ".article-body").send_keys(
            "First I type "
        )
        self.driver.find_element(
            By.CSS_SELECTOR,
            "button[title=Strong]"
        ).click()
        self.driver.find_element(By.CSS_SELECTOR, ".article-body").send_keys(
            "some"
        )
        self.driver.find_element(
            By.CSS_SELECTOR,
            "button[title=Strong]"
        ).click()
        self.driver.find_element(By.CSS_SELECTOR, ".article-body").send_keys(
            " standard "
        )
        self.driver.find_element(
            By.CSS_SELECTOR,
            "button[title=Emphasis]"
        ).click()
        self.driver.find_element(By.CSS_SELECTOR, ".article-body").send_keys(
            "text"
        )
        self.driver.find_element(
            By.CSS_SELECTOR,
            "button[title=Emphasis]"
        ).click()
        self.driver.find_element(By.CSS_SELECTOR, ".article-body").send_keys(
            " here.\nI'll even write a second paragraph."
        )
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".header-menu:nth-child(5) > .header-nav-item"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "li:nth-child(1) > .fw-pulldown-item"
        ).click()
        self.driver.find_element(By.CSS_SELECTOR, ".article-body").click()
        ActionChains(self.driver).double_click(
            self.driver.find_element(By.CSS_SELECTOR, ".article-body strong")
        ).perform()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "button[title=Strong]"
        ).click()
        ActionChains(self.driver).double_click(
            self.driver.find_element(By.CSS_SELECTOR, ".article-body em")
        ).perform()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "button[title=Strong]"
        ).click()
        ActionChains(self.driver).send_keys(
            Keys.RIGHT
        ).send_keys(
            Keys.RIGHT
        ).send_keys(
            Keys.RIGHT
        ).send_keys(
            Keys.RIGHT
        ).send_keys(
            Keys.RIGHT
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.RIGHT
        ).send_keys(
            Keys.RIGHT
        ).send_keys(
            Keys.RIGHT
        ).send_keys(
            "insertion"
        ).send_keys(
            Keys.RIGHT
        ).send_keys(
            Keys.RIGHT
        ).send_keys(
            Keys.RIGHT
        ).send_keys(
            Keys.ENTER
        ).send_keys(
            Keys.UP
        ).perform()
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".editor-toolbar .multiButtons"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".editor-toolbar .multiButtons .ui-button:nth-child(5)"
        ).click()

        change_tracking_boxes = self.driver.find_elements_by_css_selector(
            '.margin-box.track'
        )
        self.assertEqual(
            len(change_tracking_boxes),
            6
        )

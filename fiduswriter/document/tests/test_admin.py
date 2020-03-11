import time
import os
from tempfile import mkdtemp

from testing.testcases import LiveTornadoTestCase
from testing.selenium_helper import SeleniumHelper
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains


class AdminTest(LiveTornadoTestCase, SeleniumHelper):
    fixtures = [
        'initial_documenttemplates.json',
        'initial_styles.json',
    ]

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.base_url = cls.live_server_url
        cls.download_dir = mkdtemp()
        cls.base_admin_url = cls.base_url + '/admin/'
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
        self.verificationErrors = []
        self.accept_next_alert = True
        self.admin = self.create_user(
            username='Admin',
            email='admin@admin.com',
            passtext='password'
        )
        self.admin.is_superuser = True
        self.admin.is_staff = True
        self.admin.save()
        self.user1 = self.create_user(
            username='User1',
            email='user1@user.com',
            passtext='password'
        )
        self.user2 = self.create_user(
            username='User2',
            email='user2@user.com',
            passtext='password'
        )

    def tearDown(self):
        self.leave_site(self.driver)

    def test_maintenance(self):
        self.driver.get(self.base_admin_url)
        username = self.driver.find_element(By.ID, "id_username")
        username.send_keys("Admin")
        self.driver.find_element(By.ID, "id_password").send_keys("password")
        self.driver.find_element(By.CSS_SELECTOR, "input[type=submit]").click()
        time.sleep(2)
        self.driver.find_element(
            By.CSS_SELECTOR,
            "a[href='/admin/document/document/maintenance/']"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "#update"
        ).click()
        self.assertEqual(
            1,
            len(self.driver.find_elements_by_css_selector(
                '#update[disabled]'
            ))
        )

    def test_templates(self):
        self.driver.get(self.base_admin_url)
        username = self.driver.find_element(By.ID, "id_username")
        username.send_keys("Admin")
        self.driver.find_element(By.ID, "id_password").send_keys("password")
        self.driver.find_element(By.CSS_SELECTOR, "input[type=submit]").click()
        time.sleep(2)
        self.driver.find_element(
            By.CSS_SELECTOR,
            "a[href='/admin/document/documenttemplate/']"
        ).click()
        template_links = self.driver.find_elements_by_css_selector(
            '#result_list tbody a'
        )
        self.assertEqual(
            1,
            len(template_links)
        )
        self.driver.find_element(
            By.CSS_SELECTOR,
            "input[type=checkbox].action-select"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "select[name=action]"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "option[value=duplicate]"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "button[type=submit]"
        ).click()
        template_links = self.driver.find_elements_by_css_selector(
            '#result_list tbody a'
        )
        self.assertEqual(
            2,
            len(template_links)
        )
        self.driver.find_element(
            By.CSS_SELECTOR,
            "a[href='/admin/document/documenttemplate/2/change/']"
        ).click()
        self.driver.find_element(By.CSS_SELECTOR, "input.title").click()
        ActionChains(self.driver).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            'Special Article'
        ).perform()
        self.driver.find_element(By.CSS_SELECTOR, "input.import-id").click()
        ActionChains(self.driver).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            'special-article'
        ).perform()
        self.driver.find_element(
            By.CSS_SELECTOR,
            (
                "#template-editor > table:nth-child(2) > tbody > tr > "
                "td.to-column > div.to-container > div:nth-child(5) > "
                "div.doc-part-header > ul > li > span"
            )
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            (
                "#template-editor > table:nth-child(2) > tbody > tr > "
                "td.to-column > div.to-container > div:nth-child(5) > "
                "div.attrs > div:nth-child(28) > div.initial > div > "
                "div.ProseMirror > div > p"
            )
        ).click()
        ActionChains(self.driver).send_keys(
            "Initial body"
        ).perform()
        self.driver.find_element(
            By.CSS_SELECTOR,
            (
                "#template-editor > table:nth-child(2) > tbody > tr > "
                "td.to-column > div.to-container > div:nth-child(5) > "
                "div.attrs > div:nth-child(29) > div.instructions > div > "
                "div.ProseMirror > p"
            )
        ).click()
        ActionChains(self.driver).send_keys(
            "Body instructions"
        ).perform()
        self.driver.find_element(
            By.ID,
            "id_user"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "#id_user > option:nth-child(3)"
        ).click()
        # Modify a document style
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".document-style"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "input.slug"
        ).send_keys('fish')
        self.driver.find_element(
            By.CSS_SELECTOR,
            "[aria-describedby=document-style-dialog] button.fw-dark"
        ).click()
        time.sleep(1)
        # Delete a document style
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".document-style"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "[aria-describedby=document-style-dialog] button.fw-orange"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "[aria-describedby=confirmdeletion] button.fw-dark"
        ).click()
        # Download export template file
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".export-template"
        ).click()
        export_template_link = self.driver.find_element(
            By.CSS_SELECTOR,
            ".export-template-file a"
        )
        et_file = export_template_link.get_attribute("href").split('/')[-1]
        export_template_link.click()
        time.sleep(1)
        assert os.path.isfile(
            os.path.join(self.download_dir, et_file)
        )
        # Delete export template
        old_len_export_templates = len(
            self.driver.find_elements_by_css_selector(
                '.export-template'
            )
        )
        self.driver.find_element(
            By.CSS_SELECTOR,
            "[aria-describedby=export-template-dialog] button.fw-orange"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "[aria-describedby=confirmdeletion] button.fw-dark"
        ).click()
        time.sleep(1)
        len_export_templates = len(self.driver.find_elements_by_css_selector(
            '.export-template'
        ))
        self.assertEqual(
            old_len_export_templates - 1,
            len_export_templates
        )
        old_len_export_templates = len_export_templates
        # Upload export template file
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".export-template .fa-plus-circle"
        ).click()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, ".fw-media-file-input")
            )
        ).send_keys(os.path.join(self.download_dir, et_file))
        time.sleep(1)
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".ui-dialog .fw-dark"
        ).click()
        time.sleep(1)
        len_export_templates = len(self.driver.find_elements_by_css_selector(
            '.export-template'
        ))
        self.assertEqual(
            old_len_export_templates + 1,
            len_export_templates
        )
        os.remove(os.path.join(self.download_dir, et_file))
        self.driver.find_element(
            By.CSS_SELECTOR,
            "input[type=submit]"
        ).click()
        self.assertEqual(
            self.driver.find_element(
                By.CSS_SELECTOR,
                "td.field-user"
            ).text,
            'User1'
        )
        self.assertEqual(
            self.driver.find_element(
                By.CSS_SELECTOR,
                "th.field-title"
            ).text,
            'Special Article'
        )
        self.driver.find_element(
            By.CSS_SELECTOR,
            "a[href='/admin/logout/']"
        ).click()
        self.driver.get(self.base_url)
        # Logging in as User 1
        self.driver.find_element(By.ID, "id_login").send_keys("User1")
        self.driver.find_element(By.ID, "id_password").send_keys("password")
        self.driver.find_element(By.ID, "login-submit").click()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.element_to_be_clickable(
                (
                    By.CSS_SELECTOR,
                    ".new_document.dropdown"
                )
            )
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            (
                "#fw-overview-menu > li.fw-overview-menu-item.new_document."
                "dropdown > div.fw-pulldown.fw-left > ul > li:nth-child(2) > "
                "span"
            )
        ).click()
        body_text = WebDriverWait(self.driver, self.wait_time).until(
            EC.element_to_be_clickable(
                (
                    By.CSS_SELECTOR,
                    ".article-body"
                )
            )
        ).text
        self.assertEqual(
            body_text,
            'Initial body'
        )
        self.assertEqual(
            self.driver.find_element(
                By.CSS_SELECTOR,
                ".margin-box.help"
            ).text,
            'Body instructions'
        )
        # Open share dialog
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".header-menu:nth-child(1) > .header-nav-item"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "li:nth-child(1) > .fw-pulldown-item"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".ui-dialog .fw-add-button"
        ).click()
        self.driver.find_element(
            By.ID,
            "new-member-user-string"
        ).click()
        ActionChains(self.driver).send_keys(
            "user2@user.com"
        ).send_keys(
            Keys.TAB
        ).send_keys(
            Keys.RETURN
        ).perform()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.element_to_be_clickable(
                (By.CSS_SELECTOR, ".collaborator-tr .fa-caret-down")
            )
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".fw-pulldown-item[data-rights=write]"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".ui-dialog .fw-dark"
        ).click()
        self.driver.find_element(
            By.ID,
            "close-document-top"
        ).click()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.element_to_be_clickable((By.ID, 'preferences-btn'))
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".fw-logout-button"
        ).click()
        # Login as User2
        self.driver.find_element(By.ID, "id_login").send_keys("User2")
        self.driver.find_element(By.ID, "id_password").send_keys("password")
        self.driver.find_element(By.ID, "login-submit").click()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.element_to_be_clickable(
                (
                    By.CSS_SELECTOR,
                    "a[href='/document/1/']"
                )
            )
        ).click()
        body_text = WebDriverWait(self.driver, self.wait_time).until(
            EC.element_to_be_clickable(
                (
                    By.CSS_SELECTOR,
                    ".article-body"
                )
            )
        ).text
        self.assertEqual(
            body_text,
            'Initial body'
        )
        self.assertEqual(
            self.driver.find_element(
                By.CSS_SELECTOR,
                ".margin-box.help"
            ).text,
            'Body instructions'
        )
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".article-body"
        ).click()
        ActionChains(self.driver).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            Keys.BACKSPACE
        ).send_keys(
            'text'
        ).perform()
        # Create regular copy
        old_body = self.driver.find_element(By.CSS_SELECTOR, ".article-body")
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".header-menu:nth-child(1) > .header-nav-item"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "li:nth-child(4) > .fw-pulldown-item"
        ).click()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.staleness_of(old_body)
        )
        body_text = WebDriverWait(self.driver, self.wait_time).until(
            EC.element_to_be_clickable(
                (
                    By.CSS_SELECTOR,
                    ".article-body"
                )
            )
        ).text
        self.assertEqual(
            body_text,
            'Initial text'
        )
        self.assertEqual(
            self.driver.find_element(
                By.CSS_SELECTOR,
                ".margin-box.help"
            ).text,
            'Body instructions'
        )
        # Create copy with different template
        old_body = self.driver.find_element(By.CSS_SELECTOR, ".article-body")
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".header-menu:nth-child(1) > .header-nav-item"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "li:nth-child(5) > .fw-pulldown-item"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".ui-dialog select.fw-button"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "option[value='standard-article']"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            ".ui-dialog button.fw-dark"
        ).click()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.staleness_of(old_body)
        )
        body_text = WebDriverWait(self.driver, self.wait_time).until(
            EC.element_to_be_clickable(
                (
                    By.CSS_SELECTOR,
                    ".article-body"
                )
            )
        ).text
        # The text should still be the same, but there should be no
        # instruction boxes in this template.
        self.assertEqual(
            body_text,
            'Initial text'
        )
        instruction_boxes = self.driver.find_elements_by_css_selector(
            '.margin-box.help'
        )
        self.assertEqual(
            0,
            len(instruction_boxes)
        )

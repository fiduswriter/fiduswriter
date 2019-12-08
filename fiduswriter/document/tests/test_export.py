import os
import time
from tempfile import mkdtemp

from testing.testcases import LiveTornadoTestCase
from testing.selenium_helper import SeleniumHelper
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.common.keys import Keys
from django.conf import settings


class ExportTest(LiveTornadoTestCase, SeleniumHelper):
    """Test whether Fidus Writer exports files in all the formats.
    Note that it does not validate the export files."""
    fixtures = [
        'initial_documenttemplates.json',
        'initial_styles.json',
    ]

    @classmethod
    def setUpClass(cls):
        super(ExportTest, cls).setUpClass()
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
        super(ExportTest, cls).tearDownClass()

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

    def test_export(self):
        self.driver.get(self.base_url)
        self.driver.find_element(By.ID, "id_login").send_keys("Yeti")
        self.driver.find_element(By.ID, "id_password").send_keys("otter")
        self.driver.find_element(By.ID, "login-submit").click()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.element_to_be_clickable(
                (
                    By.CSS_SELECTOR,
                    ".new_document button"
                )
            )
        ).click()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.CLASS_NAME, 'editor-toolbar'))
        )
        self.driver.find_element(By.CSS_SELECTOR, ".article-title").click()
        self.driver.find_element(By.CSS_SELECTOR, ".article-title").send_keys(
            "Title"
        )
        self.driver.find_element(By.CSS_SELECTOR, ".article-body").click()
        self.driver.find_element(By.CSS_SELECTOR, ".article-body").send_keys(
            "No styling"
        )
        self.driver.find_element(
            By.CSS_SELECTOR,
            "button[title=Strong]"
        ).click()
        self.driver.find_element(By.CSS_SELECTOR, ".article-body").send_keys(
            "strong"
        )
        self.driver.find_element(
            By.CSS_SELECTOR,
            "button[title=Strong]"
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "button[title=Emphasis]"
        ).click()
        self.driver.find_element(By.CSS_SELECTOR, ".article-body").send_keys(
            "emph"
        )
        self.driver.find_element(
            By.CSS_SELECTOR,
            "button[title=Emphasis]"
        ).click()
        self.driver.find_element(By.CSS_SELECTOR, ".article-body").send_keys(
            Keys.ENTER
        )
        self.driver.find_element(By.CSS_SELECTOR, ".fa-list-ol").click()
        self.driver.find_element(By.CSS_SELECTOR, ".article-body").send_keys(
            "ordered list"
        )
        self.driver.find_element(By.CSS_SELECTOR, ".article-body").send_keys(
            Keys.ENTER
        )
        self.driver.find_element(By.CSS_SELECTOR, ".fa-list-ul").click()
        self.driver.find_element(By.CSS_SELECTOR, ".article-body").send_keys(
            "bullet list"
        )
        self.driver.find_element(By.CSS_SELECTOR, ".article-body").send_keys(
            Keys.ENTER
        )
        self.driver.find_element(By.CSS_SELECTOR, ".article-body").send_keys(
            Keys.ENTER
        )
        self.driver.find_element(
            By.CSS_SELECTOR,
            "button[title=Blockquote]"
        ).click()
        self.driver.find_element(By.CSS_SELECTOR, ".article-body").send_keys(
            "block quote"
        )
        self.driver.find_element(By.CSS_SELECTOR, ".article-body").send_keys(
            Keys.ENTER
        )
        self.driver.find_element(By.CSS_SELECTOR, ".fa-link").click()
        self.driver.find_element(By.CSS_SELECTOR, ".link-title").click()
        self.driver.find_element(By.CSS_SELECTOR, ".link-title").send_keys(
            "Sports"
        )
        self.driver.find_element(By.CSS_SELECTOR, ".link").click()
        self.driver.find_element(By.CSS_SELECTOR, ".link").send_keys(
            "https://www.sports.com"
        )
        self.driver.find_element(By.CSS_SELECTOR, ".fw-dark").click()
        self.driver.find_element(By.CSS_SELECTOR, ".fa-asterisk").click()
        self.driver.find_element(
            By.CSS_SELECTOR, ".footnote-container > p").click()
        self.driver.find_element(
            By.CSS_SELECTOR, ".footnote-container > p").send_keys('A footnote')
        self.driver.find_element(By.CSS_SELECTOR, ".article-body").click()
        self.driver.find_element(By.CSS_SELECTOR, ".fa-book").click()
        # click on 'Register new source' button
        register_new_source = WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (By.CLASS_NAME, 'register-new-bib-source')
            )
        )
        register_new_source.click()

        # select source
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.ID, 'select-bibtype'))
        )

        # click on article
        Select(
            self.driver.find_element_by_id("select-bibtype")
        ).select_by_visible_text("Article")

        # fill the values
        title_of_publication = self.driver.find_element_by_css_selector(
            '.journaltitle .ProseMirror'
        )
        title_of_publication.click()
        title_of_publication.send_keys("My publication title")

        title = self.driver.find_element_by_css_selector(
            '.title .ProseMirror')
        title.click()
        title.send_keys("My title")

        author_firstName = self.driver.find_element_by_css_selector(
            '.author .given .ProseMirror')
        author_firstName.click()
        author_firstName.send_keys("John")

        author_lastName = self.driver.find_element_by_css_selector(
            '.family .ProseMirror')
        author_lastName.click()
        author_lastName.send_keys("Doe")

        publication_date = self.driver.find_element_by_css_selector(
            '.date .date'
        )
        publication_date.click()
        publication_date.send_keys("2012")

        # click on Submit button
        self.driver.find_element_by_xpath(
            '//*[contains(@class, "ui-button") and normalize-space()="Submit"]'
        ).click()

        # Wait for source to be listed
        WebDriverWait(self.driver, self.wait_time).until(
            EC.element_to_be_clickable(
                (
                    By.CSS_SELECTOR,
                    '#selected-cite-source-table .selected-source'
                )
            )
        )
        # click on Insert button
        self.driver.find_element_by_css_selector('.insert-citation').click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            'button[title="Horizontal line"]'
        ).click()
        self.driver.find_element(By.CSS_SELECTOR, ".article-body").send_keys(
            Keys.DOWN
        )
        button = self.driver.find_element_by_xpath('//*[@title="Figure"]')
        button.click()

        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.CLASS_NAME, "caption"))
        ).send_keys('Figure')

        # click on 'Insert image' button
        self.driver.find_element_by_id('insert-figure-image').click()

        upload_button = WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (
                    By.XPATH,
                    '//*[normalize-space()="Add new image"]'
                )
            )
        )

        upload_button.click()

        # image path
        imagePath = os.path.join(
            settings.PROJECT_PATH,
            'document/tests/uploads/image.png'
        )

        # inorder to select the image we send the image path in the
        # LOCAL MACHINE to the input tag
        upload_image_url = WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (By.XPATH, '//*[@id="editimage"]/div[1]/input[2]')
            )
        )
        upload_image_url.send_keys(imagePath)

        # click on 'Upload' button
        self.driver.find_element_by_xpath(
            '//*[contains(@class, "ui-button") and normalize-space()="Upload"]'
        ).click()

        # click on 'Use image' button
        WebDriverWait(self.driver, self.wait_time).until(
            EC.element_to_be_clickable(
                (By.CSS_SELECTOR, '.fw-data-table i.fa-check')
            )
        )

        self.driver.find_element_by_xpath(
            '//*[normalize-space()="Use image"]'
        ).click()

        # click on 'Insert' button
        self.driver.find_element_by_css_selector("button.fw-dark").click()
        self.driver.find_element(By.CSS_SELECTOR, ".fa-table").click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "table.insert-table-selection tr:nth-child(2) > td:nth-child(2)"
        ).click()
        self.driver.find_element(By.CSS_SELECTOR, ".fw-dark").click()
        self.driver.find_element(
            By.CSS_SELECTOR, "tr:nth-child(1) > td:nth-child(1) > p").click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "tr:nth-child(1) > td:nth-child(1) > p").send_keys('one')
        self.driver.find_element(
            By.CSS_SELECTOR, "tr:nth-child(1) > td:nth-child(2) > p").click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "tr:nth-child(1) > td:nth-child(2) > p").send_keys('two')
        self.driver.find_element(
            By.CSS_SELECTOR, "tr:nth-child(2) > td:nth-child(1) > p").click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "tr:nth-child(2) > td:nth-child(1) > p").send_keys('three')
        self.driver.find_element(
            By.CSS_SELECTOR, "tr:nth-child(2) > td:nth-child(2)").click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            "tr:nth-child(2) > td:nth-child(2)").send_keys('four')
        # Document with many features has been created let's see if we can
        # export it from the editor.

        # HTML
        self.driver.find_element(
            By.CSS_SELECTOR,
            '.header-nav-item[title="Export of the document contents"]'
        ).click()
        self.driver.find_element_by_xpath(
            '//*[normalize-space()="HTML"]'
        ).click()
        time.sleep(1)
        assert os.path.isfile(os.path.join(
            self.download_dir, 'title.html.zip'))
        os.remove(os.path.join(self.download_dir, 'title.html.zip'))

        # EPUB
        self.driver.find_element(
            By.CSS_SELECTOR,
            '.header-nav-item[title="Export of the document contents"]'
        ).click()
        self.driver.find_element_by_xpath(
            '//*[normalize-space()="Epub"]'
        ).click()
        time.sleep(1)
        assert os.path.isfile(os.path.join(self.download_dir, 'title.epub'))
        os.remove(os.path.join(self.download_dir, 'title.epub'))

        # LaTeX
        self.driver.find_element(
            By.CSS_SELECTOR,
            '.header-nav-item[title="Export of the document contents"]'
        ).click()
        self.driver.find_element_by_xpath(
            '//*[normalize-space()="LaTeX"]'
        ).click()
        time.sleep(1)
        assert os.path.isfile(os.path.join(
            self.download_dir, 'title.latex.zip'))
        os.remove(os.path.join(self.download_dir, 'title.latex.zip'))

        # JATS
        self.driver.find_element(
            By.CSS_SELECTOR,
            '.header-nav-item[title="Export of the document contents"]'
        ).click()
        self.driver.find_element_by_xpath(
            '//*[normalize-space()="JATS (experimental)"]'
        ).click()
        time.sleep(1)
        assert os.path.isfile(os.path.join(
            self.download_dir, 'title.jats.zip'))
        os.remove(os.path.join(self.download_dir, 'title.jats.zip'))

        # DOCX
        self.driver.find_element(
            By.CSS_SELECTOR,
            '.header-nav-item[title="Export of the document contents"]'
        ).click()
        self.driver.find_element_by_xpath(
            '//*[normalize-space()="Classic (DOCX)"]'
        ).click()
        time.sleep(1)
        assert os.path.isfile(os.path.join(self.download_dir, 'title.docx'))
        os.remove(os.path.join(self.download_dir, 'title.docx'))

        # ODT
        self.driver.find_element(
            By.CSS_SELECTOR,
            '.header-nav-item[title="Export of the document contents"]'
        ).click()
        self.driver.find_element_by_xpath(
            '//*[normalize-space()="Free (ODT)"]'
        ).click()
        time.sleep(1)
        assert os.path.isfile(os.path.join(self.download_dir, 'title.odt'))
        os.remove(os.path.join(self.download_dir, 'title.odt'))

        # Save a revision
        self.driver.find_element(
            By.CSS_SELECTOR, '.header-nav-item[title="File handling"]').click()
        self.driver.find_element_by_xpath(
            '//*[normalize-space()="Save revision"]'
        ).click()
        self.driver.find_element_by_css_selector(
            '.revision-note'
        ).send_keys('First revision')
        self.driver.find_element_by_xpath(
            '//*[normalize-space()="Save"]'
        ).click()

        # Exit the editor
        self.driver.find_element(
            By.ID,
            "close-document-top"
        ).click()
        WebDriverWait(self.driver, self.wait_time).until(
            EC.element_to_be_clickable((By.ID, 'preferences-btn'))
        )

        # Export from overview
        self.driver.find_element_by_css_selector(
            'tr:nth-child(1) > td > label'
        ).click()

        # Native
        WebDriverWait(self.driver, self.wait_time).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, '.dt-bulk-dropdown'))
        ).click()
        self.driver.find_element_by_xpath(
            '//*[normalize-space()="Download selected as Fidus document"]'
        ).click()
        time.sleep(1)
        assert os.path.isfile(
            os.path.join(self.download_dir, 'title.fidus')
        )
        os.remove(os.path.join(self.download_dir, 'title.fidus'))

        # EPUB
        WebDriverWait(self.driver, self.wait_time).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, '.dt-bulk-dropdown'))
        ).click()
        self.driver.find_element_by_xpath(
            '//*[normalize-space()="Export selected as Epub"]'
        ).click()
        time.sleep(1)
        assert os.path.isfile(
            os.path.join(self.download_dir, 'title.epub')
        )
        os.remove(os.path.join(self.download_dir, 'title.epub'))

        # HTML
        WebDriverWait(self.driver, self.wait_time).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, '.dt-bulk-dropdown'))
        ).click()
        self.driver.find_element_by_xpath(
            '//*[normalize-space()="Export selected as HTML"]'
        ).click()
        time.sleep(1)
        assert os.path.isfile(
            os.path.join(self.download_dir, 'title.html.zip')
        )
        os.remove(os.path.join(self.download_dir, 'title.html.zip'))

        # LaTeX
        WebDriverWait(self.driver, self.wait_time).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, '.dt-bulk-dropdown'))
        ).click()
        self.driver.find_element_by_xpath(
            '//*[normalize-space()="Export selected as LaTeX"]'
        ).click()
        time.sleep(1)
        assert os.path.isfile(
            os.path.join(self.download_dir, 'title.latex.zip')
        )
        os.remove(os.path.join(self.download_dir, 'title.latex.zip'))

        # JATS
        WebDriverWait(self.driver, self.wait_time).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, '.dt-bulk-dropdown'))
        ).click()
        self.driver.find_element_by_xpath(
            '//*[normalize-space()="Export selected as JATS"]'
        ).click()
        time.sleep(1)
        assert os.path.isfile(
            os.path.join(self.download_dir, 'title.jats.zip')
        )
        os.remove(os.path.join(self.download_dir, 'title.jats.zip'))

        # Revision
        self.driver.find_element_by_css_selector(
            '.revisions'
        ).click()
        self.driver.find_element_by_css_selector(
            '.download-revision'
        ).click()
        time.sleep(1)
        assert os.path.isfile(
            os.path.join(self.download_dir, 'title.fidus')
        )
        os.remove(os.path.join(self.download_dir, 'title.fidus'))

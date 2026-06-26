"""
Selenium / E2E tests for the inline math and inline reference editor features.

Two feature modes are tested for each node type:
  • Toolbar / dialog approach  – the feature preference is **disabled** (default).
    Equations and references are inserted via toolbar buttons that open modal
    dialogs.  Editing is triggered via a "dropup" pop-over that appears when
    the node is clicked.
  • Inline trigger approach – the feature preference is **enabled**.
    Typing ``$`` in the editor body activates the inline math widget
    (``.inline-math-input`` inside ``.inline-math-widget``).
    Typing ``@`` activates the inline reference widget
    (``.inline-reference-input`` inside ``.inline-reference-widget``).

Background – document template
───────────────────────────────
The "Standard Article" template used by the fixtures has this part order:
    title → heading_part "subtitle" (optional, hidden) →
    contributors_part "authors" (optional, hidden) →
    richtext_part "abstract" (optional, hidden, contains a *paragraph* node) →
    tags_part "keywords" (optional, hidden) →
    richtext_part "body" (always visible, contains a *paragraph* node)

The abstract section initially contains a plain paragraph.  Cross-reference
tests need a *heading* node in the abstract so that ProseMirror assigns an
auto-generated ID (like ``H12345678``).  The helper
``_create_heading_in_abstract`` replicates the approach used in
``test_crossrefs_and_internal_links`` in ``test_editor.py``: navigate to the
abstract paragraph, type the heading text, then apply the "Heading 3" block
format via the toolbar dropdown.
"""

import sys
import time
import json

from testing.live_server import ChannelsLiveServerTestCase
from testing.selenium_helper import SeleniumHelper

from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains

from bibliography.models import Entry as BibEntry

from django.test import override_settings

MAIL_STORAGE_NAME = "inline_editors"


@override_settings(MAIL_STORAGE_NAME=MAIL_STORAGE_NAME)
@override_settings(EMAIL_BACKEND="testing.mail.EmailBackend")
class InlineEditorsTest(SeleniumHelper, ChannelsLiveServerTestCase):
    """
    End-to-end tests for the inline math (``$``) and inline reference (``@``)
    editor plug-ins, as well as the corresponding toolbar / dialog flows that
    are active when those preferences are disabled.
    """

    fixtures = [
        "initial_documenttemplates.json",
        "initial_styles.json",
    ]

    # ─────────────────────────────────────────────────────────────────────────
    # Class-level setup / teardown
    # ─────────────────────────────────────────────────────────────────────────

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

    # ─────────────────────────────────────────────────────────────────────────
    # Per-test setup / teardown
    # ─────────────────────────────────────────────────────────────────────────

    def setUp(self):
        self.base_url = self.live_server_url
        self.user = self.create_user(
            username="Yeti", email="yeti@snowman.com", passtext="otter"
        )
        return super().setUp()

    def tearDown(self):
        self.driver.execute_script("window.localStorage.clear()")
        self.driver.execute_script("window.sessionStorage.clear()")
        super().tearDown()
        if "coverage" in sys.modules:
            # Give the coverage collector a moment to finish writing.
            time.sleep(self.wait_time / 3)

    # ─────────────────────────────────────────────────────────────────────────
    # Helper methods
    # ─────────────────────────────────────────────────────────────────────────

    def login_and_create_doc(self):
        """
        Log in via session cookie, navigate to the document overview, and
        create a new (non-encrypted) document.  Waits until the editor toolbar
        is visible before returning.
        """
        self.login_user(self.user, self.driver, self.client)
        self.driver.get(self.base_url)
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.ID, "user-preferences"))
        )
        self.click_new_document_button(self.driver)
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.CLASS_NAME, "editor-toolbar"))
        )

    def enable_abstract_section(self):
        """
        Enable the optional "Abstract" richtext section via the editor
        Settings menu.  Replicates the identical three-click sequence used in
        ``test_crossrefs_and_internal_links`` in ``test_editor.py``.
        """
        self.driver.find_element(
            By.CSS_SELECTOR,
            "#header-navigation > div:nth-child(3) > span",
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            (
                "#header-navigation > div:nth-child(3) > div "
                "> ul > li:nth-child(1) > span"
            ),
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            (
                "#header-navigation > div:nth-child(3) > div "
                "> ul > li:nth-child(1) > div > ul > li:nth-child(3) > span"
            ),
        ).click()

    def _create_heading_in_abstract(self, heading_text):
        """
        Enable the abstract section, navigate the cursor there, type
        *heading_text*, convert the paragraph to a Heading 3 node (which
        causes ProseMirror to assign an auto-generated ``id`` such as
        ``H12345678``), and return the resulting ``.doc-abstract h3`` element.

        Background: the "Standard Article" fixture initialises the abstract
        richtext_part with a plain paragraph node.  A cross-referenceable
        heading must be created explicitly by selecting "Heading 3" from the
        block-format dropdown — the same technique used in the existing
        ``test_crossrefs_and_internal_links`` test in ``test_editor.py``.

        The ``jumpHiddenNodesPlugin`` in the editor skips the hidden keywords /
        authors sections, so pressing ``Keys.LEFT`` once from the beginning of
        the (empty) body paragraph reliably moves the cursor into the abstract
        paragraph.
        """
        self.enable_abstract_section()

        # Navigate to the abstract paragraph: click the empty body paragraph
        # and press LEFT once to cross the section boundary.
        self.driver.find_element(By.CSS_SELECTOR, ".doc-body").click()
        ActionChains(self.driver).send_keys(Keys.LEFT).send_keys(
            heading_text
        ).perform()

        # Apply the "Heading 3" block format (4th item in the format dropdown).
        # This is the same selector used in test_editor.py.
        self.driver.find_element(
            By.CSS_SELECTOR,
            "#toolbar > div > div > div:nth-child(3) > div",
        ).click()
        self.driver.find_element(
            By.CSS_SELECTOR,
            (
                "#toolbar > div > div > div:nth-child(3) > div > div > "
                "ul > li:nth-child(4) > span > label"
            ),
        ).click()

        # Allow the heading-ID plugin time to assign the auto-generated ID.
        time.sleep(1)

        return WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, ".doc-abstract h3")
            )
        )

    def set_math_dialog_value(self, value):
        """
        Set the LaTeX value of the MathLive ``<math-field>`` custom element
        that is shown inside the equation insert / update dialog.

        MathLive exposes a ``value`` property setter on the custom element
        which accepts raw LaTeX; we drive it via ``execute_script`` because
        Selenium's ``send_keys`` does not interact correctly with the shadow
        DOM of the custom element.
        """
        math_field_el = WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.TAG_NAME, "math-field"))
        )
        self.driver.execute_script(
            "arguments[0].value = arguments[1]", math_field_el, value
        )

    def create_bib_entry(self, entry_key="smith2012"):
        """
        Create a bibliography ``Entry`` owned by ``self.user`` and return the
        ORM instance.  Calling this before ``login_and_create_doc`` ensures
        the entry is available in the citation dialog.
        """
        return BibEntry.objects.create(
            entry_key=entry_key,
            entry_owner=self.user,
            bib_type="article",
            cats=[],
            fields={"title": [{"type": "text", "text": "Test Article"}]},
        )

    # ─────────────────────────────────────────────────────────────────────────
    # Test: equations via toolbar (inline_math DISABLED)
    # ─────────────────────────────────────────────────────────────────────────

    def test_equation_toolbar(self):
        """
        Insert and edit an equation using the Math toolbar button when the
        ``inline_math`` preference is **disabled** (default).

        Flow:
          1. Open the equation dialog via the toolbar Math button.
          2. Set a LaTeX value via the MathLive field and click Insert.
          3. Verify the ``.equation`` node's ``data-equation`` attribute.
          4. Click the equation to reveal the "Edit / Remove" dropup.
          5. Click Edit, change the LaTeX, click Update.
          6. Verify the updated ``data-equation`` attribute.
        """
        self.login_and_create_doc()

        # ── Step 1: open the Math dialog ──────────────────────────────────
        self.driver.find_element(By.CSS_SELECTOR, ".doc-body").click()
        self.driver.find_element(By.XPATH, '//*[@title="Math"]').click()

        # The dialog is open when the "Insert" button is present.
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".insert-math"))
        )

        # ── Step 2: set LaTeX and insert ──────────────────────────────────
        self.set_math_dialog_value("a^{2}")
        self.driver.find_element(By.CSS_SELECTOR, ".insert-math").click()

        # ── Step 3: verify the inserted node ──────────────────────────────
        equation = WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, ".doc-body .equation")
            )
        )
        self.assertEqual(equation.get_attribute("data-equation"), "a^{2}")

        # ── Step 4: click the equation → dropup appears ───────────────────
        equation.click()

        # ── Step 5: click Edit, change LaTeX, click Update ────────────────
        WebDriverWait(self.driver, self.wait_time).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, ".edit-equation"))
        ).click()

        # Dialog reopens – now in "Update" mode.
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".insert-math"))
        )
        self.set_math_dialog_value("b^{2}")
        self.driver.find_element(By.CSS_SELECTOR, ".insert-math").click()

        # ── Step 6: verify the updated node ───────────────────────────────
        updated_eq = WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, ".doc-body .equation")
            )
        )
        self.assertEqual(updated_eq.get_attribute("data-equation"), "b^{2}")

    # ─────────────────────────────────────────────────────────────────────────
    # Test: equations via inline $ trigger (inline_math ENABLED)
    # ─────────────────────────────────────────────────────────────────────────

    def test_equation_inline(self):
        """
        Insert and edit an equation using the inline ``$`` trigger when the
        ``inline_math`` preference is **enabled**.

        How the widget works
        ────────────────────
        Typing ``$`` in the editor body causes the plugin to:
          • delete the ``$`` character from the ProseMirror document, and
          • activate a contenteditable widget whose initial ``textContent``
            is ``"$"`` (the activation character becomes the query prefix).

        The plugin then enforces that the widget content always starts with
        ``"$"``.  On Tab / Enter commit the leading ``"$"`` is stripped before
        the ``equation`` node is created, so ``data-equation`` only contains
        the LaTeX body.

        Flow:
          1. Type ``$`` → widget appears with ``"$"`` as initial content.
          2. Append ``"a^2"`` → send Tab → equation node with
             ``data-equation="a^2"`` is inserted.
          3. Click the equation → widget reopens showing ``"$a^2"`` with
             the cursor at the end.
          4. Press Backspace × 3 to remove ``"a^2"``, leaving ``"$"``.
             Type ``"b^2"`` → send Tab →
             equation node updated to ``data-equation="b^2"``.

        Note on content replacement inside the widget
        ─────────────────────────────────────────────
        Ctrl+A inside the widget's ``contenteditable="plaintext-only"``
        span triggers a ``focusout`` that the widget's handler treats as a
        commit, closing the widget with the *old* content.  Simple Backspace
        presses delete characters one at a time without side effects.
        """
        self.user.preferences = {"inline_math": True}
        self.user.save()
        self.login_and_create_doc()

        # ── Step 1: activate the widget via `$` ───────────────────────────
        self.driver.find_element(By.CSS_SELECTOR, ".doc-body").click()
        ActionChains(self.driver).send_keys("$").perform()

        # Wait for the inline math input to appear.
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, ".inline-math-input")
            )
        )
        math_input = self.driver.find_element(
            By.CSS_SELECTOR, ".inline-math-input"
        )

        # ── Step 2: type LaTeX body and commit ────────────────────────────
        # The widget already contains "$"; we append the LaTeX body.
        math_input.send_keys("a^2")
        math_input.send_keys(Keys.TAB)

        # The leading "$" is stripped when the equation node is created.
        equation = WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, ".doc-body .equation")
            )
        )
        self.assertEqual(equation.get_attribute("data-equation"), "a^2")

        # ── Step 3: click the equation → widget reopens for editing ───────
        equation.click()

        edit_input = WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, ".inline-math-input")
            )
        )

        # ── Step 4: replace LaTeX body and commit ──────────────────────────
        # The widget opens with "$a^2" and the cursor placed at the end.
        # A brief pause lets the widget's setTimeout(input.focus) settle so
        # subsequent key events land on the widget input, not the editor.
        # Three Backspaces remove "a^2" leaving "$"; then type "b^2" and Tab.
        time.sleep(0.3)
        edit_input.send_keys(Keys.BACKSPACE * 3 + "b^2")
        time.sleep(0.3)
        edit_input.send_keys(Keys.TAB)

        updated_eq = WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, ".doc-body .equation")
            )
        )
        self.assertEqual(updated_eq.get_attribute("data-equation"), "b^2")

    # ─────────────────────────────────────────────────────────────────────────
    # Test: cross-references via toolbar (inline_references DISABLED)
    # ─────────────────────────────────────────────────────────────────────────

    def test_cross_reference_toolbar(self):
        """
        Insert a cross-reference via the Link toolbar dialog when the
        ``inline_references`` preference is **disabled** (default).

        The test also verifies that the cross-reference node text updates
        automatically when the target heading's text changes (ProseMirror
        propagates the new ``title`` attribute to all referencing nodes).

        Flow:
          1. Create a Heading 3 in the abstract section with text
             "My Heading".
          2. In the body, open the Link dialog and select "My Heading" from
             the cross-reference ``<select>``.
          3. Confirm the dialog; verify ``span.cross-reference`` shows
             "My Heading".
          4. Change the abstract heading to "Updated Heading".
          5. Verify the cross-reference now shows "Updated Heading".
        """
        self.login_and_create_doc()

        # ── Step 1: create a referenceable heading in the abstract ─────────
        self._create_heading_in_abstract("My Heading")

        # ── Step 2: open the Link dialog and choose the heading ────────────
        self.driver.find_element(By.CSS_SELECTOR, ".doc-body").click()
        ActionChains(self.driver).send_keys("See: ").perform()

        self.driver.find_element(By.XPATH, '//*[@title="Link"]').click()

        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.ID, "edit-link"))
        )

        # Open the cross-reference <select> (second div block in the dialog).
        self.driver.find_element(
            By.CSS_SELECTOR, "#edit-link > div:nth-child(2) > select"
        ).click()

        # Select the <option> whose visible text contains "My Heading".
        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (
                    By.XPATH,
                    '//*[@id="edit-link"]//option[contains(text(),"My Heading")]',
                )
            )
        ).click()

        # Confirm the dialog.
        self.driver.find_element(
            By.CSS_SELECTOR,
            "div.fw-dialog button.fw-dark",
        ).click()

        # ── Step 3: verify the inserted cross-reference ────────────────────
        cross_ref = WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, ".doc-body .cross-reference")
            )
        )
        self.assertEqual(cross_ref.text, "My Heading")

        # ── Step 4: update the heading text ───────────────────────────────
        # Use Home + Shift+End to select only the heading text (NOT Ctrl+A,
        # which selects the entire ProseMirror document and would destroy the
        # heading node along with its auto-generated id attribute).
        heading_el = self.driver.find_element(
            By.CSS_SELECTOR, ".doc-abstract h3"
        )
        heading_el.click()
        ActionChains(self.driver).send_keys(Keys.HOME).key_down(
            Keys.SHIFT
        ).send_keys(Keys.END).key_up(Keys.SHIFT).send_keys(
            "Updated Heading"
        ).perform()

        # Give ProseMirror time to propagate the heading-title change to all
        # cross-reference nodes that reference it.
        time.sleep(1)

        # ── Step 5: verify the cross-reference auto-updated ───────────────
        cross_ref = self.driver.find_element(
            By.CSS_SELECTOR, ".doc-body .cross-reference"
        )
        self.assertEqual(cross_ref.text, "Updated Heading")

    # ─────────────────────────────────────────────────────────────────────────
    # Test: cross-references via inline @# trigger (inline_references ENABLED)
    # ─────────────────────────────────────────────────────────────────────────

    def test_cross_reference_inline(self):
        """
        Insert a cross-reference via the inline ``@#<id>`` trigger when the
        ``inline_references`` preference is **enabled**.

        Also verifies that:
          • The widget opens when clicking an existing cross-reference node and
            shows the expected ``@#<id>`` query string.
          • Pressing Escape cancels the widget without modifying the node.

        Flow:
          1. Set ``inline_references = True``, log in, create a doc.
          2. Create a Heading 3 ("My Heading") in the abstract section and
             capture its auto-generated ``id`` attribute.
          3. In the body, type ``@``.  The widget activates with ``"@"`` as
             its initial content.
          4. Append ``"#<heading_id>"`` and press Tab → cross-reference node
             showing "My Heading" is inserted.
          5. Update the heading text to "Updated Heading"; verify the
             cross-reference auto-updates.
          6. Click the cross-reference → widget re-opens; verify its content
             contains ``@#<heading_id>``.
          7. Press Escape → widget closes; verify the node still shows
             "Updated Heading" (Escape = cancel, no change).
        """
        self.user.preferences = {"inline_references": True}
        self.user.save()
        self.login_and_create_doc()

        # ── Step 2: create the heading and get its ID ─────────────────────
        self._create_heading_in_abstract("My Heading")

        heading_id = self.driver.execute_script(
            "return document.querySelector('.doc-abstract h3').getAttribute('id')"
        )
        self.assertIsNotNone(
            heading_id, "The heading node should have an auto-generated ID"
        )
        self.assertTrue(
            heading_id.startswith("H"),
            f"Unexpected heading ID format: {heading_id}",
        )

        # ── Step 3: activate the inline reference widget via `@` ──────────
        self.driver.find_element(By.CSS_SELECTOR, ".doc-body").click()
        ActionChains(self.driver).send_keys("See: ").perform()
        ActionChains(self.driver).send_keys("@").perform()

        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, ".inline-reference-input")
            )
        )
        ref_input = self.driver.find_element(
            By.CSS_SELECTOR, ".inline-reference-input"
        )

        # ── Step 4: append the cross-reference target and commit ──────────
        # The widget already contains "@"; appending "#<id>" gives "@#<id>".
        ref_input.send_keys(f"#{heading_id}")
        ref_input.send_keys(Keys.TAB)

        cross_ref = WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, ".doc-body .cross-reference")
            )
        )
        self.assertEqual(cross_ref.text, "My Heading")

        # ── Step 5: update the heading; verify the cross-reference follows ─
        # Use Home + Shift+End to select only the heading text (NOT Ctrl+A,
        # which selects the entire document and destroys the heading node).
        heading_el = self.driver.find_element(
            By.CSS_SELECTOR, ".doc-abstract h3"
        )
        heading_el.click()
        ActionChains(self.driver).send_keys(Keys.HOME).key_down(
            Keys.SHIFT
        ).send_keys(Keys.END).key_up(Keys.SHIFT).send_keys(
            "Updated Heading"
        ).perform()

        time.sleep(1)

        cross_ref = self.driver.find_element(
            By.CSS_SELECTOR, ".doc-body .cross-reference"
        )
        self.assertEqual(cross_ref.text, "Updated Heading")

        # ── Step 6: click the cross-reference → widget opens ──────────────
        cross_ref.click()

        edit_input = WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, ".inline-reference-input")
            )
        )

        # The plugin sets the widget query to "@#<heading_id>" (from
        # handleClickOn: query = `@#${node.attrs.id}`).
        input_text = (
            edit_input.get_attribute("textContent") or edit_input.text or ""
        )
        self.assertIn("@#", input_text)
        self.assertIn(heading_id, input_text)

        # ── Step 7: press Escape → widget cancels without modification ─────
        edit_input.send_keys(Keys.ESCAPE)

        cross_ref = WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, ".doc-body .cross-reference")
            )
        )
        self.assertEqual(cross_ref.text, "Updated Heading")

    # ─────────────────────────────────────────────────────────────────────────
    # Test: citations via toolbar (inline_references DISABLED)
    # ─────────────────────────────────────────────────────────────────────────

    def test_citation_toolbar(self):
        """
        Insert and edit a citation via the Cite toolbar button when the
        ``inline_references`` preference is **disabled** (default).

        Verifies the full insert → edit → locator round-trip using the
        ``#configure-citation`` dialog.

        Flow:
          1. Pre-create a bibliography entry (``smith2012``).
          2. Open the Cite dialog, select the entry, click Insert.
          3. Verify ``span.citation`` is present in the body.
          4. Click the citation → dropup → Edit.
          5. Fill the ``.fw-cite-page`` (locator) input with ``"p. 5"``.
          6. Click Update; verify ``data-references[0].locator == "p. 5"``.
        """
        # ── Step 1: pre-populate bibliography ─────────────────────────────
        self.create_bib_entry("smith2012")
        self.login_and_create_doc()

        # ── Step 2: open the Cite dialog and select the entry ──────────────
        self.driver.find_element(By.CSS_SELECTOR, ".doc-body").click()
        self.driver.find_element(By.XPATH, '//*[@title="Cite"]').click()

        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.ID, "configure-citation"))
        )

        bib_row = WebDriverWait(self.driver, self.wait_time).until(
            EC.element_to_be_clickable(
                (By.CSS_SELECTOR, "#my-sources .datatable-table tbody tr")
            )
        )
        bib_row.click()

        self.driver.find_element(By.ID, "add-cite-source").click()

        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (
                    By.CSS_SELECTOR,
                    "#selected-cite-source-table .selected-source",
                )
            )
        )

        self.driver.find_element(By.CSS_SELECTOR, ".insert-citation").click()

        # ── Step 3: verify the inserted citation node ──────────────────────
        citation = WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, ".doc-body span.citation")
            )
        )
        self.assertIsNotNone(citation)

        # ── Step 4: click the citation → dropup → Edit ────────────────────
        citation.click()

        WebDriverWait(self.driver, self.wait_time).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, ".edit-citation"))
        ).click()

        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located((By.ID, "configure-citation"))
        )

        # ── Step 5: fill the locator (page) field ─────────────────────────
        locator_input = WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (
                    By.CSS_SELECTOR,
                    "#selected-cite-source-table .fw-cite-page",
                )
            )
        )
        locator_input.click()
        locator_input.send_keys("p. 5")

        # ── Step 6: update and verify ─────────────────────────────────────
        self.driver.find_element(By.CSS_SELECTOR, ".insert-citation").click()

        updated_citation = WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, ".doc-body span.citation")
            )
        )
        refs_json = updated_citation.get_attribute("data-references")
        refs = json.loads(refs_json)
        self.assertEqual(
            refs[0].get("locator"),
            "p. 5",
            f"Expected locator 'p. 5' in data-references, got: {refs_json}",
        )

    # ─────────────────────────────────────────────────────────────────────────
    # Test: citations via inline @ trigger (inline_references ENABLED)
    # ─────────────────────────────────────────────────────────────────────────

    def test_citation_inline(self):
        """
        Insert and edit a citation via the inline ``@`` trigger when the
        ``inline_references`` preference is **enabled**.

        Inline citation syntax (from ``parseCitationText``):
          • ``@key``            → citation with no prefix/locator
          • ``@key[prefix]``    → citation with *prefix* only
          • ``@key[][locator]`` → empty first bracket = no prefix;
                                  second bracket = *locator*
          • ``@@key``           → textual (author-in-text) citation

        To add a locator without a prefix we use ``@smith2012[][p. 5]``.
        The regex ``/^([^\\[]+)(?:\\[(.*?)\\])?(?:\\[(.*?)\\])?$/`` stores
        the empty first bracket as ``match[2] = ""`` (falsy → no prefix) and
        the locator as ``match[3] = "p. 5"``.

        Flow:
          1. Pre-create ``smith2012``; set ``inline_references = True``; log in.
          2. Type ``@`` → widget activates with ``"@"`` as content.
          3. Append ``"smith2012"`` → send Tab → citation node inserted.
          4. Press Left Arrow → widget re-activates with ``"@smith2012"``
             and cursor at the end.
          5. Type ``"[][p. 5]"`` → send Tab → citation updated.
          6. Verify ``data-references[0].locator == "p. 5"``.

        Note on re-activating the widget via arrow key
        ───────────────────────────────────────────────
        After Tab commits the citation, ProseMirror places the cursor
        immediately after the citation node and focuses the editor.
        A short ``time.sleep`` lets that JavaScript settle before the
        Left Arrow is sent, so ProseMirror's ``handleKeyDown`` reliably
        detects ``nodeBefore.type === "citation"`` and activates the widget.
        """
        # ── Step 1: setup ─────────────────────────────────────────────────
        self.create_bib_entry("smith2012")
        self.user.preferences = {"inline_references": True}
        self.user.save()
        self.login_and_create_doc()

        # ── Step 2: activate the inline reference widget via `@` ──────────
        self.driver.find_element(By.CSS_SELECTOR, ".doc-body").click()
        ActionChains(self.driver).send_keys("@").perform()

        WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, ".inline-reference-input")
            )
        )
        ref_input = self.driver.find_element(
            By.CSS_SELECTOR, ".inline-reference-input"
        )

        # ── Step 3: type the citation key and commit ──────────────────────
        # The widget already contains "@"; appending "smith2012" gives
        # "@smith2012" which parseCitationText resolves to the entry.
        ref_input.send_keys("smith2012")
        ref_input.send_keys(Keys.TAB)

        # ── Step 4: wait for citation; re-activate widget via Left Arrow ───
        # After Tab commits, appendTransaction places the ProseMirror cursor
        # immediately after the citation node and view.focus() returns focus
        # to the editor.  We wait for the citation to appear, pause briefly
        # so the JavaScript event loop settles, then press Left Arrow.
        # ProseMirror's handleKeyDown detects nodeBefore === citation and
        # activates the inline widget with cursorAtStart=false (cursor at end).
        citation = WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, ".doc-body span.citation")
            )
        )
        self.assertIsNotNone(citation)
        time.sleep(0.5)
        # After ref_input.send_keys(TAB), Selenium's internal focus tracking
        # may no longer point at the ProseMirror editor even though
        # view.focus() was called from the widget's keydown handler.
        # ActionChains.send_keys() uses that stale tracking, so the arrow key
        # never reaches ProseMirror.  Sending it directly to the .ProseMirror
        # element is reliable: Chrome WebDriver re-focuses it via
        # element.focus() (not a click, so cursor position is preserved) and
        # then dispatches the key event there.
        self.driver.find_element(By.CSS_SELECTOR, ".ProseMirror").send_keys(
            Keys.ARROW_LEFT
        )

        edit_input = WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, ".inline-reference-input")
            )
        )

        # ── Step 5: append locator and commit ─────────────────────────────
        # The widget re-opens with "@smith2012" and the cursor at the end
        # (cursorAtStart=false for ArrowLeft activation).  Typing "[][p. 5]"
        # appends the locator brackets without touching the existing text.
        # A short pause lets the widget's focus settle before typing.
        time.sleep(0.3)
        edit_input.send_keys("[][p. 5]")
        time.sleep(0.3)
        edit_input.send_keys(Keys.TAB)

        # ── Step 6: verify the locator was stored ─────────────────────────
        updated_citation = WebDriverWait(self.driver, self.wait_time).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, ".doc-body span.citation")
            )
        )
        refs_json = updated_citation.get_attribute("data-references")
        refs = json.loads(refs_json)
        self.assertEqual(
            refs[0].get("locator"),
            "p. 5",
            f"Expected locator 'p. 5' in data-references, got: {refs_json}",
        )

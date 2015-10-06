# -*- coding: utf-8 -*-
from collections import namedtuple
from itertools import chain
from unittest import skip

from allauth.account.models import EmailAddress
from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import User

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from document.models import Document
from test.helpers import testCaretJS
from test.testcases import LiveTornadoTestCase
from test.mock.document_contents import *

# GLOBALS
global DRIVER

# CONSTANTS
SHORT_LOREM = "Lorem ipsum dolor sit amet, consectetur adipiscing elit."
LONG_LOREM = (
    "Ut enim ad minim veniam, quis nostrud exercitation ullamco"
    " laboris nisi ut aliquip ex ea commodo consequat. Duis aute"
    " irure dolor in reprehenderit in voluptate velit esse cillum"
    " dolore eu fugiat nulla pariatur. Excepteur sint occaecat"
    " cupidatat non proident, sunt in culpa qui officia deserunt"
    " mollit anim id est laborum."
)


# DATA
class Caret(dict):
    """
    Caret is {parent: String, node: Integer, offset: Integer}
    Represents the position of a caret in the document
        parent is a jQuery selector uniquely identifying the parent element of
               the caret
        node is index of the caret containing node inside the parent element
        offset is position of the caret inside the node
    """
    # not using a namedtuple, because they don't get converted properly to
    # objects when passed as javascript arguments
    pass

CaretTestCase = namedtuple(
    'CaretTestCase', [
        'name',             # string to be used as the test method name,
                            #   will be prepended with test_
        'description',      # string with a short description of what is
                            #   being tested
        'givenContents',    # DocumentContents string
        'givenCaret',       # position of caret at start of test
        'givenKeys',        # keys to send to the editor
        'expectedCaret',    # expected caret position at end of test
    ]
)

InsertionTestCase = namedtuple(
    'InsertionTestCase', [
        'name',             # string to be used as the test method name,
                            #   will be prepended with test_
        'description',      # string with a short description of what is
                            #   being tested
        'givenContents',    # DocumentContents string
        'givenCaret',       # position of caret at start of test
        'expectedContents', # expected document contents at end of test
        'expectedCaret',    # expected caret position at end of test
    ]

)


# TEST COMMONS
class DataCasesToTestMethodsMeta(type):
    """
    Generate test methods from data-driven cases.

    The class needs to have a 'cases' attribute.

    Each case needs to have a name and description attribute.
    """
    def __new__(mcs, name, bases, clsdict):

        def gen_test(case):
            def test(self):
                self.runCheck(case)
            test.__doc__ = case.description

            return test

        for c_ in clsdict.get('cases', tuple()):
            clsdict['test_%s' % c_.name] = gen_test(c_)

        return type.__new__(mcs, name, bases, clsdict)


class Manipulator(object):
    """
    Methods for manipulating django and the browser.
    """
    user = None
    username = 'Yeti'
    email = 'yeti@example.com'
    passtext = 'otter'

    # mixed
    def createAndLoginUser(self):
        """Creates a dummy user in the database, and logs in the browser as that
           user."""
        # TODO: replace with fixture
        self.user = self.createUser(self.username, self.email, self.passtext)
        self.loginUser(self.username, self.passtext)

    # create django data
    def createUser(self, username, email, passtext):
        user = User.objects.create(
            username=username,
            password=make_password(passtext),
            is_active=True
        )
        user.save()

        # avoid the unverified-email login trap
        EmailAddress.objects.create(
            user=user,
            email=email,
            verified=True,
        ).save()

        return user

    def createDocument(self, contents):
        doc = Document.objects.create(
            owner=self.user,
            contents=str(contents),
        )
        doc.save()
        return doc

    # drive browser
    def loginUser(self, username, passtext):
        DRIVER.get('%s%s' % (
            self.live_server_url,
            '/account/login/'
        ))
        (DRIVER
            .find_element_by_id('id_login')
            .send_keys(username))
        (DRIVER
            .find_element_by_id('id_password')
            .send_keys(passtext + Keys.RETURN))
        WebDriverWait(DRIVER, 10).until(
            EC.presence_of_element_located((By.ID, 'user-preferences'))
        )

    def loadDocumentEditor(self, doc):
        DRIVER.get("%s%s" % (
            self.live_server_url,
            doc.get_absolute_url()
        ))
        WebDriverWait(DRIVER, 10).until(
            EC.presence_of_element_located((By.ID, 'document-contents'))
        )

    # execute javascript
    def injectHelpers(self):
        return DRIVER.execute_script(
            'window.testCaret = %s' % testCaretJS
        )

    def getCaret(self):
        return DRIVER.execute_script(
            'return testCaret.getCaret(rangy.getSelection());'
        )

    def setCaret(self, caret):
        return DRIVER.execute_script(
            'testCaret.setCaret(rangy.getSelection(), arguments[0]);',
            caret
        )

    def caretIsAt(self, expectedCaret):
        return DRIVER.execute_script(
            '''
            return testCaret.caretsMatch(
                arguments[0],
                testCaret.getCaret(rangy.getSelection())
            );
            ''',
            expectedCaret
        )

    def getDocumentContents(self):
        return DRIVER.execute_script(
            """
            // refresh theDocument first
            editorHelpers.getUpdatesFromInputFields();

            return JSON.stringify(theDocument.contents);
            """
        )


class CaretPositionTest(LiveTornadoTestCase, Manipulator):
    """
    Base for all tests that check that Caret is at an expected position after
    entering a given series of keys.
    """
    def setUp(self):
        self.createAndLoginUser()

    def runCheck(self, caretCase):
        self.loadDocumentEditor(
            self.createDocument(caretCase.givenContents)
        )

        self.injectHelpers()
        self.setCaret(caretCase.givenCaret)
        (DRIVER.find_element_by_id('document-contents')
               .send_keys(caretCase.givenKeys))

        # grab caret from browser and compare in python,
        # to get more informative failure messages
        self.assertEqual(
            caretCase.expectedCaret,
            self.getCaret()
        )
        # test browser-side, in case caret grabbing is buggy
        self.assertTrue(self.caretIsAt(caretCase.expectedCaret))


# TEST MODULE SETUP
# DRIVER initialized in setUpModule isn't visible outside setUpModule
DRIVER = webdriver.Chrome()


def tearDownModule():
    DRIVER.quit()

# TESTS
""" !!! temporary
    ? What are the possible single-element actions?
      movement
        - within node
        - within node with selection
        - between nodes
        - between nodes with selection
      insertion
        - insert text within node
        - insert node within node
        - insert text with selection within node
        - insert text with selection across nodes
        - insert node with selection within node
        - insert node with selection across nodes
        - pasting rich text?
        - pasting non-text contents?
      deletion
        - delete next within node
        - delete next at end of node
        - delete previous within node
        - delete previous at start of node
      updating
        - change text style within inline token
        - change text style with selection across nodes
        - change type of element

    ? Where can the caret move within the main editor?
        + Text
        + BoldText
        + ItalicText
        + Link

    ? Where should the caret not be able to move to in the main editor?
        - Footnote
        - Citation
        - Equation
"""


class MovementInSingleChildParagraph(CaretPositionTest):
    __metaclass__ = DataCasesToTestMethodsMeta
    movement_within_short = [
        # movement within a short node
        CaretTestCase(**{
            'name': 'leftFromOneAfterDocStart',
            'description': "left arrow decrements caret offset",
            'givenContents': None,
            'givenCaret': Caret(
                parent='#document-contents > :eq(0) > :eq(0)',
                node=0,
                offset=1 + 0,
            ),
            'givenKeys': Keys.ARROW_LEFT,
            'expectedCaret': Caret(
                parent='#document-contents > :eq(0) > :eq(0)',
                node=0,
                offset=0,
            )
        }),
        CaretTestCase(**{
            'name': 'leftFromDocStart',
            'description': "left arrow does nothing when caret is at start of"
                           " document",
            'givenContents': None,
            'givenCaret': Caret(
                parent='#document-contents > :eq(0) > :eq(0)',
                node=0,
                offset=0,
            ),
            'givenKeys': Keys.ARROW_LEFT,
            'expectedCaret': Caret(
                parent='#document-contents > :eq(0) > :eq(0)',
                node=0,
                offset=0,
            )
        }),
        CaretTestCase(**{
            'name': 'rightFromOneBeforeDocEnd',
            'description': "right arrow increments caret offset",
            'givenContents': None,
            'givenCaret': Caret(
                parent='#document-contents > :eq(0) > :eq(0)',
                node=0,
                offset=(-1) + len(SHORT_LOREM),
            ),
            'givenKeys': Keys.ARROW_RIGHT,
            'expectedCaret': Caret(
                parent='#document-contents > :eq(0) > :eq(0)',
                node=0,
                offset=len(SHORT_LOREM),
            )
        }),
        CaretTestCase(**{
            'name': 'rightFromDocEnd',
            'description': "right arrow does nothing when caret is at end of"
                           " document",
            'givenContents': None,
            'givenCaret': Caret(
                parent='#document-contents > :eq(0) > :eq(0)',
                node=0,
                offset=len(SHORT_LOREM),
            ),
            'givenKeys': Keys.ARROW_RIGHT,
            'expectedCaret': Caret(
                parent='#document-contents > :eq(0) > :eq(0)',
                node=0,
                offset=len(SHORT_LOREM),
            )
        }),
        CaretTestCase(**{
            'name': 'upArrowFromMidFirstDocLine',
            'description': "up arrow moves caret from within first line of"
                           " document to beginning of document",
            'givenContents': None,
            'givenCaret': Caret(
                parent='#document-contents > :eq(0) > :eq(0)',
                node=0,
                offset=(5) + 0,
            ),
            'givenKeys': Keys.ARROW_UP,
            'expectedCaret': Caret(
                parent='#document-contents > :eq(0) > :eq(0)',
                node=0,
                offset=0,
            )
        }),
        CaretTestCase(**{
            'name': 'upArrowFromDocStart',
            'description': "up arrow does nothing when caret is at start of"
                           " document",
            'givenContents': None,
            'givenCaret': Caret(
                parent='#document-contents > :eq(0) > :eq(0)',
                node=0,
                offset=0,
            ),
            'givenKeys': Keys.ARROW_UP,
            'expectedCaret': Caret(
                parent='#document-contents > :eq(0) > :eq(0)',
                node=0,
                offset=0,
            )
        }),
        CaretTestCase(**{
            'name': 'downFromMidLastDocLine',
            'description': "down arrow moves caret from within last line of"
                           " document to end of document",
            'givenContents': None,
            'givenCaret': Caret(
                parent='#document-contents > :eq(0) > :eq(0)',
                node=0,
                offset=(-7) + len(SHORT_LOREM),
            ),
            'givenKeys': Keys.ARROW_DOWN,
            'expectedCaret': Caret(
                parent='#document-contents > :eq(0) > :eq(0)',
                node=0,
                offset=len(SHORT_LOREM),
            )
        }),
        CaretTestCase(**{
            'name': 'downFromDocEnd',
            'description': "down arrow does nothing when caret is at end of"
                           " document",
            'givenContents': None,
            'givenCaret': Caret(
                parent='#document-contents > :eq(0) > :eq(0)',
                node=0,
                offset=len(SHORT_LOREM),
            ),
            'givenKeys': Keys.ARROW_DOWN,
            'expectedCaret': Caret(
                parent='#document-contents > :eq(0) > :eq(0)',
                node=0,
                offset=len(SHORT_LOREM),
            )
        }),
    ]
    movement_within_long = [
        CaretTestCase(**{
            # !!!
            # I have no idea how to test this...
            'name': 'upArrowFromSecondDocLine',
            'description': "up arrow moves caret from second line to first"
                           " at equal offset relative to line start",
            'givenContents': None,
            'givenCaret': Caret(
                parent='#document-contents > :eq(0) > :eq(0)',
                node=0,
                offset=None,
            ),
            'givenKeys': Keys.ARROW_UP,
            'expectedCaret': Caret(
                parent='#document-contents > :eq(0) > :eq(0)',
                node=0,
                offset=None,
            )
        }),
        CaretTestCase(**{
            # !!!
            # I have no idea how to test this...
            'name': 'downFromMidLastDocLine',
            'description': "down arrow moves caret from first line to second,"
                           " at equal offset relative to line start",
            'givenContents': None,
            'givenCaret': Caret(
                parent='#document-contents > :eq(0) > :eq(0)',
                node=0,
                offset=None,
            ),
            'givenKeys': Keys.ARROW_DOWN,
            'expectedCaret': Caret(
                parent='#document-contents > :eq(0) > :eq(0)',
                node=0,
                offset=None,
            )
        }),
    ]
    # !!!
    # raw text needs different parent selector
    # movement_in_text = [
    #     c._replace(
    #         name=c.name + 'InText',
    #         description=c.description + ' in text',
    #         givenContents=Contents(Paragraph(
    #             Text(SHORT_LOREM)
    #         )),
    #     )
    #     for c in movement_within_short
    # ]
    movement_in_bold = [
        c._replace(
            name=c.name + 'InBold',
            description=c.description + ' in bold',
            givenContents=Contents(Paragraph(
                BoldText(SHORT_LOREM)
            )),
        )
        for c in movement_within_short
    ]
    movement_in_italic = [
        c._replace(
            name=c.name + 'InItalic',
            description=c.description + ' in italic',
            givenContents=Contents(Paragraph(
                ItalicText(SHORT_LOREM)
            )),
        )
        for c in movement_within_short
    ]
    movement_in_link = [
        c._replace(
            name=c.name + 'InLink',
            description=c.description + ' in link',
            givenContents=Contents(Paragraph(
                Link(
                    'your source of examples on the world-wide-web',
                    'http://www.example.com'
                )
            )),
        )
        for c in movement_within_short
    ]

    # each case will be passed into self.runCheck
    cases = chain(
        # movement_in_text,
        movement_in_bold,
        # movement_in_italic,
        # movement_in_link,
    )


class MovementInMultiChildParagraph(CaretTestCase):
    __metaclass__ = DataCasesToTestMethodsMeta

    # each case will be passed into self.runCheck
    cases = chain(
        # movement_between_text_text,
        # movement_between_text_bold,
        # movement_between_text_italic,
        # movement_between_text_link,
        # movement_between_bold_text,
        # movement_between_bold_bold,
        # movement_between_bold_italic,
        # movement_between_bold_link,
        # movement_between_italic_text,
        # movement_between_italic_bold,
        # movement_between_italic_italic,
        # movement_between_italic_link,
        # movement_between_link_text,
        # movement_between_link_bold,
        # movement_between_link_italic,
        # movement_between_link_link,
    )

class InsertionOfLink(LiveTornadoTestCase, Manipulator):
    __metaclass__ = DataCasesToTestMethodsMeta
    linkText = 'all the ipsums'
    linkAddressWithoutHTTP = 'www.example.com'
    linkAddress = 'http://' + linkAddressWithoutHTTP
    expectedLink = Link(linkText, linkAddress)

    cases = [
        InsertionTestCase(**{
            'name': 'atStartOfParagraph',
            'description': 'caret at start of paragraph inserts link before'
                           ' text',
            'givenContents': Contents(Paragraph(Text(SHORT_LOREM))),
            'givenCaret': Caret(
                parent='#document-contents > :eq(0)',
                node=0,
                offset=0
            ),
            'expectedContents': Contents(
                Paragraph(expectedLink, Text(SHORT_LOREM))
            ),
            'expectedCaret': Caret(
                parent='#document-contents > :eq(0)',
                node=0,
                offset=0
            ),
        }),
        InsertionTestCase(**{
            'name': 'atStartOfParagraph',
            'description': 'caret within BoldText inserts Link between two'
                           ' BoldTexts',
            'givenContents': Contents(Paragraph(BoldText(SHORT_LOREM))),
            'givenCaret': Caret(
                parent='#document-contents > :eq(0) > :eq(0)',
                node=0,
                offset=len('Lorem'),
            ),
            'expectedContents': Contents(
                Paragraph(
                    BoldText('Lorem'),
                    expectedLink,
                    BoldText(SHORT_LOREM[len('Lorem'):])
                )
            ),
            'expectedCaret': Caret(
                parent='#document-contents > :eq(0) > :eq(0)',
                node=0,
                offset=len('Lorem'),
            ),
        }),
    ]

    def setUp(self):
        self.createAndLoginUser()

    def runCheck(self, case):
        self.loadDocumentEditor(
            self.createDocument(case.givenContents)
        )

        self.injectHelpers()
        self.setCaret(case.givenCaret)

        (DRIVER.find_element_by_id('button-link')
               .click())
        WebDriverWait(DRIVER, 10).until(
            EC.presence_of_element_located((By.XPATH,
                '//span['
                    '@class="ui-dialog-title"'
                    ' and text()="Link"'
                ']'
            ))
        )

        (DRIVER.find_element_by_css_selector('input.linktext')
               .send_keys(self.linkText))
        (DRIVER.find_element_by_css_selector('input.link')
               .send_keys(self.linkAddressWithoutHTTP))

        (DRIVER.find_element_by_xpath('//button/span[text()="Insert"]')
               .click())
        self.assertEqual(
            str(case.expectedContents),
            self.getDocumentContents()
        )

# -*- coding: utf-8 -*-
from collections import namedtuple

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

from itertools import chain


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


# TEST MAKERS
class DataCasesToTestMethodsMeta(type):
    """
    Generate test methods from data-driven cases.

    The class needs to have a 'cases' attribute.

    Each case needs to have a name and description attribute.
    """
    def __new__(mcs, name, bases, clsdict):

        def gen_test(case):
            def test(self):
                self.runTest(case)
            test.__doc__ = case.description

            return test

        for c_ in clsdict.get('cases', tuple()):
            clsdict['test_%s' % c_.name] = gen_test(c_)

        return type.__new__(mcs, name, bases, clsdict)


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


class CaretInParagraphTests(LiveTornadoTestCase):
    __metaclass__ = DataCasesToTestMethodsMeta
    username = 'Yeti'
    email = 'yeti@example.com'
    passtext = 'otter'

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

    # each case will be passed into self.runTest
    cases = chain(
        # movement_in_text,
        movement_in_bold,
        # movement_in_italic,
        # movement_in_link,
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

    @classmethod
    def setUpClass(cls):
        cls.driver = webdriver.Firefox()
        super(CaretInParagraphTests, cls).setUpClass()

    @classmethod
    def tearDownClass(cls):
        cls.driver.quit()
        super(CaretInParagraphTests, cls).tearDownClass()

    def setUp(self):
        """Creates a dummy user in the database, and logs in the browser as that
           user."""
        # the DB gets cleared after each test, including the user
        # may be possible to replace this with a fixture
        self.user = User.objects.create(
            username=self.username,
            password=make_password(self.passtext),
            is_active=True
        )
        self.user.save()

        # avoid the unverified-email login trap
        EmailAddress.objects.create(
            user=self.user,
            email=self.email,
            verified=True,
        ).save()

        self.driver.get('%s%s' % (
            self.live_server_url,
            '/account/login/'
        ))
        (self.driver
            .find_element_by_id('id_login')
            .send_keys(self.user.username))
        (self.driver
            .find_element_by_id('id_password')
            .send_keys(self.passtext + Keys.RETURN))
        WebDriverWait(self.driver, 10).until(
            EC.presence_of_element_located((By.ID, 'user-preferences'))
        )

    def runTest(self, case):
        doc = self.createDocument(case.givenContents)
        self.loadDocumentEditor(doc)

        self.injectHelpers()
        # WebDriverWait(self.driver, 600, 600000).until(
        #     EC.presence_of_element_located((By.ID, 'nonexistent'))
        # )
        self.setCaret(case.givenCaret)
        (self.driver.find_element_by_id('document-contents')
                    .send_keys(case.givenKeys))

        # grab caret from browser and compare in python,
        # to get more informative failure messages
        self.assertEqual(
            case.expectedCaret,
            self.getCaret()
        )
        # test browser-side, in case caret grabbing is buggy
        self.assertTrue(self.caretIsAt(case.expectedCaret))

    def createDocument(self, contents):
        doc = Document.objects.create(
            owner=self.user,
            contents=str(contents),
        )
        doc.save()
        return doc

    def loadDocumentEditor(self, doc):
        self.driver.get("%s%s" % (
            self.live_server_url,
            doc.get_absolute_url()
        ))
        WebDriverWait(self.driver, 10).until(
            EC.presence_of_element_located((By.ID, 'document-contents'))
        )

    def getCaret(self):
        return self.driver.execute_script(
            'return testCaret.getCaret(rangy.getSelection());'
        )

    def setCaret(self, caret):
        return self.driver.execute_script(
            'testCaret.setCaret(rangy.getSelection(), arguments[0]);',
            caret
        )

    def caretIsAt(self, expectedCaret):
        return self.driver.execute_script(
            '''
            return testCaret.caretsMatch(
                arguments[0],
                testCaret.getCaret(rangy.getSelection())
            );
            ''',
            expectedCaret
        )

    def injectHelpers(self):
        return self.driver.execute_script(
            'window.testCaret = %s' % testCaretJS
        )

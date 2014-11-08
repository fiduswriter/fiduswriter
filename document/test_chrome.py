# These tests are to be rewritten to subclass the tests in tests.py once current work on Firefox testing is ready to go.
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


# DATA

"""
DocumentContents is a stringified exporter.js.node2Obj object.
"""
CONTENTS_EMPTY = ''.join([
    '{"nn":"DIV","a":[["id", "document-contents"]],"c":[',
        '{"nn":"P","c":[',
            '{"nn":"BR"}',
        ']}',
    ']}',
])

"""
Caret is {parent: String, node: Integer, offset: Integer}
Represents the position of a caret in the document
    parent is a jQuery selector uniquely identifying the parent element of the
           caret
    node is index of the caret conaining node inside the parent element
    offset is position of the caret inside the node
"""
# not using a namedtuple, because they don't get converted properly to objects
# when passed as javascript arguments
Caret = dict

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

        for c_ in clsdict['cases']:
            clsdict['test_%s' % c_.name] = gen_test(c_)

        return type.__new__(mcs, name, bases, clsdict)


# TESTS

class CaretMovementTests(LiveTornadoTestCase):
    # metaclass needed to turn data-based cases into test methods
    __metaclass__ = DataCasesToTestMethodsMeta
    username = 'Yeti'
    email = 'yeti@example.com'
    passtext = 'otter'

    # each case will be passed into self.runTest
    cases = [
        CaretTestCase(**{
            'name': 'leftFromStart',
            'description': "caret doesn't go left of document start",
            'givenContents': CONTENTS_EMPTY,
            'givenCaret': Caret(
                parent='#document-contents > :eq(0)',
                node=0,
                offset=0,
            ),
            'givenKeys': Keys.ARROW_LEFT,
            'expectedCaret': Caret(
                parent='#document-contents > :eq(0)',
                node=0,
                offset=0,
            )
        }),
        CaretTestCase(**{
            'name': 'rightFromEnd',
            'description': "caret doesn't go right of document end",
            'givenContents': CONTENTS_EMPTY,
            'givenCaret': Caret(
                parent='#document-contents > :eq(0)',
                node=0,
                offset=0,
            ),
            'givenKeys': Keys.ARROW_RIGHT,
            'expectedCaret': Caret(
                parent='#document-contents > :eq(0)',
                node=0,
                offset=0,
            )
        }),
    ]

    @classmethod
    def setUpClass(cls):
        cls.driver = webdriver.Chrome()
        super(CaretMovementTests, cls).setUpClass()

    @classmethod
    def tearDownClass(cls):
        cls.driver.quit()
        super(CaretMovementTests, cls).tearDownClass()

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
            .send_keys(self.passtext))
        (self.driver
            .find_element_by_id('id_password')
            .send_keys(Keys.RETURN))
        WebDriverWait(self.driver, 10).until(
            EC.presence_of_element_located((By.ID, 'user-preferences'))
        )

    def runTest(self, case):
        doc = self.createDocument(case.givenContents)
        self.loadDocumentEditor(doc)

        self.injectHelpers()
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
            contents=contents,
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

class PasteTests(CaretMovementTests):
    def runTest(self, case):
        doc = self.createDocument(case.givenContents)
        self.loadDocumentEditor(doc)

        self.injectHelpers()
        self.setCaret(case.givenCaret)
        (self.driver.find_element_by_id(case.editableElement)
                    .send_keys(case.givenKeys))

        # grab caret from browser and compare in python,
        # to get more informative failure messages
        self.assertEqual(
            case.expectedCaret,
            self.getCaret()
        )
        # test browser-side, in case caret grabbing is buggy
        self.assertTrue(self.caretIsAt(case.expectedCaret))

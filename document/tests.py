# -*- coding: utf-8 -*-
from collections import namedtuple
from itertools import chain
import os
import time
import sys

from allauth.account.models import EmailAddress
from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import User

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from document.models import Document
from test.mock.helpers import testCaretJS
from test.testcases import LiveTornadoTestCase
from test.mock.document_contents import (
    Contents,
    Paragraph,
    Text,
    Bold,
    BoldText,
    ItalicText,
    Link
)

RUN_LOCAL = os.getenv("SAUCE_USERNAME", False) is False


if RUN_LOCAL:
    # Only testing Chrome locally
    browsers = ['Chrome']
else:
    from sauceclient import SauceClient
    USERNAME = os.environ.get('SAUCE_USERNAME')
    ACCESS_KEY = os.environ.get('SAUCE_ACCESS_KEY')
    sauce = SauceClient(USERNAME, ACCESS_KEY)

    browsers = [
        {"platform": "Linux",
         "browserName": "chrome"},
        {"platform": "Windows 10",
         "browserName": "MicrosoftEdge"},
        {"platform": "OS X 10.11",
         "browserName": "safari"},
        {"platform": "Linux",
         "browserName": "firefox"}]


def on_platforms(platforms, local):
    if local:
        def decorator(base_class):
            module = sys.modules[base_class.__module__].__dict__
            for i, platform in enumerate(platforms):
                d = dict(base_class.__dict__)
                d['browser'] = platform
                name = "%s_%s" % (base_class.__name__, i + 1)
                module[name] = type(name, (base_class,), d)
            pass
        return decorator

    def decorator(base_class):
        module = sys.modules[base_class.__module__].__dict__
        for i, platform in enumerate(platforms):
            d = dict(base_class.__dict__)
            d['desired_capabilities'] = platform
            name = "%s_%s" % (base_class.__name__, i + 1)
            module[name] = type(name, (base_class,), d)
    return decorator

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
        'givenCaretStart',  # start of selection at start of test
        'givenCaretEnd',    # end of selection at start of test
        'expectedContents',  # expected document contents at end of test
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

    def deleteAllUsers(self):
        User.objects.all().delete()
        EmailAddress.objects.all().delete()

    def createDocument(self, contents):
        doc = Document.objects.create(
            owner=self.user,
            contents=str(contents),
        )
        doc.save()
        return doc

    # drive browser
    def loginUser(self, username, passtext):
        self.driver.get('%s%s' % (
            self.live_server_url,
            '/account/login/'
        ))
        (self.driver
            .find_element_by_id('id_login')
            .send_keys(username))
        (self.driver
            .find_element_by_id('id_password')
            .send_keys(passtext + Keys.RETURN))
        WebDriverWait(self.driver, 10).until(
            EC.presence_of_element_located((By.ID, 'user-preferences'))
        )

    def loadDocumentEditor(self, doc):
        self.driver.get("%s%s" % (
            self.live_server_url,
            doc.get_absolute_url()
        ))
        WebDriverWait(self.driver, 10).until(
            EC.presence_of_element_located((By.ID, 'document-contents'))
        )

    # execute javascript
    def injectHelpers(self):
        return self.driver.execute_script(
            testCaretJS
        )

    def getCaret(self):
        return self.driver.execute_script(
            'return testCaret.getCaret();'
        )

    def setCaret(self, caret):
        return self.driver.execute_script(
            'testCaret.setCaret(arguments[0]);',
            caret
        )

    def setSelection(self, caret_one, caret_two):
        return self.driver.execute_script(
            'testCaret.setSelection(arguments[0], arguments[1]);',
            caret_one, caret_two
        )

    def caretIsAt(self, expectedCaret):
        return self.driver.execute_script(
            '''
            return testCaret.selectionsMatch(
                arguments[0],
                testCaret.getCaret()
            );
            ''',
            expectedCaret
        )

    def getDocumentContents(self):
        return self.driver.execute_script(
            """
            // refresh theEditor.doc first
            theEditor.getUpdates();

            return JSON.stringify(theEditor.doc.contents);
            """
        )


class CaretPositionTest(LiveTornadoTestCase, Manipulator):
    """
    Base for all tests that check that Caret is at an expected position after
    entering a given series of keys.
    """

    def setUp(self):
        if RUN_LOCAL:
            self.setUpLocal()
        else:
            self.setUpSauce()
        self.createAndLoginUser()

    def tearDown(self):
        if RUN_LOCAL:
            self.tearDownLocal()
        else:
            self.tearDownSauce()
        self.deleteAllUsers()

    def setUpSauce(self):
        self.desired_capabilities['name'] = self.id()
        self.desired_capabilities['tunnel-identifier'] = \
            os.getenv('TRAVIS_JOB_NUMBER', 0000)
        self.desired_capabilities['build'] = \
            os.getenv('TRAVIS_BUILD_NUMBER', 0000)
        self.desired_capabilities['tags'] = \
            [os.getenv('TRAVIS_PYTHON_VERSION', "2.x"), 'CI']

        print self.desired_capabilities

        sauce_url = "http://%s:%s@ondemand.saucelabs.com:80/wd/hub"
        self.driver = webdriver.Remote(
            desired_capabilities=self.desired_capabilities,
            command_executor=sauce_url % (USERNAME, ACCESS_KEY)
        )
        self.driver.implicitly_wait(5)

    def setUpLocal(self):
        self.driver = getattr(webdriver, self.browser)()
        self.driver.implicitly_wait(3)

    def tearDownLocal(self):
        self.driver.quit()

    def tearDownSauce(self):
        print("\nLink to your job: \n "
              "https://saucelabs.com/jobs/%s \n" % self.driver.session_id)
        try:
            if sys.exc_info() == (None, None, None):
                sauce.jobs.update_job(self.driver.session_id, passed=True)
            else:
                sauce.jobs.update_job(self.driver.session_id, passed=False)
        finally:
            self.driver.quit()

    def runCheck(self, caretCase):
        self.loadDocumentEditor(
            self.createDocument(caretCase.givenContents)
        )

        self.injectHelpers()
        self.setCaret(caretCase.givenCaret)
        (self.driver.find_element_by_css_selector(
            '#document-editable .ProseMirror-content'
        ).send_keys(caretCase.givenKeys))
        # Wait 0.1 second to let the JavaScript adjust the caret position.
        time.sleep(0.1)
        # grab caret from browser and compare in python,
        # to get more informative failure messages
        self.assertEqual(
            caretCase.expectedCaret,
            self.getCaret()
        )
        # test browser-side, in case caret grabbing is buggy
        # self.assertTrue(self.caretIsAt(expectedCaret))


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


@on_platforms(browsers, RUN_LOCAL)
class MovementInSingleChildParagraph(CaretPositionTest):
    __metaclass__ = DataCasesToTestMethodsMeta
    movement_within_short = [
        # movement within a short node
        CaretTestCase(**{
            'name': 'leftFromOneAfterDocStart',
            'description': "left arrow decrements caret offset",
            'givenContents': None,
            'givenCaret': 16,
            'givenKeys': Keys.ARROW_LEFT,
            'expectedCaret': 15
        }),
        CaretTestCase(**{
            'name': 'leftFromDocStart',
            'description': "left arrow does nothing when caret is at start of"
                           " document",
            'givenContents': None,
            'givenCaret': 1,
            'givenKeys': Keys.ARROW_LEFT,
            'expectedCaret': 1
        }),
        CaretTestCase(**{
            'name': 'rightFromOneBeforeDocEnd',
            'description': "right arrow increments caret offset",
            'givenContents': None,
            'givenCaret': 14 + len(SHORT_LOREM),
            'givenKeys': Keys.ARROW_RIGHT,
            'expectedCaret': 15 + len(SHORT_LOREM),
        }),
        CaretTestCase(**{
            'name': 'rightFromDocEnd',
            'description': "right arrow does nothing when caret is at end of"
                           " document",
            'givenContents': None,
            'givenCaret': 15 + len(SHORT_LOREM),
            'givenKeys': Keys.ARROW_RIGHT,
            'expectedCaret': 15 + len(SHORT_LOREM)
        }),
        CaretTestCase(**{
            'name': 'upArrowFromMidFirstDocLine',
            'description': "up arrow moves caret from within first line of"
                           " document to beginning of document",
            'givenContents': None,
            'givenCaret': 14,
            'givenKeys': Keys.ARROW_UP,
            'expectedCaret': 1
        }),
        CaretTestCase(**{
            'name': 'upArrowFromDocStart',
            'description': "up arrow does nothing when caret is at start of"
                           " document",
            'givenContents': None,
            'givenCaret': 1,
            'givenKeys': Keys.ARROW_UP,
            'expectedCaret': 1
        }),
        CaretTestCase(**{
            'name': 'downFromDocEnd',
            'description': "down arrow does nothing when caret is at end of"
                           " document",
            'givenContents': None,
            'givenCaret': 15 + len(SHORT_LOREM),
            'givenKeys': Keys.ARROW_DOWN,
            'expectedCaret': 15 + len(SHORT_LOREM),
        }),
    ]

    movement_in_text = [
        c._replace(
            name=c.name + 'InText',
            description=c.description + ' in text',
            givenContents=Contents(Paragraph(
                Text(SHORT_LOREM)
            )),
        )
        for c in movement_within_short
    ]
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
                    SHORT_LOREM,
                    'http://www.example.com',
                    'LinkTitle'
                )
            )),
        )
        for c in movement_within_short
    ]

    # each case will be passed into self.runCheck
    cases = chain(
        movement_in_text,
        movement_in_bold,
        movement_in_italic,
        movement_in_link,
    )


@on_platforms(browsers, RUN_LOCAL)
class InsertionOfLink(LiveTornadoTestCase, Manipulator):
    __metaclass__ = DataCasesToTestMethodsMeta
    linkTitle = 'all the ipsums'
    linkAddressWithoutHTTP = 'www.example.com'
    linkAddress = 'http://' + linkAddressWithoutHTTP
    expectedLink = Link('', linkAddress, linkTitle)

    cases = [
        InsertionTestCase(**{
            'name': 'atStartOfParagraph',
            'description': 'caret at start of paragraph turns start of text'
            ' into link',
            'givenContents': Contents(Paragraph(Text(SHORT_LOREM))),
            'givenCaretStart': 14,
            'givenCaretEnd': 14 + len('Lo'),
            'expectedContents': Contents(
                Paragraph(
                    Link(
                        'Lo',
                        linkAddress,
                        linkTitle
                    ),
                    Text(
                        SHORT_LOREM[len('Lo'):]
                    )
                )
            ),
            'expectedCaret': 14,
        }),
        InsertionTestCase(**{
            'name': 'linkInsideBold',
            'description': 'caret within Bold creates link within Bold',
            'givenContents': Contents(Paragraph(BoldText(SHORT_LOREM))),
            'givenCaretStart': 14 + len('Lorem'),
            'givenCaretEnd': 14 + len('Lorem ipsum'),
            'expectedContents': Contents(
                Paragraph(
                    Bold(
                        Text('Lorem'),
                        Link(' ipsum', linkAddress, linkTitle),
                        Text(SHORT_LOREM[len('Lorem ipsum'):])
                    ),
                )
            ),
            'expectedCaret': 14 + len('Lorem'),
        }),
    ]

    def setUp(self):
        if RUN_LOCAL:
            self.setUpLocal()
        else:
            self.setUpSauce()
        self.createAndLoginUser()

    def tearDown(self):
        if RUN_LOCAL:
            self.tearDownLocal()
        else:
            self.tearDownSauce()
        self.deleteAllUsers()

    def setUpSauce(self):
        self.desired_capabilities['name'] = self.id()
        self.desired_capabilities['tunnel-identifier'] = \
            os.environ['TRAVIS_JOB_NUMBER']
        self.desired_capabilities['build'] = os.environ['TRAVIS_BUILD_NUMBER']
        self.desired_capabilities['tags'] = \
            [os.environ['TRAVIS_PYTHON_VERSION'], 'CI']

        print self.desired_capabilities

        sauce_url = "http://%s:%s@ondemand.saucelabs.com:80/wd/hub"
        self.driver = webdriver.Remote(
            desired_capabilities=self.desired_capabilities,
            command_executor=sauce_url % (USERNAME, ACCESS_KEY)
        )
        self.driver.implicitly_wait(5)

    def setUpLocal(self):
        self.driver = getattr(webdriver, self.browser)()
        self.driver.implicitly_wait(3)

    def tearDownLocal(self):
        self.driver.quit()

    def tearDownSauce(self):
        print("\nLink to your job: \n "
              "https://saucelabs.com/jobs/%s \n" % self.driver.session_id)
        try:
            if sys.exc_info() == (None, None, None):
                sauce.jobs.update_job(self.driver.session_id, passed=True)
            else:
                sauce.jobs.update_job(self.driver.session_id, passed=False)
        finally:
            self.driver.quit()

    def runCheck(self, case):
        self.loadDocumentEditor(
            self.createDocument(case.givenContents)
        )

        self.injectHelpers()

        self.setSelection(case.givenCaretStart, case.givenCaretEnd)

        (self.driver.find_element_by_id('button-link').click())
        WebDriverWait(self.driver, 10).until(
            EC.presence_of_element_located((By.XPATH,
                                            '//span['
                                            '@class="ui-dialog-title"'
                                            ' and text()="Link"'
                                            ']'
                                            ))
        )

        (self.driver.find_element_by_css_selector(
            'input.linktitle'
        ).send_keys(self.linkTitle))
        (self.driver.find_element_by_css_selector(
            'input.link'
        ).send_keys(self.linkAddressWithoutHTTP))

        (self.driver.find_element_by_xpath(
            '//button/span[text()="Insert"]'
        ).click())
        self.assertEqual(
            str(case.expectedContents),
            self.getDocumentContents()
        )

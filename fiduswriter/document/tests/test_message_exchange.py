from testing.testcases import LiveTornadoTestCase
from .editor_helper import EditorHelper
from document.ws_views import WebSocket


class SimpleMessageExchangeTests(LiveTornadoTestCase, EditorHelper):
    """
    Tests in which one user works on the document and simulates
    loss of socket messages.
    """
    user = None
    TEST_TEXT = "Lorem ipsum dolor sit amet."
    fixtures = [
        'initial_documenttemplates.json',
        'initial_styles.json',
    ]

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        driver_data = cls.get_drivers(1)
        cls.driver = driver_data["drivers"][0]
        cls.client = driver_data["clients"][0]
        cls.wait_time = driver_data["wait_time"]

    @classmethod
    def tearDownClass(cls):
        cls.driver.quit()
        super().tearDownClass()

    def setUp(self):
        self.user = self.create_user()
        self.login_user(self.user, self.driver, self.client)
        self.doc = self.create_new_document()

    def tearDown(self):
        self.leave_site(self.driver)

    def test_client_losing_server_messages(self):
        """
        Test one client trying to edit document while online.
        But the messages supposed to be received from the server
        are lost during transmission.
        (The messages loss is simulated manually)
        """
        self.load_document_editor(self.driver, self.doc)

        self.add_title(self.driver)
        self.driver.find_element_by_class_name(
            'article-body'
        ).click()

        # Type lots of text to increment the server message count.
        socket_object = WebSocket.sessions[self.doc.id]['participants'][0]
        self.type_text(self.driver, self.TEST_TEXT)
        self.type_text(self.driver, self.TEST_TEXT)
        self.type_text(self.driver, self.TEST_TEXT)
        self.type_text(self.driver, self.TEST_TEXT)

        # We simulate lost messages by changing the counter manually.
        self.driver.execute_script(
            'window.theApp.page.ws.messages.server = 1'
        )

        # Assert that the server count changed in client
        server_count = self.driver.execute_script(
            'return window.theApp.page.ws.messages.server'
        )
        self.assertEqual(
            server_count,
            1
        )

        # Now try typing text again to see if server goes into loop.
        self.type_text(self.driver, self.TEST_TEXT)

        # Check the Socket object to verify that server isn't going in a loop.
        doc_message_count = 0
        doc_data = None
        for message in socket_object.messages['last_ten']:
            if 'type' in message.keys():
                if message['type'] == "doc_data":
                    doc_message_count += 1
                    doc_data = message['doc']['contents']

        # We should've only sent the doc_data message once .
        self.assertEqual(
            doc_message_count,
            1
        )

        # Now assert that the document reloaded in front end too !
        doc_content = self.driver.execute_script(
            'return window.theApp.page.docInfo.confirmedJson'
        )
        self.assertEqual(
            doc_data,
            doc_content
        )

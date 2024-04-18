import json

from channels.generic.websocket import WebsocketConsumer
import logging

logger = logging.getLogger(__name__)


class BaseWebsocketConsumer(WebsocketConsumer):

    def connect(self):
        if "user" not in self.scope or not self.scope["user"].is_authenticated:
            self.access_denied()
            return
        self.accept()
        logger.debug("Action:Opening Websocket")
        self.id = 0

        self.user = self.scope["user"]
        self.endpoint = self.scope["path"]
        self.messages = {"server": 0, "client": 0, "last_ten": []}
        logger.debug(
            f"Action:Opening Websocket URL:{self.endpoint}"
            f" User:{self.user.id} ParticipantID:{self.id}"
        )
        response = dict()
        response["type"] = "welcome"
        self.send_message(response)

    def access_denied(self):
        response = dict()
        response["type"] = "access_denied"
        self.send_message(response)
        self.do_close()
        return

    def do_close(self):
        self.close()

    def receive(self, text_data=None):
        if not text_data:
            return
        message = json.loads(text_data)
        if message["type"] == "request_resend":
            self.resend_messages(message["from"])
            return
        if "c" not in message and "s" not in message:
            self.send({"type": "access_denied"})
            # Message doesn't contain needed client/server info. Ignore.
            return
        logger.debug(
            f"Action:Message received URL:{self.endpoint} "
            f"User:{self.user.id} ParticipantID:{self.id} "
            f"Type:{message['type']} "
            f"S count client:{message['s']} C count client:{message['c']} "
            f"S count server:{self.messages['server']} "
            f"C count server:{self.messages['client']}"
        )

        if message["c"] < (self.messages["client"] + 1):
            # Receive a message already received at least once. Ignore.
            return
        elif message["c"] > (self.messages["client"] + 1):
            # Messages from the client have been lost.
            logger.debug(
                f"Action:Requesting resending of lost messages from client"
                f" URL:{self.endpoint} User:{self.user.id} "
                f"ParticipantID:{self.id} from:{self.messages['client']}"
            )

            self.send(
                {"type": "request_resend", "from": self.messages["client"]}
            )
            return
        elif message["s"] < self.messages["server"]:
            # Message was sent either simultaneously with message from server
            # or a message from the server previously sent never arrived.
            # Resend the messages the client missed.
            logger.debug(
                f"Action:Simultaneous.Resend messages to client. "
                f"URL:{self.endpoint} User:{self.user.id} "
                f"ParticipantID:{self.id} from:{message['s']}"
            )

            self.messages["client"] += 1
            self.resend_messages(message["s"])
            self.reject_message(message)
            return
        # Message order is correct. We continue processing the data.
        self.messages["client"] += 1
        self.handle_message(message)

    def handle_message(message):
        pass

    def reject_message(message):
        pass

    def send_message(self, message):
        self.messages["server"] += 1
        message["c"] = self.messages["client"]
        message["s"] = self.messages["server"]
        self.messages["last_ten"].append(message)
        self.messages["last_ten"] = self.messages["last_ten"][-10:]
        logger.debug(
            f"Action:Sending Message. URL:{self.endpoint} User:{self.user.id} "
            f"ParticipantID:{self.id} Type:{message['type']} "
            f"S count server:{message['s']} C count server:{message['c']}"
        )
        self.send(text_data=json.dumps(message))

    def unfixable(self):
        pass

    def resend_messages(self, from_no):
        to_send = self.messages["server"] - from_no
        logger.debug(
            f"Action:Resending messages to User. URL:{self.endpoint} "
            f"User:{self.user.id} ParticipantID:{self.id} "
            f"number of messages to be resent:{to_send} "
            f"S count server:{self.messages['server']} from:{from_no}"
        )
        self.messages["server"] -= to_send
        if to_send > len(self.messages["last_ten"]):
            # Too many messages requested. We have to abort.
            logger.debug(
                f"Action:Lot of messages requested. URL:{self.endpoint} "
                f"User:{self.user.id} ParticipantID:{self.id} "
                f"number of messages requested:{to_send}"
            )
            self.unfixable()
            return
        for message in self.messages["last_ten"][0 - to_send :]:
            self.send_message(message)

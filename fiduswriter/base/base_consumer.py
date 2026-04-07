import json
import logging
from dataclasses import dataclass
from channels.generic.websocket import AsyncWebsocketConsumer
from urllib.parse import parse_qs

logger = logging.getLogger(__name__)


@dataclass
class GuestUser:
    """Represents an unauthenticated user accessing via a share token."""

    id: str  # token UUID string
    token: str  # same UUID string
    token_rights: str
    is_authenticated: bool = True
    readable_name: str = "Guest"

    @property
    def username(self):
        """
        Return a slug-safe username derived from readable_name.
        Django's UnicodeUsernameValidator allows letters, digits, _, ., @, +, -.
        readable_name may contain spaces, so we convert "Guest 5" -> "guest5".
        """
        return self.readable_name.lower().replace(" ", "")

    def get_full_name(self):
        return self.readable_name


class TokenUser:
    """
    Represents a logged-in user who is accessing a document via a share token.
    The user retains their real identity but also has token-based access rights.
    """

    def __init__(self, user, token, token_rights):
        self._user = user
        self.token = token
        self.token_rights = token_rights
        self.is_authenticated = True

    @property
    def id(self):
        return self._user.id

    @property
    def pk(self):
        return self._user.pk

    @property
    def username(self):
        return self._user.username

    def get_full_name(self):
        return self._user.get_full_name()

    @property
    def readable_name(self):
        return self._user.get_full_name() or self._user.username

    def __getattr__(self, name):
        """Delegate any undefined attributes to the underlying user object."""
        return getattr(self._user, name)


class BaseWebsocketConsumer(AsyncWebsocketConsumer):

    async def init(self):
        self.id = 0
        await self.accept()
        self.messages = {"server": 0, "client": 0, "last_ten": []}
        self.endpoint = self.scope["path"]
        self.user = self.scope["user"]
        # Preserve original user for Presence records and other non-websocket uses.
        # Fetch actual User instance to resolve UserLazyObject.
        if self.user.is_authenticated:
            from django.contrib.auth import get_user_model

            User = get_user_model()
            self.original_user = await User.objects.aget(pk=self.user.pk)
        else:
            self.original_user = self.user

        # Check for a share token in the query string
        token_str = self._extract_token_from_scope()
        if token_str:
            if self.user.is_authenticated:
                # Logged-in user accessing via share link - wrap in TokenUser
                token_user = await self._resolve_token_user(
                    self.user, token_str
                )
                if token_user:
                    self.user = token_user
                else:
                    # Token is invalid, but logged-in users can still access
                    # if they have regular access rights
                    pass
            else:
                # Unauthenticated user - try guest access
                guest = await self._resolve_guest_user(token_str)
                if guest:
                    self.user = guest
                else:
                    await self.access_denied()
                    return False

        logger.debug("Action:Opening Websocket")
        return True

    async def connect(self):
        if not await self.init():
            return False

        logger.debug(
            f"Action:Opening Websocket URL:{self.endpoint}"
            f" User:{self.user.id} ParticipantID:{self.id}"
        )
        response = dict()
        response["type"] = "welcome"
        await self.send_message(response)
        return True

    def _extract_token_from_scope(self):
        """Extract token from query string in the WebSocket scope."""
        query_string = self.scope.get("query_string", b"")
        if isinstance(query_string, bytes):
            query_string = query_string.decode("utf-8")
        params = parse_qs(query_string)
        tokens = params.get("token", [])
        return tokens[0] if tokens else None

    async def _resolve_guest_user(self, token_str):
        """
        Validate a share token and return a GuestUser if valid.
        Subclasses should override this to provide token validation logic.
        """
        return None

    async def _resolve_token_user(self, user, token_str):
        """
        Validate a share token for a logged-in user and return a TokenUser if valid.
        The user retains their real identity but also has token-based access rights.
        Subclasses should override this to provide document-specific token validation.
        """
        return None

    async def access_denied(self):
        await self.send_message({"type": "access_denied"})
        await self.do_close()
        return

    async def do_close(self):
        await self.close()

    async def receive(self, text_data=None, bytes_data=None):
        if not text_data:
            return
        message = json.loads(text_data)
        if message["type"] == "ping":
            await self.send_pong()
            return
        if message["type"] == "request_resend":
            await self.resend_messages(message["from"])
            return
        if "c" not in message and "s" not in message:
            await self.access_denied()
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

            await self.send_json(
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
            await self.resend_messages(message["s"])
            await self.reject_message(message)
            return
        # Message order is correct. We continue processing the data.
        self.messages["client"] += 1
        if message["type"] == "subscribe":
            connection_count = 0
            if "connection" in message:
                connection_count = message["connection"]
            await self.subscribe(connection_count)
            return
        await self.handle_message(message)

    async def handle_message(self, message):
        pass

    async def reject_message(self, message):
        pass

    async def subscribe(self, connection_count):
        await self.send_message({"type": "subscribed"})

    async def send_message(self, message):
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
        await self.send(text_data=json.dumps(message))

    async def unfixable(self):
        pass

    async def resend_messages(self, from_no):
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
            await self.unfixable()
            return
        for message in self.messages["last_ten"][0 - to_send :]:
            await self.send_message(message)

    async def send_pong(self):
        await self.send(text_data='{"type": "pong"}')

import atexit
import logging
import secrets

from django.conf import settings

from base.models import Presence
from base.base_consumer import BaseWebsocketConsumer
from base.helpers.ws import get_broadcast_secret

logger = logging.getLogger(__name__)


class SystemMessageConsumer(BaseWebsocketConsumer):
    clients = []

    def _get_local_port(self):
        server = self.scope.get("server")
        port = None
        if server and len(server) > 1:
            try:
                port = int(server[1])
            except (TypeError, ValueError):
                port = None
        if port is None:
            ports = getattr(settings, "LOCAL_PORTS", None) or getattr(
                settings, "PORTS", []
            )
            if len(ports) == 1:
                first = ports[0]
                if isinstance(first, dict):
                    first = first.get("internal")
                try:
                    port = int(first)
                except (TypeError, ValueError, KeyError):
                    port = None
        return port

    def _make_server_url(self):
        """The server_url stored in Presence is built only from
        server-known information, never from the client-supplied Host
        header."""
        port = self._get_local_port()
        template = getattr(settings, "INTERNAL_WS_BROADCAST_URL", None)
        if template:
            return template.replace("{port}", str(port or "")).replace(
                "{path}", self.scope["path"]
            )
        if port is None:
            return None
        return f"ws://127.0.0.1:{port}{self.scope['path']}"

    async def connect(self):
        if not await super().connect():
            return

        headers = dict(self.scope["headers"])
        user_agent = headers.get(b"user-agent", b"").decode("utf-8")
        self.is_broadcast_relay = False
        if user_agent == "Fidus Writer":
            # Server-to-server relay connection (see base.views.send_to_server).
            # It must present the service credential, otherwise it is rejected.
            authorization = headers.get(b"authorization", b"").decode("utf-8")
            if not secrets.compare_digest(
                authorization, "Bearer " + get_broadcast_secret()
            ):
                logger.warning(
                    "Rejected unauthenticated Fidus Writer relay connection."
                )
                await self.close()
                return
            self.is_broadcast_relay = True
            SystemMessageConsumer.clients.append(self)
            return

        SystemMessageConsumer.clients.append(self)

        # Only create Presence for authenticated Django users.
        # Skip for GuestUser/TokenUser/anonymous users - they cannot be assigned to ForeignKey.
        from base.base_consumer import GuestUser, TokenUser
        from django.contrib.auth.models import AnonymousUser

        if isinstance(self.user, (GuestUser, TokenUser, AnonymousUser)):
            return

        server_url = self._make_server_url()
        if not server_url:
            logger.warning(
                "Could not determine internal broadcast address; "
                "not storing presence for this connection. Set "
                "INTERNAL_WS_BROADCAST_URL or LOCAL_PORTS for this instance."
            )
            return

        self.presence = await Presence.objects.acreate(
            user=self.original_user,
            server_url=server_url,
        )

    async def disconnect(self, close_code):
        if hasattr(self, "presence"):
            if self.presence.id is not None:
                try:
                    await self.presence.adelete()
                except ValueError:
                    # Presence already deleted
                    pass
        if self in SystemMessageConsumer.clients:
            SystemMessageConsumer.clients.remove(self)
        await self.close()

    async def send_pong(self):
        if hasattr(self, "presence"):
            await self.presence.asave()
        await super().send_pong()

    async def handle_message(self, message):
        if message["type"] == "system_message":
            # Second control beside @staff_member_required on
            # send_system_message. Only an authenticated internal relay
            # connection or a staff user may trigger fan-out.
            allowed = getattr(self, "is_broadcast_relay", False)
            if not allowed:
                user = getattr(self, "original_user", self.user)
                allowed = bool(
                    user
                    and getattr(user, "is_authenticated", False)
                    and getattr(user, "is_staff", False)
                )
            if not allowed:
                logger.warning(
                    f"Rejected system_message fan-out from unauthorized "
                    f"source. URL:{self.endpoint} User:{self.user.id} "
                    f"ParticipantID:{self.id}"
                )
                return
            for client in SystemMessageConsumer.clients:
                await client.send_message(message)


def remove_all_presences():
    # Removing all presences connected to this server
    for client in SystemMessageConsumer.clients:
        if hasattr(client, "presence") and client.presence.id is not None:
            client.presence.delete()
        if client in SystemMessageConsumer.clients:
            SystemMessageConsumer.clients.remove(client)

    SystemMessageConsumer.clients = []


atexit.register(remove_all_presences)

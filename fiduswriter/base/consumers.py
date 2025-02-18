import atexit

from base.models import Presence
from base.base_consumer import BaseWebsocketConsumer


class SystemMessageConsumer(BaseWebsocketConsumer):
    clients = []

    def connect(self):
        if not super().connect():
            return
        SystemMessageConsumer.clients.append(self)
        headers = dict(self.scope["headers"])
        user_agent = headers.get(b"user-agent", b"").decode("utf-8")
        if user_agent == "Fidus Writer":
            return
        host = headers.get(b"host", b"").decode("utf-8")
        origin = headers.get(b"origin", b"").decode("utf-8")
        protocol = "wss://" if origin.startswith("https") else "ws://"
        self.presence = Presence.objects.create(
            user=self.user,
            server_url=protocol + host + self.scope["path"],
        )

    def disconnect(self, close_code):
        if hasattr(self, "presence"):
            self.presence.delete()
        if self in SystemMessageConsumer.clients:
            SystemMessageConsumer.clients.remove(self)
        self.close()

    def send_pong(self):
        self.presence.save()
        super().send_pong()

    def handle_message(self, message):
        if message["type"] == "system_message":
            for client in SystemMessageConsumer.clients:
                client.send_message(message)


def remove_all_presences():
    # Removing all presences connected to this server.
    for client in SystemMessageConsumer.clients:
        if client.presence:
            client.presence.delete()
    SystemMessageConsumer.clients = []


atexit.register(remove_all_presences)

import json
import atexit

from base.models import Presence
from base.base_consumer import BaseWebsocketConsumer


class SystemMessageConsumer(BaseWebsocketConsumer):
    clients = []

    def connect(self):
        if not super().connect():
            return False
        SystemMessageConsumer.clients.append(self)
        self.presence = False
        self.headers = dict(self.scope["headers"])
        user_agent = self.headers.get(b"user-agent", b"").decode("utf-8")
        if user_agent != "Fidus Writer":
            self.update_presence(True)

    def disconnect(self, close_code):
        self.update_presence(False)
        SystemMessageConsumer.clients.remove(self)
        self.close()

    def update_presence(self, is_connected):
        if is_connected:
            if self.presence:
                self.presence.save()
            else:
                host = self.headers.get(b"host", b"").decode("utf-8")
                origin = self.headers.get(b"origin", b"").decode("utf-8")
                protocol = "wss://" if origin.startswith("https") else "ws://"
                self.presence = Presence.objects.create(
                    user=self.user,
                    server_url=protocol + host + self.scope["path"],
                )
        else:
            if self.presence:
                self.presence.delete()

    def receive(self, text_data=None):
        if not text_data:
            return
        data = json.loads(text_data)
        if data["type"] == "ping":
            self.update_presence(True)
        elif data["type"] == "system_message":
            for client in SystemMessageConsumer.clients:
                client.send_message(data)
        return super().receive(text_data)


def remove_all_presences():
    # Removing all presences connected to this server.
    for client in SystemMessageConsumer.clients:
        if client.presence:
            client.presence.delete()
    SystemMessageConsumer.clients = []


atexit.register(remove_all_presences)

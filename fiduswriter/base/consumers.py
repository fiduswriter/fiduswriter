import json
import atexit

from base.base_consumer import BaseWebsocketConsumer

from channels_presence.models import Room, Presence


class SystemMessageConsumer(BaseWebsocketConsumer):

    def subscribe(self, connection_count):
        Room.objects.add(
            "system_messages", self.channel_name, self.scope["user"]
        )
        super().subscribe(connection_count)

    def send_pong(self):
        Presence.objects.touch(self.channel_name)
        super().send_pong()

    def disconnect(self, disconnect_code):
        Room.objects.remove("system_messages", self.channel_name)

    def forward_message(self, event):
        """
        Utility handler for messages to be broadcasted to groups.  Will be
        called from channel layer messages with `"type": "forward.message"`.
        """
        self.send_message(json.loads(event["message"]))


def remove_all_presences():
    Presence.objects.filter(room__channel_name="system_messages").delete()


atexit.register(remove_all_presences)

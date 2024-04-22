import json
from asgiref.sync import async_to_sync

from base.base_consumer import BaseWebsocketConsumer

from channels_presence.models import Room, Presence

# Prune stale connections upon startup
Room.objects.prune_presences()
Room.objects.prune_rooms()


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

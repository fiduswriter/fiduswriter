import atexit
import asyncio
from asgiref.sync import sync_to_async

from base.models import Presence
from base.base_consumer import BaseWebsocketConsumer


class SystemMessageConsumer(BaseWebsocketConsumer):
    clients = []

    async def connect(self):
        if not await super().connect():
            return
        SystemMessageConsumer.clients.append(self)
        headers = dict(self.scope["headers"])
        user_agent = headers.get(b"user-agent", b"").decode("utf-8")
        if user_agent == "Fidus Writer":
            return
        host = headers.get(b"host", b"").decode("utf-8")
        origin = headers.get(b"origin", b"").decode("utf-8")
        protocol = "wss://" if origin.startswith("https") else "ws://"

        # Create presence asynchronously
        self.presence = await sync_to_async(Presence.objects.create)(
            user=self.user,
            server_url=protocol + host + self.scope["path"],
        )

    async def disconnect(self, close_code):
        if hasattr(self, "presence"):
            await sync_to_async(self.presence.delete)()
        if self in SystemMessageConsumer.clients:
            SystemMessageConsumer.clients.remove(self)
        await self.close()

    async def send_pong(self):
        if hasattr(self, "presence"):
            await sync_to_async(self.presence.save)()
        await super().send_pong()

    async def handle_message(self, message):
        if message["type"] == "system_message":
            for client in SystemMessageConsumer.clients:
                await client.send_message(message)


async def remove_all_presences_async():
    # Removing all presences connected to this server using asyncio tasks
    delete_tasks = []
    for client in SystemMessageConsumer.clients:
        if hasattr(client, "presence"):
            delete_tasks.append(sync_to_async(client.presence.delete)())

    if delete_tasks:
        await asyncio.gather(*delete_tasks)

    SystemMessageConsumer.clients = []


def remove_all_presences():
    # For atexit handler which runs in synchronous context
    loop = asyncio.new_event_loop()
    try:
        loop.run_until_complete(remove_all_presences_async())
    finally:
        loop.close()


atexit.register(remove_all_presences)

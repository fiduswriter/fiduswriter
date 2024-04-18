from base.base_consumer import BaseWebsocketConsumer


class WebsocketConsumer(BaseWebsocketConsumer):
    sessions = dict()
    admin_sessions = dict()

    def handle_message(self, message):
        if message["type"] == "subscribe":
            self.subscribe()
            return
        if message["type"] == "subscribe_admin":
            self.subscribe_admin()
            return
        if message["type"] == "message" and self.type == "admin":
            WebsocketConsumer.send_message_to_users(message)
            self.send_message({"type": "message_delivered"})
            return

    def subscribe(self):
        self.type = "user"
        if len(WebsocketConsumer.sessions) == 0:
            self.id = 1
        else:
            self.id = max(WebsocketConsumer.sessions) + 1
        WebsocketConsumer.sessions[self.id] = self
        self.send_connection_info_update()

    def subscribe_admin(self):
        if not self.user.is_staff:
            # User does not have access
            self.access_denied()
            return
        self.type = "admin"
        if len(WebsocketConsumer.admin_sessions) == 0:
            self.id = 1
        else:
            self.id = max(WebsocketConsumer.admin_sessions) + 1
        WebsocketConsumer.admin_sessions[self.id] = self
        self.send_message(self.get_connection_info_message())

    def send_connection_info_update(self):
        connection_info_message = self.get_connection_info_message()
        WebsocketConsumer.send_message_to_admins(connection_info_message)

    def get_connection_info_message(self):
        return {
            "type": "connection_info",
            "sessions": len(WebsocketConsumer.sessions),
        }

    @classmethod
    def send_message_to_users(cls, message):
        for waiter in list(cls.sessions.values()):
            waiter.send_message(message)

    @classmethod
    def send_message_to_admins(cls, message):
        for waiter in list(cls.admin_sessions.values()):
            waiter.send_message(message)

    def on_close(self):
        if not hasattr(self, "type"):
            return
        if self.type == "user" and self.id in WebsocketConsumer.sessions:
            del WebsocketConsumer.sessions[self.id]
            self.send_connection_info_update()
        elif (
            self.type == "admin"
            and self.id in WebsocketConsumer.admin_sessions
        ):
            del WebsocketConsumer.admin_sessions[self.id]

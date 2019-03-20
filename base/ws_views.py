from base.ws_handler import BaseWebSocketHandler


class WebSocket(BaseWebSocketHandler):
    sessions = dict()
    admin_sessions = dict()

    def handle_message(self, message):
        if message["type"] == 'subscribe':
            self.subscribe()
            return
        if message["type"] == 'subscribe_admin':
            self.subscribe_admin()
            return
        if message["type"] == 'message' and self.type == 'admin':
            WebSocket.send_message_to_users(message)
            self.send_message({'type': 'message_delivered'})
            return

    def subscribe(self):
        self.type = 'user'
        if len(WebSocket.sessions) == 0:
            self.id = 1
        else:
            self.id = max(WebSocket.sessions) + 1
        WebSocket.sessions[self.id] = self
        self.send_connection_info_update()

    def subscribe_admin(self):
        if not self.user.is_staff:
            # User does not have access
            self.access_denied()
            return
        self.type = 'admin'
        if len(WebSocket.admin_sessions) == 0:
            self.id = 1
        else:
            self.id = max(WebSocket.admin_sessions) + 1
        WebSocket.admin_sessions[self.id] = self
        self.send_message(self.get_connection_info_message())

    def send_connection_info_update(self):
        connection_info_message = self.get_connection_info_message()
        WebSocket.send_message_to_admins(connection_info_message)

    def get_connection_info_message(self):
        return {
            'type': 'connection_info',
            'sessions': len(WebSocket.sessions)
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
        if not hasattr(self, 'type'):
            return
        if self.type == 'user' and self.id in WebSocket.sessions:
            del WebSocket.sessions[self.id]
            self.send_connection_info_update()
        elif self.type == 'admin' and self.id in WebSocket.admin_sessions:
            del WebSocket.admin_sessions[self.id]

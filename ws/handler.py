import uuid

from ws.base import BaseWebSocketHandler
from logging import info, error
from tornado.escape import json_decode

from text.models import AccessRight, Text
from avatar.templatetags.avatar_tags import avatar_url

class WebSocketHandler(BaseWebSocketHandler):
    sessions = dict()


    def open(self, document_id):
        print 'Websocket opened'
        self.user = self.get_current_user()
        self.document = document_id 
        document = Text.objects.filter(id=self.document)
        if len(document) > 0:
            document = document[0]
            print 'Current user: ' + str(self.user.readable_name)
            access_right = AccessRight.objects.filter(text=document, user=self.user)
            if document.owner == self.user or len(access_right) > 0:
                if len (access_right) > 0:
                    self.access_right = access_right[0]
                else:
                    self.access_right = 'w'
                if self.document not in WebSocketHandler.sessions:
                    WebSocketHandler.sessions[self.document]=dict()
                self.id = len(WebSocketHandler.sessions[self.document])
                WebSocketHandler.sessions[self.document][self.id] = self
                self.write_message({
                    "type": 'welcome',
                    "key": self.id
                    })
                WebSocketHandler.send_participant_list(self.document)

    def on_message(self, message):
        print 'Websocket got a message from ' + str(self.user) + ': ' + str(message)
        parsed = json_decode(message)
        if parsed["type"]=='chat':
            chat = {
                "id": str(uuid.uuid4()),
                "body": parsed["body"],
                "from": self.user.readable_name,
                "type": 'chat'
                }
            if self.document in WebSocketHandler.sessions:
                WebSocketHandler.send_updates(chat, self.document)

    def on_close(self):
        print 'Websocket closed'
        if self.document in WebSocketHandler.sessions:
            del WebSocketHandler.sessions[self.document][self.id]
            if WebSocketHandler.sessions[self.document]:
                chat = {
                    "type": 'take_control'
                    }
                WebSocketHandler.sessions[self.document][min(WebSocketHandler.sessions[self.document])].write_message(chat)
                WebSocketHandler.send_participant_list(cls, document)
            else:
                del WebSocketHandler.sessions[self.document]

    @classmethod
    def send_participant_list(cls, document):
        if document in WebSocketHandler.sessions:
            participant_list = []
            for waiter in cls.sessions[document].keys():
                participant_list.append({
                    'key':waiter,
                    'id':cls.sessions[document][waiter].user.id,
                    'name':cls.sessions[document][waiter].user.readable_name,
                    'avatar':avatar_url(cls.sessions[document][waiter].user,80)
                    })
            chat = {
                "participant_list": participant_list,
                "type": 'connections'
                }
            WebSocketHandler.send_updates(chat, document)

    @classmethod
    def send_updates(cls, chat, document):
        info("sending message to %d waiters", len(cls.sessions[document]))
        for waiter in cls.sessions[document].keys():
            try:
                cls.sessions[document][waiter].write_message(chat)
            except:
                error("Error sending message", exc_info=True)            
         
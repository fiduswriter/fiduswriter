#
# This file is part of Fidus Writer <http://www.fiduswriter.org>
#
# Copyright (C) 2013 Takuto Kojima, Johannes Wilm
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as
# published by the Free Software Foundation, either version 3 of the
# License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.

import uuid

from ws.base import BaseWebSocketHandler
from logging import info, error
from tornado.escape import json_decode

from document.models import AccessRight, Document
from document.views import get_accessrights
from avatar.templatetags.avatar_tags import avatar_url


def save_document(document,changes):
    document.title = changes["title"]
    document.contents = changes["contents"]
    document.metadata = changes["metadata"]
    document.settings = changes["settings"]  
    document.save()

class DocumentWS(BaseWebSocketHandler):
    sessions = dict()

    def open(self, document_id):
        print 'Websocket opened'
        can_access = False
        self.user = self.get_current_user()
        if int(document_id) == 0:
            can_access = True
            self.is_owner = True
            self.access_rights = 'w'
            self.is_new = True
            self.document = Document.objects.create(owner_id=self.user.id)
        else:
            self.is_new = False
            document = Document.objects.filter(id=int(document_id))
            if len(document) > 0:
                document = document[0]
                self.document = document
                
                if self.document.owner == self.user:
                    self.access_rights = 'w'
                    self.is_owner = True
                    can_access = True
                else:
                    self.is_owner = False
                    access_rights = AccessRight.objects.filter(document=self.document, user=self.user)
                    if len(access_rights) > 0:
                        self.access_rights = access_rights[0].rights
                        can_access = True
        if can_access:
            if self.document.id not in DocumentWS.sessions:
                DocumentWS.sessions[self.document.id]=dict()
                self.id = 0
                self.in_control = True
            else:
                self.id = max(DocumentWS.sessions[self.document.id])+1
                self.in_control = False
            DocumentWS.sessions[self.document.id][self.id] = self    
            response = dict()
            response['type'] = 'welcome'
            self.write_message(response)
            #DocumentWS.send_participant_list(self.document.id)

    def get_document(self):
        response = dict()
        response['type'] = 'document_data'
        response['document'] = dict()
        response['document']['id']=self.document.id
        response['document']['title']=self.document.title
        response['document']['contents']=self.document.contents
        response['document']['metadata']=self.document.metadata
        response['document']['settings']=self.document.settings
        response['document']['access_rights'] = get_accessrights(AccessRight.objects.filter(document__owner=self.document.owner))
        response['document']['owner'] = dict()
        response['document']['owner']['id']=self.document.owner.id
        response['document']['owner']['name']=self.document.owner.readable_name
        response['document']['owner']['avatar']=avatar_url(self.document.owner,80)            
        response['document']['owner']['team_members']=[]
        for team_member in self.document.owner.leader.all():
            tm_object = dict()
            tm_object['id'] = team_member.member.id
            tm_object['name'] = team_member.member.readable_name
            tm_object['avatar'] = avatar_url(team_member.member,80)
            response['document']['owner']['team_members'].append(tm_object)
        response['document_values'] = dict()    
        response['document_values']['is_owner']=self.is_owner
        response['document_values']['rights'] = self.access_rights
        if self.is_new:
            response['document_values']['is_new'] = True
        if not self.is_owner:
            response['user']=dict()
            response['user']['id']=self.user.id
            response['user']['name']=self.user.readable_name
            response['user']['avatar']=avatar_url(self.user,80)
        if self.in_control:
            response['document_values']['control']=True
        response['document_values']['session_id']= self.id
        self.write_message(response)

    def get_document_update(self):
        response = dict()
        response['type'] = 'document_data_update'        
        response['document'] = dict()
        response['document']['id']=self.document.id
        response['document']['title']=self.document.title
        response['document']['contents']=self.document.contents
        response['document']['metadata']=self.document.metadata
        response['document']['settings']=self.document.settings
        self.write_message(response)        

    def on_message(self, message):
        parsed = json_decode(message)
        if parsed["type"]=='get_document':
            self.get_document()
        elif parsed["type"]=='get_document':
            self.get_document_update()    
        elif parsed["type"]=='participant_update':
            DocumentWS.send_participant_list(self.document.id)
        elif parsed["type"]=='save' and self.access_rights == 'w':
            save_document(self.document, parsed["document"])
        elif parsed["type"]=='chat':
            chat = {
                "id": str(uuid.uuid4()),
                "body": parsed["body"],
                "from": self.user.id,
                "type": 'chat'
                }
            if self.document.id in DocumentWS.sessions:
                DocumentWS.send_updates(chat, self.document.id)
        elif parsed["type"]=='diff' or parsed["type"]=='transform' or parsed["type"]=='hash':
            if self.document.id in DocumentWS.sessions:
                DocumentWS.send_updates(message, self.document.id, self.id)            

    def on_close(self):
        if hasattr(self, 'document') and self.document.id in DocumentWS.sessions and self.id in DocumentWS.sessions[self.document.id]:
            del DocumentWS.sessions[self.document.id][self.id]
            if DocumentWS.sessions[self.document.id] and self.in_control:
                chat = {
                    "type": 'take_control'
                    }
                new_controller = DocumentWS.sessions[self.document.id][min(DocumentWS.sessions[self.document.id])]
                new_controller.in_control = True
                new_controller.write_message(chat)
                DocumentWS.send_participant_list(self.document.id)
            else:
                del DocumentWS.sessions[self.document.id]

    @classmethod
    def send_participant_list(cls, document):
        if document in DocumentWS.sessions:
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
            DocumentWS.send_updates(chat, document)

    @classmethod
    def send_updates(cls, chat, document, sender_id=None):
        info("sending message to %d waiters", len(cls.sessions[document]))
        for waiter in cls.sessions[document].keys():
            if cls.sessions[document][waiter].id != sender_id:
                try:
                    cls.sessions[document][waiter].write_message(chat)
                except:
                    error("Error sending message", exc_info=True)            
         
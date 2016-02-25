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
import atexit

from ws.base import BaseWebSocketHandler
from logging import info, error
from tornado.escape import json_decode, json_encode
from tornado.websocket import WebSocketClosedError
from document.models import AccessRight, Document
from document.views import get_accessrights
from avatar.templatetags.avatar_tags import avatar_url

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
            document = Document.objects.create(owner_id=self.user.id)
            self.document_id = document.id
        else:
            self.is_new = False
            document = Document.objects.filter(id=int(document_id))
            if len(document) > 0:
                document = document[0]
                self.document_id = document.id
                if document.owner == self.user:
                    self.access_rights = 'w'
                    self.is_owner = True
                    can_access = True
                else:
                    self.is_owner = False
                    access_rights = AccessRight.objects.filter(document=document, user=self.user)
                    if len(access_rights) > 0:
                        self.access_rights = access_rights[0].rights
                        can_access = True
        if can_access:
            if document.id not in DocumentWS.sessions:
                DocumentWS.sessions[document.id]=dict()
                self.id = 0
                DocumentWS.sessions[document.id]['participants']=dict()
                DocumentWS.sessions[document.id]['document'] = document
                DocumentWS.sessions[document.id]['last_diffs'] = json_decode(document.last_diffs)
                DocumentWS.sessions[document.id]['comments'] = json_decode(document.comments)
                DocumentWS.sessions[document.id]['settings'] = json_decode(document.settings)
                DocumentWS.sessions[document.id]['in_control'] = self.id
            else:
                self.id = max(DocumentWS.sessions[document.id]['participants'])+1
            DocumentWS.sessions[document.id]['participants'][self.id] = self
            response = dict()
            response['type'] = 'welcome'
            self.write_message(response)

    def on_message(self, message):
        if not self.document_id in DocumentWS.sessions:
            print "receiving message for closed document"
            return
        parsed = json_decode(message)
        print parsed["type"]
        if parsed["type"]=='get_document':
            self.send_document()
        elif parsed["type"]=='participant_update':
            self.handle_participant_update()
        elif parsed["type"]=='chat':
            self.handle_chat(parsed)
        elif parsed["type"]=='check_diff_version':
            self.check_diff_version(parsed)
        elif parsed["type"]=='update_document' and self.can_update_document():
            self.handle_document_update(parsed)
        elif parsed["type"]=='update_title' and self.can_update_document():
            self.handle_title_update(parsed)
        elif parsed["type"]=='setting_change' and self.can_update_document():
            self.handle_settings_change(message, parsed)
        elif parsed["type"]=='diff' and self.can_update_document():
            self.handle_diff(message, parsed)

    def can_update_document(self):
        return self.access_rights == 'w' or self.access_rights == 'a'

    def confirm_diff(self, request_id):
        response = dict()
        response['type'] = 'confirm_diff'
        response['request_id'] = request_id
        self.write_message(response)

    def send_document(self):
        response = dict()
        response['type'] = 'document_data'
        response['document'] = dict()
        document = DocumentWS.sessions[self.document_id]['document']
        response['document']['id']=document.id
        response['document']['version']=document.version
        response['document']['title']=document.title
        response['document']['contents']=document.contents
        response['document']['metadata']=document.metadata
        response['document']['settings']=DocumentWS.sessions[self.document_id]["settings"]
        response['document']['comments']=DocumentWS.sessions[self.document_id]["comments"]
        response['document']['comment_version']=document.comment_version
        response['document']['access_rights'] = get_accessrights(AccessRight.objects.filter(document__owner=document.owner))
        response['document']['owner'] = dict()
        response['document']['owner']['id']=document.owner.id
        response['document']['owner']['name']=document.owner.readable_name
        response['document']['owner']['avatar']=avatar_url(document.owner,80)
        response['document']['owner']['team_members']=[]
        for team_member in document.owner.leader.all():
            tm_object = dict()
            tm_object['id'] = team_member.member.id
            tm_object['name'] = team_member.member.readable_name
            tm_object['avatar'] = avatar_url(team_member.member,80)
            response['document']['owner']['team_members'].append(tm_object)
        response['document_values'] = dict()
        response['document_values']['is_owner']=self.is_owner
        response['document_values']['rights'] = self.access_rights
        if document.version > document.diff_version:
            print "!!!diff version issue!!!"
            document.diff_version = document.version
            DocumentWS.sessions[self.document_id]["last_diffs"] = []
        elif document.diff_version > document.version:
            needed_diffs = document.diff_version - document.version
            response['document_values']['last_diffs'] = DocumentWS.sessions[self.document_id]["last_diffs"][-needed_diffs:]
        else:
            response['document_values']['last_diffs'] = []
        if self.is_new:
            response['document_values']['is_new'] = True
        if not self.is_owner:
            response['user']=dict()
            response['user']['id']=self.user.id
            response['user']['name']=self.user.readable_name
            response['user']['avatar']=avatar_url(self.user,80)
        if DocumentWS.sessions[self.document_id]['in_control'] == self.id:
            response['document_values']['control']=True
        response['document_values']['session_id']= self.id
        self.write_message(response)

    def update_document(self, changes):
        document = DocumentWS.sessions[self.document_id]['document']
        if changes["version"] > document.diff_version:
            # The version number is too high. Possibly due to server restart.
            # Do not accept it, and send a document instead.
            self.send_document()
            return
        else:
            # The saved version does not contain all accepted diffs, so we keep the remaining ones + 1000
            remaining_diffs = 1000 + document.diff_version - changes["version"]
            DocumentWS.sessions[self.document_id]["last_diffs"] = DocumentWS.sessions[self.document_id]["last_diffs"][-remaining_diffs:]
        document.contents = changes["contents"]
        document.metadata = changes["metadata"]
        document.version = changes["version"]

    def update_title(self, title):
        document = DocumentWS.sessions[self.document_id]['document']
        document.title = title

    def handle_participant_update(self):
        DocumentWS.send_participant_list(self.document_id)

    def handle_document_update(self, parsed):
        self.update_document(parsed["document"])
        DocumentWS.save_document(self.document_id)
        message = {
            "type": 'check_hash',
            "diff_version": parsed["document"]["version"],
            "hash": parsed["document"]["hash"]
        }
        DocumentWS.send_updates(message, self.document_id, self.id)

    def handle_title_update(self, parsed):
        self.update_title(parsed["title"])
        DocumentWS.save_document(self.document_id)

    def handle_chat(self, parsed):
        chat = {
            "id": str(uuid.uuid4()),
            "body": parsed['body'],
            "from": self.user.id,
            "type": 'chat'
            }
        DocumentWS.send_updates(chat, self.document_id)

    def handle_settings_change(self, message, parsed):
        if self.document_id in DocumentWS.sessions:
            DocumentWS.sessions[self.document_id]['settings'][parsed['variable']] = parsed['value']
            DocumentWS.send_updates(message, self.document_id, self.id)

    def handle_diff(self, message, parsed):
        if self.document_id in DocumentWS.sessions:
            document = DocumentWS.sessions[self.document_id]["document"]
            if parsed["diff_version"] == document.diff_version and parsed["comment_version"] == document.comment_version:
                DocumentWS.sessions[self.document_id]["last_diffs"].extend(parsed["diff"])
                document.diff_version += len(parsed["diff"])
                for cd in parsed["comments"]:
                    id = str(cd["id"])
                    if cd["type"] == "create":
                        del cd["type"]
                        DocumentWS.sessions[self.document_id]["comments"][id] = cd
                    elif cd["type"] == "delete":
                        del DocumentWS.sessions[self.document_id]["comments"][id]
                    elif cd["type"] == "update":
                        DocumentWS.sessions[self.document_id]["comments"][id]["comment"] = cd["comment"]
                        if "review:isMajor" in cd:
                            DocumentWS.sessions[self.document_id]["comments"][id]["review:isMajor"] = cd["review:isMajor"]
                    elif cd["type"] == "add_answer":
                        comment_id = str(cd["commentId"])
                        if not "answers" in DocumentWS.sessions[self.document_id]["comments"][comment_id]:
                            DocumentWS.sessions[self.document_id]["comments"][comment_id]["answers"] = []
                        del cd["type"]
                        DocumentWS.sessions[self.document_id]["comments"][comment_id]["answers"].append(cd)
                    elif cd["type"] == "delete_answer":
                        comment_id = str(cd["commentId"])
                        for answer in DocumentWS.sessions[self.document_id]["comments"][comment_id]["answers"]:
                            if answer["id"] == cd["id"]:
                                DocumentWS.sessions[self.document_id]["comments"][comment_id]["answers"].remove(answer)
                    elif cd["type"] == "update_answer":
                        comment_id = str(cd["commentId"])
                        for answer in DocumentWS.sessions[self.document_id]["comments"][comment_id]["answers"]:
                            if answer["id"] == cd["id"]:
                                answer["answer"] = cd["answer"]
                    document.comment_version += 1
                self.confirm_diff(parsed["request_id"])
                DocumentWS.send_updates(message, self.document_id, self.id)
            elif parsed["diff_version"] != document.diff_version:
                document_session = DocumentWS.sessions[self.document_id]
                if parsed["diff_version"] < (document_session["document"].diff_version - len(document_session["last_diffs"])):
                    print "unfixable"
                    # Client has a version that is too old
                    self.send_document()
                elif parsed["diff_version"] < document_session["document"].diff_version:
                    print "can fix it"
                    number_requested_diffs = document_session["document"].diff_version - parsed["diff_version"]
                    response = {
                        "type": "diff",
                        "diff_version": parsed["diff_version"],
                        "diff": document_session["last_diffs"][-number_requested_diffs:],
                        "reject_request_id": parsed["request_id"],
                        }
                    self.write_message(response)
                else:
                    print "unfixable"
                    # Client has a version that is too old
                    self.send_document()
            else:
                print "comment_version incorrect!"
                print parsed["comment_version"]
                print document.comment_version

    def check_diff_version(self, parsed):
        document_session = DocumentWS.sessions[self.document_id]
        if parsed["diff_version"] == document_session["document"].diff_version:
            response = {
                "type": "confirm_diff_version",
                "diff_version": parsed["diff_version"],
            }
            self.write_message(response)
            return
        elif parsed["diff_version"] + len(document_session["last_diffs"]) >= document_session["document"].diff_version:
            number_requested_diffs = document_session["document"].diff_version - parsed["diff_version"]
            response = {
                "type": "diff",
                "diff_version": parsed["diff_version"],
                "diff": document_session["last_diffs"][-number_requested_diffs:],
            }
            self.write_message(response)
            return
        else:
            print "unfixable"
            # Client has a version that is too old
            self.send_document()
            return

    def on_close(self):
        print "Websocket closing"
        if hasattr(self, 'document_id') and self.document_id in DocumentWS.sessions and self.id in DocumentWS.sessions[self.document_id]['participants']:
            del DocumentWS.sessions[self.document_id]['participants'][self.id]
            if DocumentWS.sessions[self.document_id]['in_control']==self.id:
                if len(DocumentWS.sessions[self.document_id]['participants'].keys()) > 0:
                    message = {
                        "type": 'take_control'
                        }
                    new_controller = DocumentWS.sessions[self.document_id]['participants'][min(DocumentWS.sessions[self.document_id]['participants'])]
                    DocumentWS.sessions[self.document_id]['in_control'] = new_controller.id
                    new_controller.write_message(message)
                    DocumentWS.send_participant_list(self.document_id)
                else:
                    DocumentWS.save_document(self.document_id)
                    del DocumentWS.sessions[self.document_id]
                    print "noone left"

    @classmethod
    def send_participant_list(cls, document_id):
        if document_id in DocumentWS.sessions:
            participant_list = []
            for waiter in cls.sessions[document_id]['participants'].keys():
                participant_list.append({
                    'key':waiter,
                    'id':cls.sessions[document_id]['participants'][waiter].user.id,
                    'name':cls.sessions[document_id]['participants'][waiter].user.readable_name,
                    'avatar':avatar_url(cls.sessions[document_id]['participants'][waiter].user,80)
                    })
            message = {
                "participant_list": participant_list,
                "type": 'connections'
                }
            DocumentWS.send_updates(message, document_id)

    @classmethod
    def send_updates(cls, message, document_id, sender_id=None):
        info("sending message to %d waiters", len(cls.sessions[document_id]))
        for waiter in cls.sessions[document_id]['participants'].keys():
            if cls.sessions[document_id]['participants'][waiter].id != sender_id:
                try:
                    cls.sessions[document_id]['participants'][waiter].write_message(message)
                except WebSocketClosedError:
                    error("Error sending message", exc_info=True)

    @classmethod
    def save_document(cls, document_id):
        document = cls.sessions[document_id]['document']
        document.settings = json_encode(DocumentWS.sessions[document_id]['settings'])
        document.last_diffs = json_encode(DocumentWS.sessions[document_id]['last_diffs'])
        document.comments = json_encode(DocumentWS.sessions[document_id]['comments'])
        print "saving document"
        document.save()

    @classmethod
    def save_all_docs(cls):
        for document_id in cls.sessions:
            cls.save_document(document_id)

atexit.register(DocumentWS.save_all_docs)

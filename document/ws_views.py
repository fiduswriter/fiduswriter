import uuid
import atexit
import random

from document.helpers.session_user_info import SessionUserInfo
from document.helpers.filtering_comments import filter_comments_by_role
from ws.base import BaseWebSocketHandler
from logging import info, error
from tornado.escape import json_decode, json_encode
from tornado.websocket import WebSocketClosedError
from document.models import AccessRight
from document.views import get_accessrights
from avatar.templatetags.avatar_tags import avatar_url

class DocumentWS(BaseWebSocketHandler):
    sessions = dict()

    def open(self, document_id):
        print 'Websocket opened'
        current_user = self.get_current_user()
        self.user_info = SessionUserInfo()
        doc_db, can_access = self.user_info.init_access(document_id, current_user)

        if can_access:
            if doc_db.id in DocumentWS.sessions:
                self.doc = DocumentWS.sessions[doc_db.id]
                self.id = max(self.doc['participants'])+1
            else:
                self.id = 0
                self.doc = dict()
                self.doc['db'] = doc_db
                self.doc['participants']=dict()
                self.doc['last_diffs'] = json_decode(doc_db.last_diffs)
                self.doc['comments'] = json_decode(doc_db.comments)
                self.doc['settings'] = json_decode(doc_db.settings)
                self.doc['contents'] = json_decode(doc_db.contents)
                self.doc['metadata'] = json_decode(doc_db.metadata)
                self.doc['version'] = doc_db.version
                self.doc['diff_version'] = doc_db.diff_version
                self.doc['comment_version'] = doc_db.comment_version
                self.doc['title'] = doc_db.title
                self.doc['id'] = doc_db.id
                self.doc['in_control'] = self.id
                DocumentWS.sessions[doc_db.id]=self.doc
            self.doc['participants'][self.id] = self
            response = dict()
            response['type'] = 'welcome'
            self.write_message(response)

            #DocumentWS.send_participant_list(self.document.id)

    def confirm_diff(self, request_id):
        response = dict()
        response['type'] = 'confirm_diff'
        response['request_id'] = request_id
        self.write_message(response)

    def send_document(self):
        response = dict()
        response['type'] = 'document_data'
        response['document'] = dict()
        response['document']['id']=self.doc['id']
        response['document']['version']=self.doc['version']
        if self.doc['diff_version'] < self.doc['version']:
            print "!!!diff version issue!!!"
            self.doc['diff_version'] = self.doc['version']
            self.doc["last_diffs"] = []
        response['document']['title']=self.doc['title']
        response['document']['contents']=self.doc['contents']
        response['document']['metadata']=self.doc['metadata']
        response['document']['settings']=self.doc['settings']
        document_owner = self.doc['db'].owner
        access_rights =  get_accessrights(AccessRight.objects.filter(document__owner=document_owner))
        response['document']['access_rights'] = access_rights

        #TODO: switch on filtering when choose workflow and have UI for assigning roles to users
        #filtered_comments = filter_comments_by_role(DocumentWS.sessions[self.user_info.document_id]["comments"], access_rights, 'editing', self.user_info)
        print self.doc["comments"]
        response['document']['comments']=self.doc["comments"]
        #response['document']['comments'] = filtered_comments
        response['document']['comment_version']=self.doc["comment_version"]
        response['document']['access_rights'] = get_accessrights(AccessRight.objects.filter(document__owner=document_owner))
        response['document']['owner'] = dict()
        response['document']['owner']['id']=document_owner.id
        response['document']['owner']['name']=document_owner.readable_name
        response['document']['owner']['avatar']=avatar_url(document_owner,80)
        response['document']['owner']['team_members']=[]

        for team_member in document_owner.leader.all():
            tm_object = dict()
            tm_object['id'] = team_member.member.id
            tm_object['name'] = team_member.member.readable_name
            tm_object['avatar'] = avatar_url(team_member.member,80)
            response['document']['owner']['team_members'].append(tm_object)
        response['document_values'] = dict()
        response['document_values']['is_owner']=self.user_info.is_owner
        response['document_values']['rights'] = self.user_info.access_rights
        if self.doc['version'] > self.doc['diff_version']:
            print "!!!diff version issue!!!"
            self.doc['diff_version'] = self.doc['version']
            self.doc["last_diffs"] = []
        elif self.doc['diff_version'] > self.doc['version']:
            needed_diffs = self.doc['diff_version'] - self.doc['version']
            response['document_values']['last_diffs'] = self.doc["last_diffs"][-needed_diffs:]
        else:
            response['document_values']['last_diffs'] = []
        if self.user_info.is_new:
            response['document_values']['is_new'] = True
        if not self.user_info.is_owner:
            response['user']=dict()
            response['user']['id']=self.user_info.user.id
            response['user']['name']=self.user_info.user.readable_name
            response['user']['avatar']=avatar_url(self.user_info.user,80)
        if self.doc['in_control'] == self.id:
            response['document_values']['control']=True
        response['document_values']['session_id']= self.id
        self.write_message(response)

    def on_message(self, message):
        if not self.user_info.document_id in DocumentWS.sessions:
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
        elif parsed["type"]=='selection_change':
            self.handle_selection_change(message, parsed)
        elif parsed["type"]=='update_document' and self.can_update_document():
            self.handle_document_update(parsed)
        elif parsed["type"]=='update_title' and self.can_update_document():
            self.handle_title_update(parsed)
        elif parsed["type"]=='setting_change' and self.can_update_document():
            self.handle_settings_change(message, parsed)
        elif parsed["type"]=='diff' and self.can_update_document():
            self.handle_diff(message, parsed)

    def update_document(self, changes):
        if changes['version'] == self.doc['version']:
            # Document hasn't changed, return.
            return
        elif changes['version'] > self.doc['diff_version'] or changes['version'] < self.doc['version']:
            # The version number is too high. Possibly due to server restart.
            # Do not accept it, and send a document instead.
            self.send_document()
            return
        else:
            # The saved version does not contain all accepted diffs, so we keep the remaining ones + 1000
            remaining_diffs = 1000 + self.doc['diff_version'] - changes['version']
            self.doc['last_diffs'] = self.doc['last_diffs'][-remaining_diffs:]
        self.doc['contents'] = changes['contents']
        self.doc['metadata'] = changes['metadata']
        self.doc['version'] = changes['version']

    def update_title(self, title):
        self.doc['title'] = title

    def update_comments(self, comments_updates):
        for cd in comments_updates:
            id = str(cd["id"])
            if cd["type"] == "create":
                del cd["type"]
                self.doc["comments"][id] = cd
            elif cd["type"] == "delete":
                del self.doc["comments"][id]
            elif cd["type"] == "update":
                self.doc["comments"][id]["comment"] = cd["comment"]
                if "review:isMajor" in cd:
                    self.doc["comments"][id]["review:isMajor"] = cd["review:isMajor"]
            elif cd["type"] == "add_answer":
                comment_id = str(cd["commentId"])
                if not "answers" in self.doc["comments"][comment_id]:
                    self.doc["comments"][comment_id]["answers"] = []
                del cd["type"]
                self.doc["comments"][comment_id]["answers"].append(cd)
            elif cd["type"] == "delete_answer":
                comment_id = str(cd["commentId"])
                for answer in self.doc["comments"][comment_id]["answers"]:
                    if answer["id"] == cd["id"]:
                        self.doc["comments"][comment_id]["answers"].remove(answer)
            elif cd["type"] == "update_answer":
                comment_id = str(cd["commentId"])
                for answer in documenet["comments"][comment_id]["answers"]:
                    if answer["id"] == cd["id"]:
                        answer["answer"] = cd["answer"]
            self.doc['comment_version'] += 1


    def handle_participant_update(self):
        DocumentWS.send_participant_list(self.user_info.document_id)

    def handle_document_update(self, parsed):
        self.update_document(parsed["document"])
        DocumentWS.save_document(self.user_info.document_id)
        message = {
            "type": 'check_hash',
            "diff_version": parsed["document"]["version"],
            "hash": parsed["document"]["hash"]
        }
        DocumentWS.send_updates(message, self.user_info.document_id, self.id)

    def handle_title_update(self, parsed):
        self.update_title(parsed["title"])
        DocumentWS.save_document(self.user_info.document_id)

    def handle_chat(self, parsed):
        chat = {
            "id": str(uuid.uuid4()),
            "body": parsed['body'],
            "from": self.user_info.user.id,
            "type": 'chat'
            }
        DocumentWS.send_updates(chat, self.user_info.document_id)

    def handle_selection_change(self, message, parsed):
        if self.user_info.document_id in DocumentWS.sessions and parsed["diff_version"] == self.doc['diff_version']:
            DocumentWS.send_updates(message, self.user_info.document_id, self.id)


    def handle_settings_change(self, message, parsed):
        DocumentWS.sessions[self.user_info.document_id]['settings'][parsed['variable']] = parsed['value']
        DocumentWS.send_updates(message, self.user_info.document_id, self.id)

    def handle_diff(self, message, parsed):
        if parsed["diff_version"] == self.doc['diff_version'] and parsed["comment_version"] == self.doc['comment_version']:
            self.doc["last_diffs"].extend(parsed["diff"])
            self.doc['diff_version'] += len(parsed["diff"])
            self.update_comments(parsed["comments"])
            self.confirm_diff(parsed["request_id"])
            DocumentWS.send_updates(message, self.user_info.document_id, self.id)
        elif parsed["diff_version"] != self.doc['diff_version']:
            if parsed["diff_version"] < (self.doc['diff_version'] - len(self.doc["last_diffs"])):
                print "unfixable"
                # Client has a version that is too old
                self.send_document()
            elif parsed["diff_version"] < self.doc['diff_version']:
                print "can fix it"
                number_requested_diffs = self.doc['diff_version'] - parsed["diff_version"]
                response = {
                    "type": "diff",
                    "diff_version": parsed["diff_version"],
                    "diff": self.doc["last_diffs"][-number_requested_diffs:],
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
            print self.doc['comment_version']

    def check_diff_version(self, parsed):
        if parsed["diff_version"] == self.doc['diff_version']:
            response = {
                "type": "confirm_diff_version",
                "diff_version": parsed["diff_version"],
            }
            self.write_message(response)
            return
        elif parsed["diff_version"] + len(self.doc["last_diffs"]) >= self.doc["diff_version"]:
            number_requested_diffs = self.doc['diff_version'] - parsed["diff_version"]
            response = {
                "type": "diff",
                "diff_version": parsed["diff_version"],
                "diff": self.doc["last_diffs"][-number_requested_diffs:],
            }
            self.write_message(response)
            return
        else:
            print "unfixable"
            # Client has a version that is too old
            self.send_document()
            return

    def can_update_document(self):
        return self.user_info.access_rights == 'w' or self.user_info.access_rights == 'a'

    def on_close(self):
        print "Websocket closing"
        if hasattr(self.user_info, 'document_id') and self.user_info.document_id in DocumentWS.sessions and self.id in DocumentWS.sessions[self.user_info.document_id]['participants']:
            del self.doc['participants'][self.id]
            if self.doc['in_control']==self.id:
                if len(self.doc['participants'].keys()) > 0:
                    message = {
                        "type": 'take_control'
                        }
                    new_controller = self.doc['participants'][min(self.doc['participants'])]
                    self.doc['in_control'] = new_controller.id
                    new_controller.write_message(message)
                    DocumentWS.send_participant_list(self.user_info.document_id)
                else:
                    DocumentWS.save_document(self.user_info.document_id)
                    del DocumentWS.sessions[self.user_info.document_id]
                    print "noone left"

    @classmethod
    def send_participant_list(cls, document_id):
        if document_id in DocumentWS.sessions:
            participant_list = []
            for waiter in cls.sessions[document_id]['participants'].keys():
                participant_list.append({
                    'session_id':waiter,
                    'id':cls.sessions[document_id]['participants'][waiter].user_info.user.id,
                    'name':cls.sessions[document_id]['participants'][waiter].user_info.user.readable_name,
                    'avatar':avatar_url(cls.sessions[document_id]['participants'][waiter].user_info.user,80)
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
        doc = cls.sessions[document_id]
        doc_db = doc['db']
        doc_db.title = doc['title']
        doc_db.version = doc['version']
        doc_db.diff_version = doc['diff_version']
        doc_db.comment_version = doc['comment_version']
        doc_db.contents = json_encode(doc['contents'])
        doc_db.metadata = json_encode(doc['metadata'])
        doc_db.settings = json_encode(doc['settings'])
        doc_db.last_diffs = json_encode(doc['last_diffs'])
        doc_db.comments = json_encode(doc['comments'])
        print "saving document #"+str(doc_db.id)+", version "+str(doc_db.version)
        doc_db.save()

    @classmethod
    def save_all_docs(cls):
        for document_id in cls.sessions:
            cls.save_document(document_id)

atexit.register(DocumentWS.save_all_docs)

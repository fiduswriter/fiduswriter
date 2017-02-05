import uuid
import atexit
from copy import deepcopy

from document.helpers.session_user_info import SessionUserInfo
from base.ws_handler import BaseWebSocketHandler
from logging import info, error
from tornado.escape import json_decode, json_encode
from tornado.websocket import WebSocketClosedError
from document.models import AccessRight, COMMENT_ONLY, CAN_UPDATE_DOCUMENT, \
    CAN_COMMUNICATE
from document.views import get_accessrights
from avatar.templatetags.avatar_tags import avatar_url
from ojs.models import Submission


class DocumentWS(BaseWebSocketHandler):
    sessions = dict()

    def open(self, document_id):
        print('Websocket opened')
        response = dict()
        current_user = self.get_current_user()
        if current_user is None:
            response['type'] = 'access_denied'
            self.write_message(response)
            return
        self.user_info = SessionUserInfo()
        doc_db, can_access = self.user_info.init_access(
            document_id, current_user)
        if can_access:
            if doc_db.id in DocumentWS.sessions:
                self.doc = DocumentWS.sessions[doc_db.id]
                self.id = max(self.doc['participants']) + 1
                print("id when opened %s" % self.id)
            else:
                self.id = 0
                self.doc = dict()
                self.doc['db'] = doc_db
                self.doc['participants'] = dict()
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
                DocumentWS.sessions[doc_db.id] = self.doc
            self.doc['participants'][self.id] = self
            response['type'] = 'welcome'
            self.write_message(response)

    def confirm_diff(self, request_id):
        response = dict()
        response['type'] = 'confirm_diff'
        response['request_id'] = request_id
        self.write_message(response)

    def send_document(self):
        response = dict()
        response['type'] = 'doc_data'
        response['doc'] = dict()
        response['doc']['id'] = self.doc['id']
        response['doc']['version'] = self.doc['version']
        if self.doc['diff_version'] < self.doc['version']:
            print('!!!diff version issue!!!')
            self.doc['diff_version'] = self.doc['version']
            self.doc["last_diffs"] = []
        response['doc']['title'] = self.doc['title']
        response['doc']['contents'] = self.doc['contents']
        response['doc']['metadata'] = self.doc['metadata']
        response['doc']['settings'] = self.doc['settings']
        doc_owner = self.doc['db'].owner
        access_rights = get_accessrights(
            AccessRight.objects.filter(
                document__owner=doc_owner))
        response['doc']['access_rights'] = access_rights

        if self.user_info.access_rights == 'read-without-comments':
            response['doc']['comments'] = []
        elif self.user_info.access_rights == 'review':
            # Reviewer should only get his/her own comments
            filtered_comments = {}
            for key, value in self.doc["comments"].items():
                if value["user"] == self.user_info.user.id:
                    filtered_comments[key] = value
            response['doc']['comments'] = filtered_comments
        else:
            response['doc']['comments'] = self.doc["comments"]
        response['doc']['comment_version'] = self.doc["comment_version"]
        response['doc']['access_rights'] = get_accessrights(
            AccessRight.objects.filter(document__owner=doc_owner))
        response['doc']['owner'] = dict()
        response['doc']['owner']['id'] = doc_owner.id
        response['doc']['owner']['name'] = doc_owner.readable_name
        response['doc']['owner'][
            'avatar'] = avatar_url(doc_owner, 80)
        response['doc']['owner']['team_members'] = []

        for team_member in doc_owner.leader.all():
            tm_object = dict()
            tm_object['id'] = team_member.member.id
            tm_object['name'] = team_member.member.readable_name
            tm_object['avatar'] = avatar_url(team_member.member, 80)
            response['doc']['owner']['team_members'].append(tm_object)
        response['doc_info'] = dict()
        response['doc_info']['is_owner'] = self.user_info.is_owner
        response['doc_info']['rights'] = self.user_info.access_rights
        if self.doc['version'] > self.doc['diff_version']:
            print('!!!diff version issue!!!')
            self.doc['diff_version'] = self.doc['version']
            self.doc["last_diffs"] = []
        elif self.doc['diff_version'] > self.doc['version']:
            needed_diffs = self.doc['diff_version'] - self.doc['version']
            # We only send those diffs needed by the receiver.
            response['doc_info']['unapplied_diffs'] = self.doc[
                "last_diffs"][-needed_diffs:]
        else:
            response['doc_info']['unapplied_diffs'] = []
        # OJS submission related
        response['doc_info']['submission'] = dict()
        submissions = Submission.objects.filter(
            document_id=self.doc['id']
        )
        if len(submissions) > 0 and submissions[0].version_id != 0:
            submission = submissions[0]
            response['doc_info']['submission']['status'] = 'submitted'
            response['doc_info']['submission']['submission_id'] = \
                submission.submission_id
            response['doc_info']['submission']['user_id'] = submission.user_id
            response['doc_info']['submission']['version_id'] = \
                submission.version_id
            response['doc_info']['submission']['journal_id'] = \
                submission.journal_id
        else:
            response['doc_info']['submission']['status'] = 'unsubmitted'
        if self.user_info.is_owner:
            the_user = self.user_info.user
            # Data used for OJS submissions
            response['doc']['owner']['email'] = the_user.email
            response['doc']['owner']['username'] = the_user.username
            response['doc']['owner']['first_name'] = the_user.first_name
            response['doc']['owner']['last_name'] = the_user.last_name
            response['doc']['owner']['email'] = the_user.email
        else:
            the_user = self.user_info.user
            response['user'] = dict()
            response['user']['id'] = the_user.id
            response['user']['name'] = the_user.readable_name
            response['user']['avatar'] = avatar_url(the_user, 80)
            # Data used for OJS submissions
            response['user']['email'] = the_user.email
            response['user']['username'] = the_user.username
            response['user']['first_name'] = the_user.first_name
            response['user']['last_name'] = the_user.last_name
            response['user']['email'] = the_user.email
        response['doc_info']['session_id'] = self.id
        self.write_message(response)

    def on_message(self, message):
        if self.user_info.document_id not in DocumentWS.sessions:
            print('receiving message for closed document')
            return
        parsed = json_decode(message)
        print(parsed["type"])
        if parsed["type"] == 'get_document':
            self.send_document()
        elif parsed["type"] == 'participant_update' and self.can_communicate():
            self.handle_participant_update()
        elif parsed["type"] == 'chat' and self.can_communicate():
            self.handle_chat(parsed)
        elif parsed["type"] == 'check_diff_version':
            self.check_diff_version(parsed)
        elif parsed["type"] == 'selection_change':
            self.handle_selection_change(parsed)
        elif (
            parsed["type"] == 'update_doc' and
            self.can_update_document()
        ):
            self.handle_document_update(parsed)
        elif parsed["type"] == 'update_title' and self.can_update_document():
            self.handle_title_update(parsed)
        elif parsed["type"] == 'diff' and self.can_update_document():
            self.handle_diff(parsed)

    def update_document(self, changes):
        if changes['version'] == self.doc['version']:
            # Document hasn't changed, return.
            return
        elif (
            changes['version'] > self.doc['diff_version'] or
            changes['version'] < self.doc['version']
        ):
            # The version number is too high. Possibly due to server restart.
            # Do not accept it, and send a document instead.
            self.send_document()
            return
        else:
            # The saved version does not contain all accepted diffs, so we keep
            # the remaining ones + 1000 in case a client needs to reconnect and
            # is missing some.
            remaining_diffs = 1000 + \
                self.doc['diff_version'] - changes['version']
            self.doc['last_diffs'] = self.doc['last_diffs'][-remaining_diffs:]
        self.doc['title'] = changes['title']
        self.doc['contents'] = changes['contents']
        self.doc['metadata'] = changes['metadata']
        self.doc['settings'] = changes['settings']
        self.doc['version'] = changes['version']

    def update_title(self, title):
        self.doc['title'] = title

    def update_comments(self, comments_updates):
        comments_updates = deepcopy(comments_updates)
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
                    self.doc["comments"][id][
                        "review:isMajor"] = cd["review:isMajor"]
            elif cd["type"] == "add_answer":
                comment_id = str(cd["commentId"])
                if "answers" not in self.doc["comments"][comment_id]:
                    self.doc["comments"][comment_id]["answers"] = []
                del cd["type"]
                self.doc["comments"][comment_id]["answers"].append(cd)
            elif cd["type"] == "delete_answer":
                comment_id = str(cd["commentId"])
                for answer in self.doc["comments"][comment_id]["answers"]:
                    if answer["id"] == cd["id"]:
                        self.doc["comments"][comment_id][
                            "answers"].remove(answer)
            elif cd["type"] == "update_answer":
                comment_id = str(cd["commentId"])
                for answer in self.doc["comments"][comment_id]["answers"]:
                    if answer["id"] == cd["id"]:
                        answer["answer"] = cd["answer"]
            self.doc['comment_version'] += 1

    def handle_participant_update(self):
        DocumentWS.send_participant_list(self.user_info.document_id)

    def handle_document_update(self, parsed):
        self.update_document(parsed["doc"])
        DocumentWS.save_document(self.user_info.document_id, False)
        message = {
            "type": 'check_hash',
            "diff_version": parsed["doc"]["version"],
            "hash": parsed["hash"]
        }
        DocumentWS.send_updates(message, self.user_info.document_id, self.id)

    def handle_title_update(self, parsed):
        self.update_title(parsed["title"])
        DocumentWS.save_document(self.user_info.document_id, False)

    def handle_chat(self, parsed):
        chat = {
            "id": str(uuid.uuid4()),
            "body": parsed['body'],
            "from": self.user_info.user.id,
            "type": 'chat'
        }
        DocumentWS.send_updates(chat, self.user_info.document_id)

    def handle_selection_change(self, parsed):
        if self.user_info.document_id in DocumentWS.sessions and parsed[
                "diff_version"] == self.doc['diff_version']:
            DocumentWS.send_updates(
                parsed, self.user_info.document_id, self.id)

    # Checks if the diff only contains changes to comments.
    def only_comments(self, parsed_diffs):
        allowed_operations = ['addMark', 'removeMark']
        only_comment = True
        for diff in parsed_diffs:
            if not (diff['stepType'] in allowed_operations and diff[
                    'mark']['type'] == 'comment'):
                only_comment = False
        return only_comment

    def handle_diff(self, parsed):
        pdv = parsed["diff_version"]
        ddv = self.doc['diff_version']
        pcv = parsed["comment_version"]
        dcv = self.doc['comment_version']
        if (
            self.user_info.access_rights in COMMENT_ONLY and
            not self.only_comments(parsed['diff'])
        ):
            print(
                (
                    'received non-comment diff from comment-only '
                    'collaborator. Discarding.'
                )
            )
            return
        if pdv == ddv and pcv == dcv:
            self.doc["last_diffs"].extend(parsed["diff"])
            self.doc['diff_version'] += len(parsed["diff"])
            self.update_comments(parsed["comments"])
            self.confirm_diff(parsed["request_id"])
            DocumentWS.send_updates(
                parsed,
                self.user_info.document_id,
                self.id,
                self.user_info.user.id
            )
        elif pdv > ddv:
            # Client has a higher version than server. Something is fishy!
            print('unfixable')
        elif pdv < ddv:
            if pdv + len(self.doc["last_diffs"]) >= ddv:
                # We have enough last_diffs stored to fix it.
                print("can fix it")
                number_diffs = \
                    parsed["diff_version"] - self.doc['diff_version']
                response = {
                    "type": "diff",
                    "diff_version": parsed["diff_version"],
                    "diff": self.doc["last_diffs"][number_diffs:],
                    "reject_request_id": parsed["request_id"],
                }
                self.write_message(response)
            else:
                print('unfixable')
                # Client has a version that is too old to be fixed
                self.send_document()
        else:
            print('comment_version incorrect!')

    def check_diff_version(self, parsed):
        pdv = parsed["diff_version"]
        ddv = self.doc['diff_version']
        if pdv == ddv:
            response = {
                "type": "confirm_diff_version",
                "diff_version": pdv,
            }
            self.write_message(response)
            return
        elif pdv + len(self.doc["last_diffs"]) >= ddv:
            print("can fix it")
            number_diffs = pdv - ddv
            response = {
                "type": "diff",
                "diff_version": pdv,
                "diff": self.doc["last_diffs"][number_diffs:],
            }
            self.write_message(response)
            return
        else:
            print('unfixable')
            # Client has a version that is too old
            self.send_document()
            return

    def can_update_document(self):
        return self.user_info.access_rights in CAN_UPDATE_DOCUMENT

    def can_communicate(self):
        return self.user_info.access_rights in CAN_COMMUNICATE

    def on_close(self):
        print('Websocket closing')
        if (
            hasattr(self, 'user_info') and
            hasattr(self.user_info, 'document_id') and
            self.user_info.document_id in DocumentWS.sessions and
            hasattr(self, 'id') and
            self.id in DocumentWS.sessions[
                self.user_info.document_id
            ]['participants']
        ):
            del self.doc['participants'][self.id]
            if len(self.doc['participants'].keys()) == 0:
                DocumentWS.save_document(self.user_info.document_id, True)
                del DocumentWS.sessions[self.user_info.document_id]
                print("noone left")

    @classmethod
    def send_participant_list(cls, document_id):
        if document_id in DocumentWS.sessions:
            participant_list = []
            for session_id, waiter in cls.sessions[
                document_id
            ]['participants'].items():
                access_rights = waiter.user_info.access_rights
                if access_rights not in CAN_COMMUNICATE:
                    continue
                participant_list.append({
                    'session_id': session_id,
                    'id': waiter.user_info.user.id,
                    'name': waiter.user_info.user.readable_name,
                    'avatar': avatar_url(waiter.user_info.user, 80)
                })
            message = {
                "participant_list": participant_list,
                "type": 'connections'
            }
            DocumentWS.send_updates(message, document_id)

    @classmethod
    def send_updates(cls, message, document_id, sender_id=None, user_id=None):
        info("sending message to %d waiters", len(cls.sessions[document_id]))
        for waiter in cls.sessions[document_id]['participants'].values():
            if waiter.id != sender_id:
                access_rights = waiter.user_info.access_rights
                if "comments" in message and len(message["comments"]) > 0:
                    # Filter comments if needed
                    if access_rights == 'read-without-comments':
                        # The reader should not receive the comments update, so
                        # we remove the comments from the copy of the message
                        # sent to the reviewer. We still need to sned the rest
                        # of the message as it may contain other diff
                        # information.
                        message = deepcopy(message)
                        message['comments'] = []
                    elif (
                        access_rights == 'review' and
                        user_id != waiter.user_info.user.id
                    ):
                        # The reviewer should not receive comments updates from
                        # others than themselves, so we remove the comments
                        # from the copy of the message sent to the reviewer
                        # that are not from them. We still need to sned the
                        # rest of the message as it may contain other diff
                        # information.
                        message = deepcopy(message)
                        message['comments'] = []
                elif (
                    message['type'] in ["chat", "connections"] and
                    access_rights not in CAN_COMMUNICATE
                ):
                    continue
                elif (
                    message['type'] == "selection_change" and
                    access_rights not in CAN_COMMUNICATE and
                    user_id != waiter.user_info.user.id
                ):
                    continue
                try:
                    waiter.write_message(message)
                except WebSocketClosedError:
                    error("Error sending message", exc_info=True)

    @classmethod
    def save_document(cls, document_id, all_have_left):
        doc = cls.sessions[document_id]
        doc_db = doc['db']
        doc_db.title = doc['title']
        doc_db.version = doc['version']
        doc_db.diff_version = doc['diff_version']
        doc_db.comment_version = doc['comment_version']
        doc_db.contents = json_encode(doc['contents'])
        doc_db.metadata = json_encode(doc['metadata'])
        doc_db.settings = json_encode(doc['settings'])
        if all_have_left:
            remaining_diffs = doc['diff_version'] - doc['version']
            if remaining_diffs > 0:
                doc['last_diffs'] = doc['last_diffs'][-remaining_diffs:]
            else:
                doc['last_diffs'] = []
        doc_db.last_diffs = json_encode(doc['last_diffs'])
        doc_db.comments = json_encode(doc['comments'])
        print('saving document #' + str(doc_db.id))
        print('version ' + str(doc_db.version))
        doc_db.save()

    @classmethod
    def save_all_docs(cls):
        for document_id in cls.sessions:
            cls.save_document(document_id, True)

atexit.register(DocumentWS.save_all_docs)

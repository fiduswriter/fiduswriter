from builtins import str
import uuid
import atexit
import json
from time import mktime, time
from copy import deepcopy

from jsonpatch import apply_patch, JsonPatchConflict, JsonPointerException

from django.db.utils import DatabaseError
from document.helpers.session_user_info import SessionUserInfo
from document.helpers.serializers import PythonWithURLSerializer
from base.ws_handler import BaseWebSocketHandler
import logging
from tornado.escape import json_decode, json_encode
from document.models import COMMENT_ONLY, CAN_UPDATE_DOCUMENT, \
    CAN_COMMUNICATE, FW_DOCUMENT_VERSION, DocumentTemplate, Document
from usermedia.models import Image, DocumentImage, UserImage
from user.util import get_user_avatar_url

from django.db.models import F, Q

logger = logging.getLogger(__name__)


class WebSocket(BaseWebSocketHandler):
    sessions = dict()
    history_length = 1000  # Only keep the last 1000 diffs

    def open(self, arg):
        super().open(arg)
        if len(self.args) < 2:
            self.access_denied()
            return
        self.document_id = int(self.args[0])

    def confirm_diff(self, rid):
        response = {
            'type': 'confirm_diff',
            'rid': rid
        }
        self.send_message(response)

    def subscribe_doc(self, connection_count=0):
        self.user_info = SessionUserInfo(self.user)
        doc_db, can_access = self.user_info.init_access(
            self.document_id
        )
        if not can_access or float(doc_db.doc_version) != FW_DOCUMENT_VERSION:
            self.access_denied()
            return
        if (
            doc_db.id in WebSocket.sessions and
            len(WebSocket.sessions[doc_db.id]['participants']) > 0
        ):
            logger.debug("Serving already opened file")
            self.doc = WebSocket.sessions[doc_db.id]
            self.id = max(self.doc['participants']) + 1
            self.doc['participants'][self.id] = self
            logger.debug("id when opened %s" % self.id)
        else:
            logger.debug("Opening file")
            self.id = 0
            self.doc = {
                'db': doc_db,
                'participants': {
                    0: self
                },
                'last_diffs': json_decode(doc_db.last_diffs),
                'comments': json_decode(doc_db.comments),
                'bibliography': json_decode(doc_db.bibliography),
                'contents': json_decode(doc_db.contents),
                'version': doc_db.version,
                'title': doc_db.title,
                'id': doc_db.id,
                'template': {
                    'id': doc_db.template.id,
                    'definition': json_decode(doc_db.template.definition)
                }
            }
            WebSocket.sessions[doc_db.id] = self.doc
        self.send_message({
            'type': 'subscribed'
        })
        if connection_count < 1:
            self.send_styles()
            self.send_document()
        if self.can_communicate():
            self.handle_participant_update()

    def send_styles(self):
        doc_db = self.doc['db']
        response = dict()
        response['type'] = 'styles'
        serializer = PythonWithURLSerializer()
        export_temps = serializer.serialize(
            doc_db.template.exporttemplate_set.all(),
            fields=['file_type', 'template_file', 'title']
        )
        document_styles = serializer.serialize(
            doc_db.template.documentstyle_set.all(),
            use_natural_foreign_keys=True,
            fields=['title', 'slug', 'contents', 'documentstylefile_set']
        )
        document_templates = {}
        for obj in DocumentTemplate.objects.filter(
            Q(user=self.user) | Q(user=None)
        ).order_by(F('user').desc(nulls_first=True)):
            document_templates[obj.import_id] = {
                'title': obj.title,
                'id': obj.id
            }

        response['styles'] = {
            'export_templates': [obj['fields'] for obj in export_temps],
            'document_styles': [obj['fields'] for obj in document_styles],
            'document_templates': document_templates
        }
        self.send_message(response)

    def unfixable(self):
        self.send_document()

    def send_document(self):
        response = dict()
        response['type'] = 'doc_data'
        doc_owner = self.doc['db'].owner
        response['doc_info'] = {
            'id': self.doc['id'],
            'is_owner': self.user_info.is_owner,
            'access_rights': self.user_info.access_rights,
            'owner': {
                'id': doc_owner.id,
                'name': doc_owner.readable_name,
                'username': doc_owner.username,
                'avatar': get_user_avatar_url(doc_owner),
                'team_members': []
            }
        }
        response['doc'] = {
            'v': self.doc['version'],
            'contents': self.doc['contents'],
            'bibliography': self.doc['bibliography'],
            'template': self.doc['template'],
            'images': {}
        }
        response['time'] = int(time()) * 1000
        for dimage in DocumentImage.objects.filter(document_id=self.doc['id']):
            image = dimage.image
            field_obj = {
                'id': image.id,
                'title': dimage.title,
                'copyright': json.loads(dimage.copyright),
                'image': image.image.url,
                'file_type': image.file_type,
                'added': mktime(image.added.timetuple()) * 1000,
                'checksum': image.checksum,
                'cats': []
            }
            if image.thumbnail:
                field_obj['thumbnail'] = image.thumbnail.url
                field_obj['height'] = image.height
                field_obj['width'] = image.width
            response['doc']['images'][image.id] = field_obj
        if self.user_info.access_rights == 'read-without-comments':
            response['doc']['comments'] = []
        elif self.user_info.access_rights == 'review':
            # Reviewer should only get his/her own comments
            filtered_comments = {}
            for key, value in list(self.doc["comments"].items()):
                if value["user"] == self.user_info.user.id:
                    filtered_comments[key] = value
            response['doc']['comments'] = filtered_comments
        else:
            response['doc']['comments'] = self.doc["comments"]
        for team_member in doc_owner.leader.all():
            tm_object = dict()
            tm_object['id'] = team_member.member.id
            tm_object['name'] = team_member.member.readable_name
            tm_object['username'] = team_member.member.get_username()
            tm_object['avatar'] = get_user_avatar_url(team_member.member)
            response['doc_info']['owner']['team_members'].append(tm_object)
        response['doc_info']['session_id'] = self.id
        self.send_message(response)

    def reject_message(self, message):
        if (message["type"] == "diff"):
            self.send_message({
                'type': 'reject_diff',
                'rid': message['rid']
            })

    def handle_message(self, message):
        if message["type"] == 'subscribe':
            connection_count = 0
            if 'connection' in message:
                connection_count = message['connection']
            self.subscribe_doc(connection_count)
            return
        if self.user_info.document_id not in WebSocket.sessions:
            logger.debug('receiving message for closed document')
            return
        if message["type"] == 'get_document':
            self.send_document()
        elif (
            message["type"] == 'participant_update' and
            self.can_communicate()
        ):
            self.handle_participant_update()
        elif message["type"] == 'chat' and self.can_communicate():
            self.handle_chat(message)
        elif message["type"] == 'check_version':
            self.check_version(message)
        elif message["type"] == 'selection_change':
            self.handle_selection_change(message)
        elif message["type"] == 'diff' and self.can_update_document():
            self.handle_diff(message)

    def update_bibliography(self, bibliography_updates):
        for bu in bibliography_updates:
            if "id" not in bu:
                continue
            id = bu["id"]
            if bu["type"] == "update":
                self.doc["bibliography"][id] = bu["reference"]
            elif bu["type"] == "delete":
                del self.doc["bibliography"][id]

    def update_images(self, image_updates):
        for iu in image_updates:
            if "id" not in iu:
                continue
            id = iu["id"]
            if iu["type"] == "update":
                # Ensure that access rights exist
                if not UserImage.objects.filter(
                    image__id=id,
                    owner=self.user_info.user
                ).exists():
                    continue
                doc_image = DocumentImage.objects.filter(
                    document_id=self.doc["id"],
                    image_id=id
                ).first()
                if doc_image:
                    doc_image.title = iu["image"]["title"]
                    doc_image.copyright = json.dumps(iu["image"]["copyright"])
                    doc_image.save()
                else:
                    DocumentImage.objects.create(
                        document_id=self.doc["id"],
                        image_id=id,
                        title=iu["image"]["title"],
                        copyright=json.dumps(iu["image"]["copyright"])
                    )
            elif iu["type"] == "delete":
                DocumentImage.objects.filter(
                    document_id=self.doc["id"],
                    image_id=id
                ).delete()
                for image in Image.objects.filter(id=id):
                    if image.is_deletable():
                        image.delete()

    def update_comments(self, comments_updates):
        comments_updates = deepcopy(comments_updates)
        for cd in comments_updates:
            if "id" not in cd:
                # ignore
                continue
            id = cd["id"]
            if cd["type"] == "create":
                self.doc["comments"][id] = {
                    "user": cd["user"],
                    "username": cd["username"],
                    "assignedUser": cd["assignedUser"],
                    "assignedUsername": cd["assignedUsername"],
                    "date": cd["date"],
                    "comment": cd["comment"],
                    "isMajor": cd["isMajor"],
                    "resolved": cd["resolved"],
                }
            elif cd["type"] == "delete":
                del self.doc["comments"][id]
            elif cd["type"] == "update":
                self.doc["comments"][id]["comment"] = cd["comment"]
                if "isMajor" in cd:
                    self.doc["comments"][id][
                        "isMajor"] = cd["isMajor"]
                if "assignedUser" in cd and "assignedUsername" in cd:
                    self.doc["comments"][id][
                        "assignedUser"] = cd["assignedUser"]
                    self.doc["comments"][id][
                        "assignedUsername"] = cd["assignedUsername"]
                if "resolved" in cd:
                    self.doc["comments"][id][
                        "resolved"] = cd["resolved"]
            elif cd["type"] == "add_answer":
                if "answers" not in self.doc["comments"][id]:
                    self.doc["comments"][id]["answers"] = []
                self.doc["comments"][id]["answers"].append({
                    "id": cd["answerId"],
                    "user": cd["user"],
                    "username": cd["username"],
                    "date": cd["date"],
                    "answer": cd["answer"]
                })
            elif cd["type"] == "delete_answer":
                answer_id = cd["answerId"]
                for answer in self.doc["comments"][id]["answers"]:
                    if answer["id"] == answer_id:
                        self.doc["comments"][id]["answers"].remove(answer)
            elif cd["type"] == "update_answer":
                answer_id = cd["answerId"]
                for answer in self.doc["comments"][id]["answers"]:
                    if answer["id"] == answer_id:
                        answer["answer"] = cd["answer"]

    def handle_participant_update(self):
        WebSocket.send_participant_list(self.user_info.document_id)

    def handle_chat(self, message):
        chat = {
            "id": str(uuid.uuid4()),
            "body": message['body'],
            "from": self.user_info.user.id,
            "type": 'chat'
        }
        WebSocket.send_updates(chat, self.user_info.document_id)

    def handle_selection_change(self, message):
        if self.user_info.document_id in WebSocket.sessions and message[
                "v"] == self.doc['version']:
            WebSocket.send_updates(
                message, self.user_info.document_id, self.id)

    # Checks if the diff only contains changes to comments.
    def only_comments(self, message):
        allowed_operations = ['addMark', 'removeMark']
        only_comment = True
        if "ds" in message:  # ds = document steps
            for step in message["ds"]:
                if not (step['stepType'] in allowed_operations and step[
                        'mark']['type'] == 'comment'):
                    only_comment = False
        return only_comment

    def handle_diff(self, message):
        pv = message["v"]
        dv = self.doc['version']
        logger.debug("PV: %d, DV: %d" % (pv, dv))
        if (
            self.user_info.access_rights in COMMENT_ONLY and
            not self.only_comments(message)
        ):
            logger.error(
                (
                    'received non-comment diff from comment-only '
                    'collaborator. Discarding.'
                )
            )
            return
        if pv == dv:
            self.doc["last_diffs"].append(message)
            self.doc["last_diffs"] = self.doc[
                "last_diffs"
            ][-self.history_length:]
            self.doc['version'] += 1
            if "jd" in message:  # jd = json diff
                try:
                    apply_patch(
                       self.doc['contents'],
                       message["jd"],
                       True
                    )
                except (JsonPatchConflict, JsonPointerException):
                    logger.exception("Cannot apply json diff.")
                    logger.error(json_encode(message))
                    logger.error(json_encode(self.doc['contents']))
                    self.unfixable()
                # The json diff is only needed by the python backend which does
                # not understand the steps. It can therefore be removed before
                # broadcast to other clients.
                del message["jd"]
            if "ti" in message:  # ti = title
                self.doc["title"] = message["ti"]
            if "cu" in message:  # cu = comment updates
                self.update_comments(message["cu"])
            if "bu" in message:  # bu = bibliography updates
                self.update_bibliography(message["bu"])
            if "iu" in message:  # iu = image updates
                self.update_images(message["iu"])
            if self.doc['version'] % 10 == 0:
                WebSocket.save_document(self.user_info.document_id)
            self.confirm_diff(message["rid"])
            WebSocket.send_updates(
                message,
                self.user_info.document_id,
                self.id,
                self.user_info.user.id
            )
        elif pv < dv:
            if pv + len(self.doc["last_diffs"]) >= dv:
                # We have enough last_diffs stored to fix it.
                logger.debug("can fix it")
                number_diffs = pv - dv
                messages = self.doc["last_diffs"][number_diffs:]
                for message in messages:
                    new_message = message.copy()
                    new_message["server_fix"] = True
                    self.send_message(new_message)
            else:
                logger.debug('unfixable')
                # Client has a version that is too old to be fixed
                self.unfixable()
        else:
            # Client has a higher version than server. Something is fishy!
            logger.debug('unfixable')

    def check_version(self, message):
        pv = message["v"]
        dv = self.doc['version']
        logger.debug("PV: %d, DV: %d" % (pv, dv))
        if pv == dv:
            response = {
                "type": "confirm_version",
                "v": pv,
            }
            self.send_message(response)
            return
        elif pv + len(self.doc["last_diffs"]) >= dv:
            logger.debug("can fix it")
            number_diffs = pv - dv
            messages = self.doc["last_diffs"][number_diffs:]
            for message in messages:
                new_message = message.copy()
                new_message["server_fix"] = True
                self.send_message(new_message)
            return
        else:
            logger.debug('unfixable')
            # Client has a version that is too old
            self.unfixable()
            return

    def can_update_document(self):
        return self.user_info.access_rights in CAN_UPDATE_DOCUMENT

    def can_communicate(self):
        return self.user_info.access_rights in CAN_COMMUNICATE

    def on_close(self):
        logger.debug('Websocket closing')
        if (
            hasattr(self, 'user_info') and
            hasattr(self.user_info, 'document_id') and
            self.user_info.document_id in WebSocket.sessions and
            hasattr(self, 'id') and
            self.id in WebSocket.sessions[
                self.user_info.document_id
            ]['participants']
        ):
            del self.doc['participants'][self.id]
            if len(self.doc['participants']) == 0:
                WebSocket.save_document(self.user_info.document_id)
                del WebSocket.sessions[self.user_info.document_id]
                logger.debug("noone left")
            else:
                WebSocket.send_participant_list(self.user_info.document_id)

    @classmethod
    def send_participant_list(cls, document_id):
        if document_id in WebSocket.sessions:
            participant_list = []
            for session_id, waiter in list(cls.sessions[
                document_id
            ]['participants'].items()):
                access_rights = waiter.user_info.access_rights
                if access_rights not in CAN_COMMUNICATE:
                    continue
                participant_list.append({
                    'session_id': session_id,
                    'id': waiter.user_info.user.id,
                    'name': waiter.user_info.user.readable_name,
                    'avatar': get_user_avatar_url(waiter.user_info.user)
                })
            message = {
                "participant_list": participant_list,
                "type": 'connections'
            }
            WebSocket.send_updates(message, document_id)

    @classmethod
    def send_updates(cls, message, document_id, sender_id=None, user_id=None):
        logger.debug(
            "Sending message to %d waiters",
            len(cls.sessions[document_id]['participants'])
        )
        for waiter in list(cls.sessions[document_id]['participants'].values()):
            if waiter.id != sender_id:
                access_rights = waiter.user_info.access_rights
                if "comments" in message and len(message["comments"]) > 0:
                    # Filter comments if needed
                    if access_rights == 'read-without-comments':
                        # The reader should not receive the comments update, so
                        # we remove the comments from the copy of the message
                        # sent to the reviewer. We still need to send the rest
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
                        # that are not from them. We still need to send the
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
                waiter.send_message(message)

    @classmethod
    def save_document(cls, document_id):
        doc = cls.sessions[document_id]
        doc_db = doc['db']
        if doc_db.version == doc['version']:
            return
        doc_db.title = doc['title'][-255:]
        doc_db.version = doc['version']
        doc_db.contents = json_encode(doc['contents'])
        doc_db.last_diffs = json_encode(doc['last_diffs'])
        doc_db.comments = json_encode(doc['comments'])
        doc_db.bibliography = json_encode(doc['bibliography'])
        logger.debug('saving document # %d' % doc_db.id)
        logger.debug('version %d' % doc_db.version)
        try:
            # this try block is to avoid a db exception
            # in case the doc has been deleted from the db
            # in fiduswriter the owner of a doc could delete a doc
            # while an invited writer is editing the same doc
            doc_db.save(update_fields=[
                        'title',
                        'version',
                        'contents',
                        'last_diffs',
                        'comments',
                        'bibliography',
                        'updated'])
        except DatabaseError as e:
            expected_msg = 'Save with update_fields did not affect any rows.'
            if str(e) == expected_msg:
                cls.__insert_document(doc=doc_db)
            else:
                raise e

    @classmethod
    def __insert_document(cls, doc: Document) -> None:
        """
        Purpose:
        during plugin tests we experienced Integrity errors
         at the end of tests.
        This exception occurs while handling another exception,
         so in order to have a clean tests output
          we raise the exception in a way we don't output
           misleading error messages related to different exceptions

        :param doc: socket document model instance
        :return: None
        """
        from django.db.utils import IntegrityError
        try:
            doc.save()
        except IntegrityError as e:
            raise IntegrityError(
                'plugin test error when we try to save a doc already deleted '
                'along with the rest of db data so it '
                'raises an Integrity error: {}'.format(e)) from None

    @classmethod
    def save_all_docs(cls):
        for document_id in cls.sessions:
            cls.save_document(document_id)


atexit.register(WebSocket.save_all_docs)

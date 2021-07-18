import uuid
import atexit
import logging
import copy
from time import mktime, time
from copy import deepcopy


from django.db.utils import DatabaseError
from django.db.models import F, Q
from django.conf import settings

from document.helpers.session_user_info import SessionUserInfo
from document import prosemirror
from document.helpers.serializers import PythonWithURLSerializer
from base.ws_handler import BaseWebSocketHandler
from document.models import (
    COMMENT_ONLY,
    CAN_UPDATE_DOCUMENT,
    CAN_COMMUNICATE,
    FW_DOCUMENT_VERSION,
    DocumentTemplate,
    Document,
)
from usermedia.models import Image, DocumentImage, UserImage

# settings_JSONPATCH
from jsonpatch import apply_patch, JsonPatchConflict, JsonPointerException
from tornado.escape import json_encode

# end settings_JSONPATCH

logger = logging.getLogger(__name__)


class WebSocket(BaseWebSocketHandler):
    sessions = dict()
    history_length = 1000  # Only keep the last 1000 diffs

    def open(self, arg):
        super().open(arg)
        if len(self.args) < 2:
            self.access_denied()
            return
        self.sessionument_id = int(self.args[0])
        logger.debug(
            f"Action:Document socket opened by user. "
            f"URL:{self.endpoint} User:{self.user.id} ParticipantID:{self.id}"
        )

    def confirm_diff(self, rid):
        response = {"type": "confirm_diff", "rid": rid}
        self.send_message(response)

    def subscribe_doc(self, connection_count=0):
        self.user_info = SessionUserInfo(self.user)
        doc_db, can_access = self.user_info.init_access(self.sessionument_id)
        if not can_access or float(doc_db.doc_version) != FW_DOCUMENT_VERSION:
            self.access_denied()
            return
        if (
            doc_db.id in WebSocket.sessions
            and len(WebSocket.sessions[doc_db.id]["participants"]) > 0
        ):
            logger.debug(
                f"Action:Serving already opened document. "
                f"URL:{self.endpoint} User:{self.user.id} "
                f" ParticipantID:{self.id}"
            )
            self.session = WebSocket.sessions[doc_db.id]
            self.id = max(self.session["participants"]) + 1
            self.session["participants"][self.id] = self
            template = False
        else:
            logger.debug(
                f"Action:Opening document from DB. "
                f"URL:{self.endpoint} User:{self.user.id} "
                f"ParticipantID:{self.id}"
            )
            self.id = 0
            if "type" in doc_db.content:
                content = doc_db.content
            else:
                content = copy.deepcopy(doc_db.template.content)
                if "type" not in content:
                    content["type"] = "article"
                if "content" not in content:
                    content["content"] = [{type: "title"}]
                doc_db.content = content
                doc_db.save()
            node = prosemirror.from_json({"type": "doc", "content": [content]})
            self.session = {
                "doc": doc_db,
                "node": node,
                "participants": {0: self},
                "last_saved_version": doc_db.version,
            }
            WebSocket.sessions[doc_db.id] = self.session
            if self.user_info.access_rights == "write":
                template = True
            else:
                template = False
        logger.debug(
            f"Action:Participant ID Assigned. URL:{self.endpoint} "
            f"User:{self.user.id} ParticipantID:{self.id}"
        )
        self.send_message({"type": "subscribed"})
        if connection_count < 1:
            self.send_styles()
            self.send_document(False, template)
        if connection_count >= 1:
            # If the user is reconnecting pass along access_rights to
            # front end to compare it with previous rights.
            self.send_message(
                {
                    "type": "access_right",
                    "access_right": self.user_info.access_rights,
                }
            )
        if self.can_communicate():
            self.handle_participant_update()

    def send_styles(self):
        doc_db = self.session["doc"]
        response = dict()
        response["type"] = "styles"
        serializer = PythonWithURLSerializer()
        export_temps = serializer.serialize(
            doc_db.template.exporttemplate_set.all(),
            fields=["file_type", "template_file", "title"],
        )
        document_styles = serializer.serialize(
            doc_db.template.documentstyle_set.all(),
            use_natural_foreign_keys=True,
            fields=["title", "slug", "contents", "documentstylefile_set"],
        )
        document_templates = {}
        for obj in DocumentTemplate.objects.filter(
            Q(user=self.user) | Q(user=None)
        ).order_by(F("user").desc(nulls_first=True)):
            document_templates[obj.import_id] = {
                "title": obj.title,
                "id": obj.id,
            }

        response["styles"] = {
            "export_templates": [obj["fields"] for obj in export_temps],
            "document_styles": [obj["fields"] for obj in document_styles],
            "document_templates": document_templates,
        }
        self.send_message(response)

    def unfixable(self):
        self.send_document()

    def send_document(self, messages=False, template=False):
        response = dict()
        response["type"] = "doc_data"
        doc_owner = self.session["doc"].owner
        response["doc_info"] = {
            "id": self.session["doc"].id,
            "is_owner": self.user_info.is_owner,
            "access_rights": self.user_info.access_rights,
            "path": self.user_info.path,
            "owner": {
                "id": doc_owner.id,
                "name": doc_owner.readable_name,
                "username": doc_owner.username,
                "avatar": doc_owner.avatar_url,
                "contacts": [],
            },
        }
        response["doc"] = {
            "v": self.session["doc"].version,
            "content": self.session["doc"].content,
            "bibliography": self.session["doc"].bibliography,
            "images": {},
        }
        if template:
            response["doc"]["template"] = {
                "id": self.session["doc"].template.id,
                "content": self.session["doc"].template.content,
            }
        if messages:
            response["m"] = messages
        response["time"] = int(time()) * 1000
        for dimage in DocumentImage.objects.filter(
            document_id=self.session["doc"].id
        ):
            image = dimage.image
            field_obj = {
                "id": image.id,
                "title": dimage.title,
                "copyright": dimage.copyright,
                "image": image.image.url,
                "file_type": image.file_type,
                "added": mktime(image.added.timetuple()) * 1000,
                "checksum": image.checksum,
                "cats": [],
            }
            if image.thumbnail:
                field_obj["thumbnail"] = image.thumbnail.url
                field_obj["height"] = image.height
                field_obj["width"] = image.width
            response["doc"]["images"][image.id] = field_obj
        if self.user_info.access_rights == "read-without-comments":
            response["doc"]["comments"] = []
        elif self.user_info.access_rights in ["review", "review-tracked"]:
            # Reviewer should only get his/her own comments
            filtered_comments = {}
            for key, value in list(self.session["doc"].comments.items()):
                if value["user"] == self.user_info.user.id:
                    filtered_comments[key] = value
            response["doc"]["comments"] = filtered_comments
        else:
            response["doc"]["comments"] = self.session["doc"].comments
        for contact in doc_owner.contacts.all():
            contact_object = {
                "id": contact.id,
                "name": contact.readable_name,
                "username": contact.get_username(),
                "avatar": contact.avatar_url,
                "type": "user",
            }
            response["doc_info"]["owner"]["contacts"].append(contact_object)
        if self.user_info.is_owner:
            for contact in doc_owner.invites_by.all():
                contact_object = {
                    "id": contact.id,
                    "name": contact.username,
                    "username": contact.username,
                    "avatar": contact.avatar_url,
                    "type": "userinvite",
                }
                response["doc_info"]["owner"]["contacts"].append(
                    contact_object
                )
        response["doc_info"]["session_id"] = self.id
        self.send_message(response)

    def reject_message(self, message):
        if message["type"] == "diff":
            self.send_message({"type": "reject_diff", "rid": message["rid"]})

    def handle_message(self, message):
        if message["type"] == "subscribe":
            connection_count = 0
            if "connection" in message:
                connection_count = message["connection"]
            self.subscribe_doc(connection_count)
            return
        if self.user_info.document_id not in WebSocket.sessions:
            logger.debug(
                f"Action:Receiving message for closed document. "
                f"URL:{self.endpoint} User:{self.user.id} "
                f"ParticipantID:{self.id}"
            )
            return
        if message["type"] == "get_document":
            self.send_document()
        elif (
            message["type"] == "participant_update" and self.can_communicate()
        ):
            self.handle_participant_update()
        elif message["type"] == "chat" and self.can_communicate():
            self.handle_chat(message)
        elif message["type"] == "check_version":
            self.check_version(message)
        elif message["type"] == "selection_change":
            self.handle_selection_change(message)
        elif message["type"] == "diff" and self.can_update_document():
            self.handle_diff(message)
        elif message["type"] == "path_change":
            self.handle_path_change(message)

    def update_bibliography(self, bibliography_updates):
        for bu in bibliography_updates:
            if "id" not in bu:
                continue
            id = bu["id"]
            if bu["type"] == "update":
                self.session["doc"].bibliography[id] = bu["reference"]
            elif bu["type"] == "delete":
                del self.session["doc"].bibliography[id]

    def update_images(self, image_updates):
        for iu in image_updates:
            if "id" not in iu:
                continue
            id = iu["id"]
            if iu["type"] == "update":
                # Ensure that access rights exist
                if not UserImage.objects.filter(
                    image__id=id, owner=self.user_info.user
                ).exists():
                    continue
                doc_image = DocumentImage.objects.filter(
                    document_id=self.session["doc"].id, image_id=id
                ).first()
                if doc_image:
                    doc_image.title = iu["image"]["title"]
                    doc_image.copyright = iu["image"]["copyright"]
                    doc_image.save()
                else:
                    DocumentImage.objects.create(
                        document_id=self.session["doc"].id,
                        image_id=id,
                        title=iu["image"]["title"],
                        copyright=iu["image"]["copyright"],
                    )
            elif iu["type"] == "delete":
                DocumentImage.objects.filter(
                    document_id=self.session["doc"].id, image_id=id
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
                self.session["doc"].comments[id] = {
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
                del self.session["doc"].comments[id]
            elif cd["type"] == "update":
                self.session["doc"].comments[id]["comment"] = cd["comment"]
                if "isMajor" in cd:
                    self.session["doc"].comments[id]["isMajor"] = cd["isMajor"]
                if "assignedUser" in cd and "assignedUsername" in cd:
                    self.session["doc"].comments[id]["assignedUser"] = cd[
                        "assignedUser"
                    ]
                    self.session["doc"].comments[id]["assignedUsername"] = cd[
                        "assignedUsername"
                    ]
                if "resolved" in cd:
                    self.session["doc"].comments[id]["resolved"] = cd[
                        "resolved"
                    ]
            elif cd["type"] == "add_answer":
                if "answers" not in self.session["doc"].comments[id]:
                    self.session["doc"].comments[id]["answers"] = []
                self.session["doc"].comments[id]["answers"].append(
                    {
                        "id": cd["answerId"],
                        "user": cd["user"],
                        "username": cd["username"],
                        "date": cd["date"],
                        "answer": cd["answer"],
                    }
                )
            elif cd["type"] == "delete_answer":
                answer_id = cd["answerId"]
                for answer in self.session["doc"].comments[id]["answers"]:
                    if answer["id"] == answer_id:
                        self.session["doc"].comments[id]["answers"].remove(
                            answer
                        )
            elif cd["type"] == "update_answer":
                answer_id = cd["answerId"]
                for answer in self.session["doc"].comments[id]["answers"]:
                    if answer["id"] == answer_id:
                        answer["answer"] = cd["answer"]

    def handle_participant_update(self):
        WebSocket.send_participant_list(self.user_info.document_id)

    def handle_chat(self, message):
        chat = {
            "id": str(uuid.uuid4()),
            "body": message["body"],
            "from": self.user_info.user.id,
            "type": "chat",
        }
        WebSocket.send_updates(chat, self.user_info.document_id)

    def handle_selection_change(self, message):
        if (
            self.user_info.document_id in WebSocket.sessions
            and message["v"] == self.session["doc"].version
        ):
            WebSocket.send_updates(
                message,
                self.user_info.document_id,
                self.id,
                self.user_info.user.id,
            )

    def handle_path_change(self, message):
        if (
            self.user_info.document_id in WebSocket.sessions
            and self.user_info.path_object
        ):
            self.user_info.path_object.path = message["path"]
            self.user_info.path_object.save(
                update_fields=[
                    "path",
                ]
            )
            WebSocket.send_updates(
                message,
                self.user_info.document_id,
                self.id,
                self.user_info.user.id,
            )

    # Checks if the diff only contains changes to comments.
    def only_comments(self, message):
        allowed_operations = ["addMark", "removeMark"]
        only_comment = True
        if "ds" in message:  # ds = document steps
            for step in message["ds"]:
                if not (
                    step["stepType"] in allowed_operations
                    and step["mark"]["type"] == "comment"
                ):
                    only_comment = False
        return only_comment

    def handle_diff(self, message):
        pv = message["v"]
        dv = self.session["doc"].version
        logger.debug(
            f"Action:Handling Diff. URL:{self.endpoint} User:{self.user.id} "
            f"ParticipantID:{self.id} Client version:{pv} "
            f"Server version:{dv} Message:{message}"
        )
        if (
            self.user_info.access_rights in COMMENT_ONLY
            and not self.only_comments(message)
        ):
            logger.error(
                f"Action:Received non-comment diff from comment-only "
                f"collaborator.Discarding URL:{self.endpoint} "
                f"User:{self.user.id} ParticipantID:{self.id}"
            )
            return
        if pv == dv:
            if settings.JSONPATCH:
                if "jd" in message:  # jd = json diff
                    backup = False
                    if len(message["jd"]) > 1:
                        # There is more than one patch operation so if the
                        # patch fails, we might already have applied a previous
                        # patch operation. Therefore we take a backup now so
                        # that we can roll back if needed.
                        backup = deepcopy(self.session["doc"].content)
                    try:
                        apply_patch(
                            self.session["doc"].content, message["jd"], True
                        )
                    except (JsonPatchConflict, JsonPointerException):
                        if backup:
                            self.session["doc"].content = backup
                        logger.exception(
                            f"Action:Cannot apply json diff. "
                            f"URL:{self.endpoint} User:{self.user.id} "
                            f"ParticipantID:{self.id}"
                        )
                        logger.error(
                            f"Action:Patch Exception URL:{self.endpoint} "
                            f"User:{self.user.id} ParticipantID:{self.id} "
                            f"Message:{json_encode(message)}"
                        )
                        logger.error(
                            f"Action:Patch Exception URL:{self.endpoint} "
                            f"User:{self.user.id} ParticipantID:{self.id} "
                            f"Document:"
                            f"{json_encode(self.session['doc'].content)}"
                        )
                        self.unfixable()
                        patch_msg = {
                            "type": "patch_error",
                            "user_id": self.user.id,
                        }
                        self.send_message(patch_msg)
                        # Reset collaboration to avoid any data loss issues.
                        self.reset_collaboration(
                            patch_msg, self.user_info.document_id, self.id
                        )
                        return
                    # The json diff is only needed by the python backend which
                    # does not understand the steps. It can therefore be
                    # removed before broadcast to other clients.
                    del message["jd"]
            elif "ds" in message:  # ds = document steps
                updated_node = prosemirror.apply(
                    message["ds"], self.session["node"]
                )
                if updated_node:
                    self.session["node"] = updated_node
                else:
                    self.unfixable()
                    patch_msg = {
                        "type": "patch_error",
                        "user_id": self.user.id,
                    }
                    self.send_message(patch_msg)
                    # Reset collaboration to avoid any data loss issues.
                    self.reset_collaboration(
                        patch_msg, self.user_info.document_id, self.id
                    )
                    return
                self.session["doc"].content = prosemirror.to_mini_json(
                    self.session["node"].first_child
                )
            self.session["doc"].diffs.append(message)
            self.session["doc"].diffs = self.session["doc"].diffs[
                -self.history_length :
            ]
            self.session["doc"].version += 1
            if "ti" in message:  # ti = title
                self.session["doc"].title = message["ti"][-255:]
            if "cu" in message:  # cu = comment updates
                self.update_comments(message["cu"])
            if "bu" in message:  # bu = bibliography updates
                self.update_bibliography(message["bu"])
            if "iu" in message:  # iu = image updates
                self.update_images(message["iu"])
            if self.session["doc"].version % settings.DOC_SAVE_INTERVAL == 0:
                WebSocket.save_document(self.user_info.document_id)
            self.confirm_diff(message["rid"])
            WebSocket.send_updates(
                message,
                self.user_info.document_id,
                self.id,
                self.user_info.user.id,
            )
        elif pv < dv:
            if pv + len(self.session["doc"].diffs) >= dv:
                # We have enough diffs stored to fix it.
                number_diffs = pv - dv
                logger.debug(
                    f"Action:Resending document diffs. URL:{self.endpoint} "
                    f"User:{self.user.id} ParticipantID:{self.id} "
                    f"number of messages to be resent:{number_diffs}"
                )
                messages = self.session["doc"].diffs[number_diffs:]
                for message in messages:
                    new_message = message.copy()
                    new_message["server_fix"] = True
                    self.send_message(new_message)
            else:
                logger.debug(
                    f"Action:User is on a very old version of the document. "
                    f"URL:{self.endpoint} User:{self.user.id} "
                    f"ParticipantID:{self.id}"
                )
                # Client has a version that is too old to be fixed
                self.unfixable()
                return
        else:
            # Client has a higher version than server. Something is fishy!
            logger.debug(
                f"Action:User has higher document version than server.Fishy! "
                f"URL:{self.endpoint} User:{self.user.id} "
                f"ParticipantID:{self.id}"
            )

    def check_version(self, message):
        pv = message["v"]
        dv = self.session["doc"].version
        logger.debug(
            f"Action:Checking version of document. URL:{self.endpoint} "
            f"User:{self.user.id} ParticipantID:{self.id} "
            f"Client document version:{pv} Server document version:{dv}"
        )
        if pv == dv:
            response = {
                "type": "confirm_version",
                "v": pv,
            }
            self.send_message(response)
            return
        elif pv + len(self.session["doc"].diffs) >= dv:
            number_diffs = pv - dv
            logger.debug(
                f"Action:Resending document diffs. URL:{self.endpoint} "
                f"User:{self.user.id} ParticipantID:{self.id}"
                f"number of messages to be resent:{number_diffs}"
            )
            messages = self.session["doc"].diffs[number_diffs:]
            self.send_document(messages)
            return
        else:
            logger.debug(
                f"Action:User is on a very old version of the document. "
                f"URL:{self.endpoint} User:{self.user.id} "
                f"ParticipantID:{self.id}"
            )
            # Client has a version that is too old
            self.unfixable()
            return

    def can_update_document(self):
        return self.user_info.access_rights in CAN_UPDATE_DOCUMENT

    def can_communicate(self):
        return self.user_info.access_rights in CAN_COMMUNICATE

    def on_close(self):
        logger.debug(
            f"Action:Closing websocket. URL:{self.endpoint} "
            f"User:{self.user.id} ParticipantID:{self.id}"
        )
        if (
            hasattr(self, "session")
            and hasattr(self, "user_info")
            and hasattr(self.user_info, "document_id")
            and self.user_info.document_id in WebSocket.sessions
            and hasattr(self, "id")
            and self.id
            in WebSocket.sessions[self.user_info.document_id]["participants"]
        ):
            del self.session["participants"][self.id]
            if len(self.session["participants"]) == 0:
                WebSocket.save_document(self.user_info.document_id)
                del WebSocket.sessions[self.user_info.document_id]
                logger.debug(
                    f"Action:No participants for the document. "
                    f"URL:{self.endpoint} User:{self.user.id}"
                )
            else:
                WebSocket.send_participant_list(self.user_info.document_id)

    @classmethod
    def send_participant_list(cls, document_id):
        if document_id in WebSocket.sessions:
            participant_list = []
            for session_id, waiter in list(
                cls.sessions[document_id]["participants"].items()
            ):
                access_rights = waiter.user_info.access_rights
                if access_rights not in CAN_COMMUNICATE:
                    continue
                participant_list.append(
                    {
                        "session_id": session_id,
                        "id": waiter.user_info.user.id,
                        "name": waiter.user_info.user.readable_name,
                        "avatar": waiter.user_info.user.avatar_url,
                    }
                )
            message = {
                "participant_list": participant_list,
                "type": "connections",
            }
            WebSocket.send_updates(message, document_id)

    @classmethod
    def reset_collaboration(cls, patch_exception_msg, document_id, sender_id):
        logger.debug(
            f"Action:Resetting collaboration. DocumentID:{document_id} "
            f"Patch conflict triggered. ParticipantID:{sender_id} "
            f"waiters:{len(cls.sessions[document_id]['participants'])}"
        )
        for waiter in list(cls.sessions[document_id]["participants"].values()):
            if waiter.id != sender_id:
                waiter.unfixable()
                waiter.send_message(patch_exception_msg)

    @classmethod
    def send_updates(cls, message, document_id, sender_id=None, user_id=None):
        logger.debug(
            f"Action:Sending message to waiters. DocumentID:{document_id} "
            f"waiters:{len(cls.sessions[document_id]['participants'])}"
        )
        for waiter in list(cls.sessions[document_id]["participants"].values()):
            if waiter.id != sender_id:
                access_rights = waiter.user_info.access_rights
                if "comments" in message and len(message["comments"]) > 0:
                    # Filter comments if needed
                    if access_rights == "read-without-comments":
                        # The reader should not receive the comments update, so
                        # we remove the comments from the copy of the message
                        # sent to the reviewer. We still need to send the rest
                        # of the message as it may contain other diff
                        # information.
                        message = deepcopy(message)
                        message["comments"] = []
                    elif (
                        access_rights in ["review", "review-tracked"]
                        and user_id != waiter.user_info.user.id
                    ):
                        # The reviewer should not receive comments updates from
                        # others than themselves, so we remove the comments
                        # from the copy of the message sent to the reviewer
                        # that are not from them. We still need to send the
                        # rest of the message as it may contain other diff
                        # information.
                        message = deepcopy(message)
                        message["comments"] = []
                elif (
                    message["type"] in ["chat", "connections"]
                    and access_rights not in CAN_COMMUNICATE
                ):
                    continue
                elif (
                    message["type"] == "selection_change"
                    and access_rights not in CAN_COMMUNICATE
                    and user_id != waiter.user_info.user.id
                ):
                    continue
                elif (
                    message["type"] == "path_change"
                    and user_id != waiter.user_info.user.id
                ):
                    continue
                waiter.send_message(message)

    @classmethod
    def save_document(cls, document_id):
        session = cls.sessions[document_id]
        if session["doc"].version == session["last_saved_version"]:
            return
        logger.debug(
            f"Action:Saving document to DB. DocumentID:{session['doc'].id} "
            f"Doc version:{session['doc'].version}"
        )
        try:
            # this try block is to avoid a db exception
            # in case the doc has been deleted from the db
            # in fiduswriter the owner of a doc could delete a doc
            # while an invited writer is editing the same doc
            session["doc"].save(
                update_fields=[
                    "title",
                    "version",
                    "content",
                    "diffs",
                    "comments",
                    "bibliography",
                    "updated",
                ]
            )

        except DatabaseError as e:
            expected_msg = "Save with update_fields did not affect any rows."
            if str(e) == expected_msg:
                cls.__insert_document(doc=session["doc"])
            else:
                raise e
        session["last_saved_version"] = session["doc"].version

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
                "plugin test error when we try to save a doc already deleted "
                "along with the rest of db data so it "
                "raises an Integrity error: {}".format(e)
            ) from None

    @classmethod
    def save_all_docs(cls):
        for document_id in cls.sessions:
            cls.save_document(document_id)


atexit.register(WebSocket.save_all_docs)

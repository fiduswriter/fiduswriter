import autobahn
import base64
import uuid
import atexit
import logging
import gc
import asyncio
import multiprocessing
from copy import deepcopy
from dataclasses import dataclass

from asgiref.sync import sync_to_async
from django.conf import settings

from base.helpers.ws import get_url_base
from document.helpers.session_user_info import SessionUserInfo
from django.conf import settings as _pm_settings

if getattr(_pm_settings, "PROSEMIRROR_BACKEND", "rust") == "rust":
    from document import prosemirror_rs as prosemirror
else:
    from document import prosemirror
from document.helpers import document_store

from base.base_consumer import BaseWebsocketConsumer, GuestUser, TokenUser
from document.models import (
    COMMENT_ONLY,
    CAN_UPDATE_DOCUMENT,
    CAN_COMMUNICATE,
    FW_DOCUMENT_VERSION,
    AccessRight,
)
from document.helpers.token_access import (
    get_token_access,
    guest_participant_id,
)
from document.helpers.e2ee_guards import (
    ae2ee_write_guard,
    E2EE_MIN_ITERATIONS,
    validate_e2ee_params,
)
from document.helpers.comment_filter import sanitize_diff_message
from user.helpers import Avatars

# Rights that may only touch their own comments.
OWN_COMMENTS_ONLY_RIGHTS = ("review", "review-tracked")

logger = logging.getLogger(__name__)


@dataclass
class SessionParticipantSnapshot:
    id: int
    messages: dict


class WebsocketConsumer(BaseWebsocketConsumer):
    sessions = dict()
    runtime_sessions = dict()
    snapshot_sessions = dict()
    snapshot_manager = None
    history_length = 1000  # Only keep the last 1000 diffs

    @classmethod
    def get_session(cls, document_id):
        return cls.runtime_sessions.get(document_id)

    @classmethod
    def set_session(cls, document_id, session):
        cls.runtime_sessions[document_id] = session
        cls.sync_session_snapshot(document_id)

    @classmethod
    def remove_session(cls, document_id):
        cls.runtime_sessions.pop(document_id, None)
        cls.snapshot_sessions.pop(document_id, None)
        try:
            cls.sessions.pop(document_id, None)
        except (AttributeError, FileNotFoundError):
            pass

    @classmethod
    def sync_session_snapshot(cls, document_id):
        session = cls.get_session(document_id)
        if not session:
            cls.remove_session(document_id)
            return
        manager = getattr(cls.sessions, "_manager", None)
        if not manager and not isinstance(cls.sessions, dict):
            if cls.snapshot_manager is None:
                cls.snapshot_manager = multiprocessing.Manager()
            manager = cls.snapshot_manager
        if manager:
            snapshot = cls.snapshot_sessions.get(document_id)
            if not snapshot:
                snapshot = {"participants": manager.dict()}
                cls.snapshot_sessions[document_id] = snapshot
            participants = snapshot["participants"]
            active_ids = set(session["participants"])
            for session_id in list(participants.keys()):
                if session_id not in active_ids:
                    participants.pop(session_id, None)
            for session_id, waiter in session["participants"].items():
                if session_id not in participants:
                    participants[session_id] = manager.Namespace()
                participant = participants[session_id]
                last_ten = manager.list()
                for item in waiter.messages["last_ten"]:
                    last_ten.append(deepcopy(item))
                participant.id = waiter.id
                participant.messages = manager.dict(
                    {
                        "server": waiter.messages["server"],
                        "client": waiter.messages["client"],
                        "last_ten": last_ten,
                    }
                )
            cls.sessions[document_id] = snapshot
            return
        try:
            cls.sessions[document_id] = {
                "participants": {
                    session_id: SessionParticipantSnapshot(
                        id=waiter.id, messages=deepcopy(waiter.messages)
                    )
                    for session_id, waiter in session["participants"].items()
                }
            }
        except (TypeError, FileNotFoundError):
            pass

    async def send_message(self, message):
        await super().send_message(message)
        if hasattr(self, "document_id"):
            self.sync_session_snapshot(self.document_id)

    async def connect(self):
        self.document_id = int(
            self.scope["url_route"]["kwargs"]["document_id"]
        )
        redirected = await self.check_server()
        if redirected:
            return
        connected = await super().connect()
        if not connected:
            return
        logger.debug(
            f"Action:Document socket opened by user. "
            f"URL:{self.endpoint} User:{self.user.id} ParticipantID:{self.id}"
        )

    async def check_server(self):
        # The correct server for the document may have changed since the client
        # received its initial connection information. For example, because the
        # number of servers has increased (all servers need to restart to have
        # the right setting).
        if len(settings.PORTS) < 2:
            return False
        server = self.scope.get("server")
        if not server or len(server) < 2:
            # Granian (and some other ASGI servers) may not populate
            # scope["server"] for WebSocket connections. Without a known
            # actual port we cannot verify routing, so assume correct.
            return False
        try:
            actual_port = int(server[1])
        except (ValueError, TypeError):
            logger.warning(
                f"Could not determine actual port from scope['server']: {server}"
            )
            return False
        expected_conn = settings.PORTS[self.document_id % len(settings.PORTS)]
        try:
            expected_port = int(
                expected_conn["internal"]
                if isinstance(expected_conn, dict)
                else expected_conn
            )
        except (ValueError, TypeError):
            logger.warning(
                f"Could not determine expected port from PORTS: {expected_conn}"
            )
            return False
        if actual_port != expected_port:
            # Redirect to the correct URL
            await self.init()
            origin = (
                dict(self.scope["headers"]).get(b"origin", b"").decode("utf-8")
            )
            expected = get_url_base(origin, expected_conn)
            logger.debug(f"Redirecting from {actual_port} to {expected}.")
            await self.send_message({"type": "redirect", "base": expected})
            await self.do_close()
            return True
        return False

    async def _resolve_guest_user(self, token_str):
        """
        Validate a share token and return a GuestUser if valid.
        This overrides the base class method to provide document-specific token validation.
        """
        document, rights = await sync_to_async(get_token_access)(token_str)
        if document and document.id == self.document_id:
            # The participant id must not be the secret token
            # itself. Guests are identified by a non-secret derived id;
            # the token is kept separately for authorization only.
            return GuestUser(
                id=guest_participant_id(token_str, self.document_id),
                token=str(token_str),
                token_rights=rights,
            )
        return None

    async def _resolve_token_user(self, user, token_str):
        """
        Validate a share token for a logged-in user and return a TokenUser if valid.
        The user retains their real identity but also has token-based access rights.
        """
        document, rights = await sync_to_async(get_token_access)(token_str)
        if document and document.id == self.document_id:
            return TokenUser(
                user=user, token=str(token_str), token_rights=rights
            )
        return None

    async def confirm_diff(self, rid):
        response = {"type": "confirm_diff", "rid": rid}
        await self.send_message(response)

    async def subscribe(self, connection_count=0, client_version=None):
        # Create a new instance
        self.user_info = SessionUserInfo(self.user)

        # Initialize access asynchronously
        doc_db, can_access = await self.user_info.init_access(self.document_id)

        if not can_access or float(doc_db.doc_version) != FW_DOCUMENT_VERSION:
            await self.access_denied()
            return

        existing_session = WebsocketConsumer.get_session(doc_db.id)
        if existing_session and len(existing_session["participants"]) > 0:
            logger.debug(
                f"Action:Serving already opened document. "
                f"URL:{self.endpoint} User:{self.user.id} "
                f" ParticipantID:{self.id}"
            )
            self.session = existing_session
            self.id = max(self.session["participants"]) + 1
            self.session["participants"][self.id] = self
            WebsocketConsumer.sync_session_snapshot(doc_db.id)
            if isinstance(self.user, GuestUser):
                self.user.readable_name = f"Guest {self.id}"
        else:
            logger.debug(
                f"Action:Opening document from DB. "
                f"URL:{self.endpoint} User:{self.user.id} "
                f" ParticipantID:{self.id}"
            )
            self.id = 0
            # Initialize document content from template if empty.
            await document_store.initialize_document_content(doc_db)
            if doc_db.e2ee:
                # For E2EE documents, we cannot create a prosemirror
                # node from the content. The client will decrypt and
                # handle the content locally.
                self.session = {
                    "doc": doc_db,
                    "node": None,
                    "node_updates": False,
                    "participants": {0: self},
                    "last_saved_version": doc_db.version,
                }
            else:
                node = prosemirror.from_json(doc_db.content)
                self.session = {
                    "doc": doc_db,
                    "node": node,
                    "node_updates": False,
                    "participants": {0: self},
                    "last_saved_version": doc_db.version,
                }
            WebsocketConsumer.set_session(doc_db.id, self.session)
            if isinstance(self.user, GuestUser):
                self.user.readable_name = f"Guest {self.id}"
        logger.debug(
            f"Action:Participant ID Assigned. URL:{self.endpoint} "
            f"User:{self.user.id} ParticipantID:{self.id}"
        )
        await self.join_document_group()
        await self.send_message({"type": "subscribed"})
        if connection_count < 1:
            # Send session_id so the client knows its participant ID
            session_info_msg = {
                "type": "session_info",
                "session_id": self.id,
                "access_right": self.user_info.access_rights,
            }
            if isinstance(self.user, GuestUser):
                # Tell the guest its non-secret participant id
                # so the client uses it for comments/chat instead of the
                # secret share token.
                session_info_msg["guest_id"] = self.user.id
            if doc_db.e2ee:

                session_info_msg["e2ee"] = True
                session_info_msg["e2ee_salt"] = (
                    base64.b64encode(doc_db.e2ee_salt).decode("ascii")
                    if doc_db.e2ee_salt
                    else None
                )
                session_info_msg["e2ee_iterations"] = doc_db.e2ee_iterations
            await self.send_message(session_info_msg)
            # Reconcile version: send missing diffs if client is behind
            await self.check_version(client_version)
        else:
            # Reconnecting user — send access rights for comparison
            reconnect_msg = {
                "type": "access_right",
                "access_right": self.user_info.access_rights,
            }
            if isinstance(self.user, GuestUser):
                reconnect_msg["guest_id"] = self.user.id
            await self.send_message(reconnect_msg)
        if await self.can_communicate():
            await self.handle_participant_update()

    async def unfixable(self):
        await WebsocketConsumer.save_document_async(self.user_info.document_id)
        await self.send_message({"type": "refetch_doc"})

    async def check_version(self, client_version, offline=False):
        """Reconcile the client's document version with the server's.

        Called on subscribe (with the version from the subscribe message) and
        when the client sends a check_version message. If the client is
        behind, sends the missing diffs. If too many diffs are missing,
        asks the client to re-fetch via REST.
        """
        server_version = self.session["doc"].version

        logger.debug(
            f"Action:Reconcile version. URL:{self.endpoint} "
            f"User:{self.user.id} ParticipantID:{self.id} "
            f"Client version:{client_version} Server version:{server_version}"
        )

        if client_version == server_version:
            # Client is up to date — nothing to send
            await self.send_message(
                {
                    "type": "confirm_version",
                    "v": server_version,
                }
            )
            return

        if client_version < server_version and not offline:
            diffs_behind = server_version - client_version
            if (
                client_version + len(self.session["doc"].diffs)
                >= server_version
            ):
                # We have enough diffs to catch the client up
                logger.debug(
                    f"Action:Sending {diffs_behind} diffs to catch client up. "
                    f"URL:{self.endpoint} User:{self.user.id} "
                    f"ParticipantID:{self.id}"
                )
                messages = self.session["doc"].diffs[-diffs_behind:]
                for msg in messages:
                    new_message = msg.copy()
                    new_message["server_fix"] = True
                    new_message = sanitize_diff_message(
                        new_message,
                        self.user_info.access_rights,
                        self.user_info.user.id,
                        self.session["doc"].comments,
                    )
                    await self.send_message(new_message)
                await self.send_message(
                    {
                        "type": "confirm_version",
                        "v": server_version,
                    }
                )
            else:
                logger.debug(
                    f"Action:Client too far behind ({diffs_behind} diffs, "
                    f"only {len(self.session['doc'].diffs)} stored). "
                    f"URL:{self.endpoint} User:{self.user.id} "
                    f"ParticipantID:{self.id}"
                )
                # Too many diffs — client needs a full document reset
                await self.unfixable()
            return

        # client_version > server_version should not happen
        logger.debug(
            f"Action:Client version ahead of server. "
            f"URL:{self.endpoint} User:{self.user.id} "
            f"ParticipantID:{self.id}"
        )
        await self.unfixable()

    async def reject_message(self, message):
        if message["type"] == "diff":
            await self.send_message(
                {"type": "reject_diff", "rid": message["rid"]}
            )

    DOCUMENT_GROUP_PREFIX = "document_"

    async def _document_group(self):
        return f"{self.DOCUMENT_GROUP_PREFIX}{self.user_info.document_id}"

    async def _channel_layer(self):
        layer = getattr(self, "channel_layer", None)
        if layer is None:
            from channels.layers import get_channel_layer

            layer = get_channel_layer()
        return layer

    async def join_document_group(self):
        try:
            layer = await self._channel_layer()
            if layer is None:
                return
            await layer.group_add(
                await self._document_group(), self.channel_name
            )
        except Exception:
            pass

    async def leave_document_group(self):
        try:
            layer = await self._channel_layer()
            if layer is None:
                return
            await layer.group_discard(
                await self._document_group(), self.channel_name
            )
        except Exception:
            pass

    async def access_changed(self, event=None):
        """re-resolve authorization when access rights or share
        tokens changed (triggered by group message from views) and close
        the connection if it no longer authorizes."""
        if not hasattr(self, "user_info"):
            return
        still_ok = await self.refresh_authorization()
        if not still_ok:
            await self.access_denied()

    async def refresh_authorization(self):
        """Re-read current rights from the database. Returns False when
        access was revoked."""
        if not hasattr(self, "user_info"):
            return False
        user = self.user
        document_id = self.user_info.document_id
        if isinstance(user, GuestUser):
            doc, rights = await sync_to_async(get_token_access)(user.token)
            if not doc or doc.id != document_id:
                return False
            self.user_info.access_rights = rights
            user.token_rights = rights
            return True
        if not user.is_authenticated:
            return False
        token_rights = None
        if isinstance(user, TokenUser):
            doc, token_rights = await sync_to_async(get_token_access)(
                user.token
            )
            if not doc or doc.id != document_id:
                # Token revoked; fall back to direct rights below if any.
                token_rights = None
        if getattr(self.user_info, "is_owner", False):
            return True
        access_right = await AccessRight.objects.filter(
            document_id=document_id, user=user
        ).afirst()
        if not access_right:
            # Direct access revoked. If the session came in via a share
            # token, the token check above already closed the connection
            # when the token was also revoked.
            if token_rights is None:
                return False
            self.user_info.access_rights = token_rights
            return True
        rights = access_right.rights
        if token_rights:
            order = [
                "write",
                "write-tracked",
                "comment",
                "review-tracked",
                "review",
                "read",
                "read-without-comments",
            ]
            if order.index(token_rights) < order.index(rights):
                rights = token_rights
        self.user_info.access_rights = rights
        self.user_info.path_object = access_right
        self.user_info.path = access_right.path
        return True

    async def handle_message(self, message):
        if not WebsocketConsumer.get_session(self.user_info.document_id):
            logger.debug(
                f"Action:Receiving message for closed document. "
                f"URL:{self.endpoint} User:{self.user.id} "
                f"ParticipantID:{self.id}"
            )
            return
        mutating_types = (
            "diff",
            "chat",
            "e2ee_snapshot",
            "e2ee_rekey",
            "participant_update",
            "path_change",
        )
        if message["type"] in mutating_types:
            # never act on stale rights. Re-resolve current
            # authorization before processing a mutating frame.
            if not await self.refresh_authorization():
                logger.debug(
                    f"Action:Authorization revoked during session. "
                    f"URL:{self.endpoint} User:{self.user.id} "
                    f"ParticipantID:{self.id}"
                )
                await self.access_denied()
                return
        if (
            message["type"] == "participant_update"
            and await self.can_communicate()
        ):
            await self.handle_participant_update()
        elif message["type"] == "chat" and await self.can_communicate():
            await self.handle_chat(message)
        elif message["type"] == "check_version":
            await self.check_version(
                message["v"], message.get("offline", False)
            )
        elif message["type"] == "selection_change":
            await self.handle_selection_change(message)
        elif message["type"] == "diff" and await self.can_update_document():
            await self.handle_diff(message)
        elif message["type"] == "path_change":
            await self.handle_path_change(message)
        elif message["type"] == "e2ee_snapshot":
            await self.handle_e2ee_snapshot(message)
        elif message["type"] == "e2ee_rekey":
            await self.handle_e2ee_rekey(message)

    async def update_bibliography(self, bibliography_updates):
        for bu in bibliography_updates:
            if "id" not in bu:
                continue
            id = bu["id"]
            if bu["type"] == "update":
                self.session["doc"].bibliography[id] = bu["reference"]
            elif bu["type"] == "delete":
                del self.session["doc"].bibliography[id]

    async def update_images(self, image_updates):
        await document_store.update_document_images(
            self.session["doc"].id,
            image_updates,
            self.user_info.user,
            doc_e2ee=self.session["doc"].e2ee,
        )

    async def update_comments(self, comments_updates):
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

    async def handle_participant_update(self):
        await WebsocketConsumer.send_participant_list(
            self.user_info.document_id
        )

    async def handle_chat(self, message):
        # in E2EE rooms chat must arrive encrypted. Fail
        # closed: never relay a plaintext chat body.
        session = WebsocketConsumer.get_session(self.user_info.document_id)
        if (
            session
            and session["doc"].e2ee
            and (
                not message.get("e2ee")
                or not isinstance(message.get("body"), str)
            )
        ):
            logger.debug(
                f"Action:Plaintext chat in E2EE room dropped (fail-closed)."
                f" URL:{self.endpoint} User:{self.user.id}"
                f" ParticipantID:{self.id}"
            )
            await self.send_message(
                {"type": "chat_rejected", "reason": "e2ee-mode"}
            )
            return
        chat = {
            "id": str(uuid.uuid4()),
            "body": message["body"],
            "from": self.user_info.user.id,
            "type": "chat",
        }
        # Pass through the e2ee flag for encrypted chat messages.
        # The server does not read the message body — it just relays
        # the encrypted blob to other clients.
        if message.get("e2ee"):
            chat["e2ee"] = True
        await WebsocketConsumer.send_updates(chat, self.user_info.document_id)

    async def handle_selection_change(self, message):
        if (
            WebsocketConsumer.get_session(self.user_info.document_id)
            and message["v"] == self.session["doc"].version
        ):
            await WebsocketConsumer.send_updates(
                message,
                self.user_info.document_id,
                self.id,
                self.user_info.user.id,
            )

    async def handle_path_change(self, message):
        if (
            WebsocketConsumer.get_session(self.user_info.document_id)
            and self.user_info.path_object
            and await ae2ee_write_guard(self.session["doc"])
        ):
            await document_store.save_path_object(
                self.user_info.path_object, message["path"]
            )
            await WebsocketConsumer.send_updates(
                message,
                self.user_info.document_id,
                self.id,
                self.user_info.user.id,
            )

    # Checks if the diff only contains changes to comments.
    # title/bibliography/image updates are sidecar changes to
    # the document and are never comment-only. For non-E2EE documents a
    # diff without document steps is not comment-only either.
    def only_comments(self, message, e2ee=False):
        allowed_operations = ["addMark", "removeMark"]
        if "ti" in message or "bu" in message or "iu" in message:
            return False
        if e2ee:
            return True
        if "ds" not in message:
            return False
        for step in message["ds"]:
            if not (
                step.get("stepType") in allowed_operations
                and step.get("mark", {}).get("type") == "comment"
            ):
                return False
        return True

    def can_manage_comment(self, comment_id):
        """review roles may only modify comments that belong
        to themselves."""
        my_id = str(self.user_info.user.id)
        entry = self.session["doc"].comments.get(comment_id)
        if entry is None:
            return True
        return str(entry.get("user")) == my_id

    def owns_comment_updates(self, comment_updates):
        """all comment update operations must reference only
        the caller's own user id (top level and answers)."""
        my_id = str(self.user_info.user.id)
        for entry in comment_updates:
            if not isinstance(entry, dict):
                return False
            if entry.get("type") == "delete":
                if not self.can_manage_comment(entry.get("id")):
                    return False
                continue
            if str(entry.get("user")) != my_id:
                return False
            for answer in entry.get("answers", []):
                if str(answer.get("user")) != my_id:
                    return False
        return True

    async def handle_diff(self, message):
        pv = message["v"]
        dv = self.session["doc"].version
        logger.debug(
            f"Action:Handling Diff. URL:{self.endpoint} User:{self.user.id} "
            f"ParticipantID:{self.id} Client version:{pv} "
            f"Server version:{dv}"
        )
        # in "required" mode legacy (non-E2EE) documents are
        # read-only for every mutation path.
        if not await ae2ee_write_guard(self.session["doc"]):
            logger.debug(
                f"Action:Diff on legacy document in required mode rejected."
                f" URL:{self.endpoint} User:{self.user.id}"
                f" ParticipantID:{self.id}"
            )
            return
        if (
            self.user_info.access_rights in COMMENT_ONLY
            and not self.only_comments(message, bool(self.session["doc"].e2ee))
        ):
            # Note: For E2EE documents, the diff content is encrypted
            # (has "ep" field instead of "ds"), so only_comments() will
            # return True (no plaintext steps to check). Access rights
            # enforcement for E2EE documents is handled client-side,
            # since the server cannot read the encrypted diff content.
            logger.error(
                f"Action:Received non-comment diff from comment-only "
                f"collaborator.Discarding URL:{self.endpoint} "
                f"User:{self.user.id} ParticipantID:{self.id}"
            )
            return
        if (
            self.user_info.access_rights in OWN_COMMENTS_ONLY_RIGHTS
            and "cu" in message
            and not self.owns_comment_updates(message["cu"])
        ):
            # review roles may only manage their own comments.
            logger.error(
                f"Action:Received foreign comment update from review "
                f"collaborator. Discarding URL:{self.endpoint} "
                f"User:{self.user.id} ParticipantID:{self.id}"
            )
            return
        if pv == dv:
            if self.session["doc"].e2ee:
                # For E2EE documents, we cannot apply diffs server-side.
                # Instead, we relay the encrypted diff to other clients
                # and store it for catch-up. The diff content is opaque
                # to the server.
                # the salt is mandatory on every E2EE diff
                # and must match the current key epoch; the diff payload
                # must be an encrypted envelope string.
                msg_salt = message.get("e2ee_salt")
                if not isinstance(msg_salt, str):
                    await self.reject_message(message)
                    return
                try:
                    decoded_salt = base64.b64decode(msg_salt, validate=True)
                except Exception:
                    await self.reject_message(message)
                    return
                if (
                    len(decoded_salt) != len(self.session["doc"].e2ee_salt)
                    or decoded_salt != self.session["doc"].e2ee_salt
                ):
                    await self.reject_message(message)
                    return
                if not isinstance(message.get("ep"), str):
                    await self.reject_message(message)
                    return
                self.session["doc"].diffs.append(message)
                self.session["doc"].diffs = self.session["doc"].diffs[
                    -self.history_length :
                ]
                self.session["doc"].version += 1
                # Check if we should request a snapshot from a client
                if (
                    self.session["doc"].version % settings.DOC_SAVE_INTERVAL
                    == 0
                ):
                    await self.request_snapshot()
                if "rid" in message:
                    await self.confirm_diff(message["rid"])
                await WebsocketConsumer.send_updates(
                    message,
                    self.user_info.document_id,
                    self.id,
                    self.user_info.user.id,
                )
            else:
                # Original unencrypted diff handling
                if "ds" in message:  # ds = document steps
                    try:
                        updated_node = prosemirror.apply(
                            message["ds"], self.session["node"]
                        )
                    except Exception as exc:
                        # A malformed step must not tear down the whole
                        # session; treat it like an unapplyable diff.
                        logger.warning(
                            f"Action:Diff steps raised an error: {exc}"
                        )
                        updated_node = None
                    if updated_node:
                        self.session["node"] = updated_node
                        self.session["node_updates"] = True
                    else:
                        await self.unfixable()
                        patch_msg = {
                            "type": "patch_error",
                            "user_id": self.user.id,
                        }
                        await self.send_message(patch_msg)
                        # Reset collaboration to avoid any data loss issues.
                        await self.reset_collaboration(
                            patch_msg, self.user_info.document_id, self.id
                        )
                        return
                self.session["doc"].diffs.append(message)
                self.session["doc"].diffs = self.session["doc"].diffs[
                    -self.history_length :
                ]
                self.session["doc"].version += 1
                if "ti" in message:  # ti = title
                    await document_store.save_document_title(
                        self.session["doc"], message["ti"]
                    )
                if "cu" in message:  # cu = comment updates
                    await self.update_comments(message["cu"])
                if "bu" in message:  # bu = bibliography updates
                    await self.update_bibliography(message["bu"])
                if "iu" in message:  # iu = image updates
                    await self.update_images(message["iu"])
                if (
                    self.session["doc"].version % settings.DOC_SAVE_INTERVAL
                    == 0
                ):
                    await WebsocketConsumer.save_document_async(
                        self.user_info.document_id
                    )
                await self.confirm_diff(message["rid"])
                await WebsocketConsumer.send_updates(
                    message,
                    self.user_info.document_id,
                    self.id,
                    self.user_info.user.id,
                )
        elif pv < dv:
            if pv + len(self.session["doc"].diffs) >= dv:
                # We have enough diffs stored to fix it.
                number_diffs = dv - pv
                logger.debug(
                    f"Action:Resending document diffs. URL:{self.endpoint} "
                    f"User:{self.user.id} ParticipantID:{self.id} "
                    f"number of messages to be resent:{number_diffs}"
                )
                messages = self.session["doc"].diffs[-number_diffs:]
                for message in messages:
                    new_message = message.copy()
                    new_message["server_fix"] = True
                    new_message = sanitize_diff_message(
                        new_message,
                        self.user_info.access_rights,
                        self.user_info.user.id,
                        self.session["doc"].comments,
                    )
                    await self.send_message(new_message)
            else:
                logger.debug(
                    f"Action:User is on a very old version of the document. "
                    f"URL:{self.endpoint} User:{self.user.id} "
                    f"ParticipantID:{self.id}"
                )
                # Client has a version that is too old to be fixed
                await self.unfixable()
                return
        else:
            # Client has a higher version than server. Something is fishy!
            logger.debug(
                f"Action:User has higher document version than server.Fishy! "
                f"URL:{self.endpoint} User:{self.user.id} "
                f"ParticipantID:{self.id}"
            )
            await self.unfixable()
            return

    async def handle_e2ee_snapshot(self, message):
        """Handle a full encrypted snapshot from a client.

        For E2EE documents, the server cannot process content, so clients
        are responsible for saving encrypted snapshots periodically.
        The server stores the encrypted content as opaque data.
        """
        doc = self.session["doc"]

        # Verify sender has write access
        if self.user_info.access_rights not in ["write"]:
            return

        # Legacy documents are read-only when E2EE is required.
        if not await ae2ee_write_guard(doc):
            return

        # never write snapshot data to a non-E2EE document and
        # never accept the frame while E2EE is disabled.
        if not doc.e2ee or (
            getattr(settings, "E2EE_MODE", "disabled") == "disabled"
        ):
            logger.warning(
                f"Action:e2ee_snapshot rejected for non-E2EE document or "
                f"disabled mode. URL:{self.endpoint} User:{self.user.id}"
                f" ParticipantID:{self.id}"
            )
            return

        # the salt must be present, well formed and match
        # the current epoch. Epoch (salt/iterations) changes only go
        # through the owner-controlled "e2ee_rekey" message.
        try:
            salt, _iterations = validate_e2ee_params(
                message.get("e2ee_salt"),
                doc.e2ee_iterations or E2EE_MIN_ITERATIONS,
            )
        except ValueError:
            await self.reject_message(message)
            return
        if len(salt) != len(doc.e2ee_salt) or salt != doc.e2ee_salt:
            await self.reject_message(message)
            return
        if "e2ee_iterations" in message:
            try:
                new_iterations = int(message["e2ee_iterations"])
            except (TypeError, ValueError):
                await self.reject_message(message)
                return
            if new_iterations != doc.e2ee_iterations:
                # Changing the epoch here would invalidate every stored
                # diff and key envelope.
                await self.reject_message(message)
                return

        # the snapshot must cover exactly the current version.
        snapshot_v = message.get("v")
        if (
            not isinstance(snapshot_v, int)
            or isinstance(snapshot_v, bool)
            or snapshot_v != doc.version
        ):
            await self.reject_message(message)
            return

        # after the document has been initialized, every state
        # field must be a ciphertext string. Plain (template) values are
        # accepted only for the one-time initialization of a brand new
        # E2EE document.
        initial = (
            doc.version == 0
            and doc.e2ee_snapshot_version is None
            and isinstance(doc.content, dict)
        )

        def _field_ok(value):
            if isinstance(value, str):
                return True
            return initial and isinstance(value, (dict, list))

        if "content" not in message or not _field_ok(message["content"]):
            await self.reject_message(message)
            return
        for opt_field in ("comments", "bibliography"):
            if opt_field in message and not _field_ok(message[opt_field]):
                await self.reject_message(message)
                return
        if "title" in message and not _field_ok(message["title"]):
            await self.reject_message(message)
            return

        # Store the encrypted snapshot
        doc.content = message["content"]  # Encrypted, opaque to server
        doc.comments = message.get("comments", {})  # Encrypted
        doc.bibliography = message.get("bibliography", {})  # Encrypted

        # Store the encrypted title if provided (for display in overview).
        # For E2EE documents the title field holds the encrypted ciphertext;
        # the client decrypts it when the key is available.
        if "title" in message:
            doc.title = message["title"]

        # Record the version this snapshot covers.
        doc.e2ee_snapshot_version = snapshot_v

        # Save to database. Force save because the encrypted content may
        # have changed even if the version number hasn't (e.g. initial
        # snapshot for a newly created E2EE document).
        await WebsocketConsumer.save_document_async(
            self.user_info.document_id, force=True
        )

        # Notify other clients of the new snapshot version
        await WebsocketConsumer.send_updates(
            {
                "type": "e2ee_snapshot_received",
                "v": snapshot_v,
            },
            self.user_info.document_id,
            self.id,
            self.user_info.user.id,
        )

    async def handle_e2ee_rekey(self, message):
        """Owner-controlled re-key.

        Changes the PBKDF2 epoch (salt/iterations) of an E2EE document
        only together with a re-encrypted snapshot and fresh wrapped-DEK
        envelopes for every current key holder.
        """
        doc = self.session["doc"]

        if not doc.e2ee or (
            getattr(settings, "E2EE_MODE", "disabled") == "disabled"
        ):
            return
        if not await ae2ee_write_guard(doc):
            return
        if not getattr(self.user_info, "is_owner", False):
            logger.warning(
                f"Action:e2ee_rekey from non-owner rejected. "
                f"URL:{self.endpoint} User:{self.user.id}"
                f" ParticipantID:{self.id}"
            )
            return

        try:
            salt, iterations = validate_e2ee_params(
                message.get("e2ee_salt"), message.get("e2ee_iterations")
            )
        except ValueError:
            await self.reject_message(message)
            return

        # every state field must be ciphertext.
        for field in ("content", "comments", "bibliography"):
            if not isinstance(message.get(field), str):
                await self.reject_message(message)
                return
        if "title" in message and not isinstance(message["title"], str):
            await self.reject_message(message)
            return

        snapshot_v = message.get("v")
        if (
            not isinstance(snapshot_v, int)
            or isinstance(snapshot_v, bool)
            or snapshot_v != doc.version
        ):
            await self.reject_message(message)
            return

        keys = message.get("keys")
        if not isinstance(keys, list) or not keys:
            await self.reject_message(message)
            return
        for entry in keys:
            if (
                not isinstance(entry, dict)
                or not isinstance(entry.get("holder_id"), int)
                or not isinstance(entry.get("encrypted_key"), str)
                or not entry.get("encrypted_key")
                or not isinstance(
                    entry.get("encrypted_with_master_key", False), bool
                )
            ):
                await self.reject_message(message)
                return

        def _apply_rekey():
            from django.db import transaction

            from document.models import DocumentEncryptionKey

            existing_holder_ids = set(
                DocumentEncryptionKey.objects.filter(
                    document_id=doc.id
                ).values_list("holder_id", flat=True)
            )
            new_holder_ids = {e["holder_id"] for e in keys}
            # Every previous holder must receive a replacement envelope.
            if not existing_holder_ids.issubset(new_holder_ids):
                return "holders"
            # Any additional holder must already have access to the doc.
            allowed_ids = set(
                AccessRight.objects.filter(document_id=doc.id).values_list(
                    "holder_id", flat=True
                )
            ) | {doc.owner_id}
            if not new_holder_ids.issubset(allowed_ids):
                return "rights"
            with transaction.atomic():
                doc.e2ee_salt = salt
                doc.e2ee_iterations = iterations
                doc.content = message["content"]
                doc.comments = message["comments"]
                doc.bibliography = message["bibliography"]
                if "title" in message:
                    doc.title = message["title"]
                # Old diffs and the old snapshot are encrypted with the
                # previous epoch and become unusable.
                doc.diffs = []
                doc.e2ee_snapshot_version = snapshot_v
                doc.save()
                for entry in keys:
                    DocumentEncryptionKey.objects.update_or_create(
                        document_id=doc.id,
                        holder_id=entry["holder_id"],
                        defaults={
                            "encrypted_key": entry["encrypted_key"],
                            "encrypted_with_master_key": entry[
                                "encrypted_with_master_key"
                            ],
                        },
                    )
            return "ok"

        try:
            result = await sync_to_async(_apply_rekey, thread_sensitive=True)()
        except Exception:
            logger.exception("Action:e2ee_rekey failed.")
            await self.reject_message(message)
            return
        if result != "ok":
            await self.reject_message(message)
            return

        # Force every other participant to refetch: they must re-derive
        # the key with the new passphrase (via the new envelope).
        for participant in self.session["participants"].values():
            if participant.id != self.id:
                await participant.send_message({"type": "refetch_doc"})
        await self.send_message(
            {
                "type": "e2ee_rekey_done",
                "v": snapshot_v,
                "e2ee_salt": base64.b64encode(salt).decode("ascii"),
                "e2ee_iterations": iterations,
            }
        )

    async def request_snapshot(self):
        """Request a snapshot from a write-capable client.

        For E2EE documents, the server cannot save document content
        because it's encrypted. Instead, the server asks one of the
        write-capable clients to send an encrypted snapshot.
        """
        participants = self.session["participants"]
        for participant_id, participant in participants.items():
            if participant.user_info.access_rights in ["write"]:
                await participant.send_message(
                    {
                        "type": "request_snapshot",
                        "v": self.session["doc"].version,
                    }
                )
                return  # Only ask one client

    async def can_update_document(self):
        return self.user_info.access_rights in CAN_UPDATE_DOCUMENT

    async def can_communicate(self):
        return self.user_info.access_rights in CAN_COMMUNICATE

    async def disconnect(self, code):
        await self.leave_document_group()
        if (
            hasattr(self, "endpoint")
            and hasattr(self, "user")
            and hasattr(self, "id")
        ):
            logger.debug(
                f"Action:Closing websocket. URL:{self.endpoint} "
                f"User:{self.user.id} ParticipantID:{self.id}"
            )
        if (
            hasattr(self, "session")
            and hasattr(self, "user_info")
            and hasattr(self.user_info, "document_id")
        ):
            doc_id = self.user_info.document_id
            if WebsocketConsumer.get_session(doc_id):
                # Clear this participant's specific resources
                if (
                    hasattr(self, "id")
                    and self.id in self.session["participants"]
                ):
                    # Remove this participant
                    self.session["participants"].pop(self.id)
                    WebsocketConsumer.sync_session_snapshot(doc_id)

                # Complete document cleanup if no participants remain
                if len(self.session["participants"]) == 0:
                    # Save before cleanup
                    await WebsocketConsumer.save_document_async(doc_id)

                    # Break references manually before deleting
                    session = WebsocketConsumer.get_session(doc_id)

                    # Clear prosemirror node structure
                    if "node" in session:
                        # Recursively break node references if possible
                        session["node"] = None

                    # Clear diff history completely
                    if "doc" in session and hasattr(session["doc"], "diffs"):
                        session["doc"].diffs = None  # Not just an empty list

                    # Remove complete session
                    WebsocketConsumer.remove_session(doc_id)

                    # Force garbage collection
                    gc.collect()

                else:
                    try:
                        # Update participant list if there are still participants
                        await WebsocketConsumer.send_participant_list(
                            self.user_info.document_id
                        )
                    except autobahn.exception.Disconnected:
                        logger.error(
                            "Error sending participant list over disconnected session"
                        )

            # Clear any remaining references to large objects
            if hasattr(self, "session"):
                self.session = None
            if hasattr(self, "user_info"):
                self.user_info = None
            await self.close()

    @classmethod
    async def send_participant_list(cls, document_id):
        session = cls.get_session(document_id)
        if session:
            avatars = Avatars()
            participant_list = []

            # Create a list of tasks to get avatars
            avatar_tasks = []
            participants_data = []

            for session_id, waiter in list(session["participants"].items()):
                access_rights = waiter.user_info.access_rights
                if access_rights not in CAN_COMMUNICATE:
                    continue
                participants_data.append(
                    {
                        "session_id": session_id,
                        "id": waiter.user_info.user.id,
                        "name": waiter.user_info.user.readable_name,
                        "user": waiter.user_info.user,
                    }
                )
                # Add task to get avatar
                avatar_tasks.append(
                    avatars.get_url_async(waiter.user_info.user)
                )

            # Get all avatars in parallel
            if avatar_tasks:
                avatar_urls = await asyncio.gather(
                    *avatar_tasks, return_exceptions=True
                )
                avatar_urls = [
                    None if isinstance(url, BaseException) else url
                    for url in avatar_urls
                ]

                # Now build the participant list with avatars
                for i, data in enumerate(participants_data):
                    participant_list.append(
                        {
                            "session_id": data["session_id"],
                            "id": data["id"],
                            "name": data["name"],
                            "avatar": avatar_urls[i],
                        }
                    )

            message = {
                "participant_list": participant_list,
                "type": "connections",
            }
            await WebsocketConsumer.send_updates(message, document_id)

    @classmethod
    async def reset_collaboration(
        cls, patch_exception_msg, document_id, sender_id
    ):
        session = cls.get_session(document_id)
        if not session:
            return
        logger.debug(
            f"Action:Resetting collaboration. DocumentID:{document_id} "
            f"Patch conflict triggered. ParticipantID:{sender_id} "
            f"waiters:{len(session['participants'])}"
        )

        # Create a list of coroutines to execute
        tasks = []

        for waiter in list(session["participants"].values()):
            if waiter.id != sender_id:
                tasks.append(waiter.unfixable())
                tasks.append(waiter.send_message(patch_exception_msg))

        # Execute all tasks concurrently
        if tasks:
            await asyncio.gather(*tasks)

    @classmethod
    async def send_updates(
        cls, message, document_id, sender_id=None, user_id=None
    ):
        session = cls.get_session(document_id)
        if not session:
            return
        logger.debug(
            f"Action:Sending message to waiters. DocumentID:{document_id} "
            f"waiters:{len(session['participants'])}"
        )

        # Create a list of send tasks to execute concurrently
        send_tasks = []

        for waiter in list(session["participants"].values()):
            if waiter.id != sender_id:
                access_rights = waiter.user_info.access_rights
                msg_to_send = message

                # Check if we need to modify the message based on access rights
                need_copy = False

                # For E2EE documents, we cannot filter content (it's all
                # encrypted), so skip comment filtering entirely.
                if (
                    not session["doc"].e2ee
                    and "comments" in message
                    and len(message["comments"]) > 0
                ):
                    # Filter comments if needed
                    if access_rights == "read-without-comments":
                        need_copy = True
                    elif (
                        access_rights in ["review", "review-tracked"]
                        and user_id != waiter.user_info.user.id
                    ):
                        need_copy = True
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

                # Create a copy of the message if needed to modify it
                if need_copy:
                    msg_to_send = deepcopy(message)
                    msg_to_send["comments"] = []

                # comment updates travel inside "cu" of diff
                # messages; filter them per recipient rights.
                if (
                    not session["doc"].e2ee
                    and message.get("type") == "diff"
                    and "cu" in message
                    and (
                        access_rights == "read-without-comments"
                        or access_rights in OWN_COMMENTS_ONLY_RIGHTS
                    )
                ):
                    msg_to_send = sanitize_diff_message(
                        msg_to_send,
                        access_rights,
                        waiter.user_info.user.id,
                        session["doc"].comments,
                    )

                # Add the send task to our list
                send_tasks.append(waiter.send_message(msg_to_send))

        # Execute all send tasks concurrently
        if send_tasks:
            await asyncio.gather(*send_tasks)

    @classmethod
    async def save_document_async(cls, document_id, force=False):
        session = cls.get_session(document_id)
        if not session:
            return
        node = None
        if not session["doc"].e2ee and session.get("node_updates"):
            node = session["node"]
        saved = await document_store.save_document_async(
            doc=session["doc"],
            node=node,
            force=force,
            last_saved_version=session["last_saved_version"],
        )
        if saved:
            session["last_saved_version"] = session["doc"].version
            if not session["doc"].e2ee:
                session["node_updates"] = False

    @classmethod
    def save_document(cls, document_id, force=False):
        session = cls.get_session(document_id)
        if not session:
            return
        node = None
        if not session["doc"].e2ee and session.get("node_updates"):
            node = session["node"]
        saved = document_store.save_document(
            doc=session["doc"],
            node=node,
            force=force,
            last_saved_version=session["last_saved_version"],
        )
        if saved:
            session["last_saved_version"] = session["doc"].version
            if not session["doc"].e2ee:
                session["node_updates"] = False

    @classmethod
    def save_all_docs(cls):
        try:
            document_ids = list(cls.runtime_sessions)
        except (TypeError, FileNotFoundError):
            return
        for document_id in document_ids:
            cls.save_document(document_id)


atexit.register(WebsocketConsumer.save_all_docs)

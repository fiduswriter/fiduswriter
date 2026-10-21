"""Unit tests for the document WebSocket consumer (no browser).

Guest participants must never be identified by the secret
share token UUID in participant lists, chat or comments.
"""

import os
import base64
import json

from asgiref.sync import async_to_sync
from channels.testing import WebsocketCommunicator
from django.contrib.auth.models import AnonymousUser
from django.test import TransactionTestCase

from document.consumers import WebsocketConsumer
from document.helpers.token_access import guest_participant_id
from document.models import (
    AccessRight,
    Document,
    DocumentEncryptionKey,
    DocumentTemplate,
    ShareToken,
)
from user.models import User


def consumer_app(user, document_id):
    """Wrap the consumer in an ASGI app that injects scope["user"] and
    the URL route kwargs a real URLRouter would provide."""
    inner = WebsocketConsumer.as_asgi()

    async def app(scope, receive, send):
        scope["user"] = user
        scope["url_route"] = {
            "path": f"/ws/document/{document_id}/",
            "kwargs": {"document_id": str(document_id)},
        }
        await inner(scope, receive, send)

    return app


class GuestIdentityTest(TransactionTestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="guestid-owner", password="pass"
        )
        self.template = DocumentTemplate.objects.create(
            title="Guest Template", content={}
        )
        self.doc = Document.objects.create(
            owner=self.owner, template=self.template, title="Doc"
        )
        self.writer = User.objects.create_user(
            username="guestid-writer", password="pass"
        )
        AccessRight.objects.create(
            document=self.doc, holder_obj=self.writer, rights="write"
        )
        self.token = ShareToken.objects.create(
            document=self.doc,
            rights="write",
            created_by=self.owner,
            is_active=True,
        )
        self.guest_id = guest_participant_id(
            str(self.token.token), self.doc.id
        )

    def tearDown(self):
        WebsocketConsumer.remove_session(self.doc.id)

    def _communicator(self, user=None, token=None):
        path = f"/ws/document/{self.doc.id}/"
        if token:
            path = f"{path}?token={token}"
        return WebsocketCommunicator(consumer_app(user, self.doc.id), path)

    def _json_messages(self, communicator, count, timeout=5):
        messages = []
        for _ in range(count):
            raw = async_to_sync(communicator.receive_from)(timeout)
            messages.append(json.loads(raw))
        return messages

    def test_guest_participant_list_never_contains_token(self):
        async def run():
            communicator = self._communicator(
                AnonymousUser(), token=str(self.token.token)
            )
            connected, _ = await communicator.connect()
            assert connected
            messages = [
                json.loads(await communicator.receive_from(5))
            ]  # welcome
            await communicator.send_json_to(
                {
                    "type": "subscribe",
                    "c": 1,
                    "s": 1,
                    "connection": 0,
                    "v": self.doc.version,
                }
            )
            # Collect until we see the participant "connections" message.
            while True:
                message = json.loads(await communicator.receive_from(5))
                messages.append(message)
                if message.get("type") == "connections":
                    break
            await communicator.disconnect()
            return messages

        messages = async_to_sync(run)()
        connections = [m for m in messages if m.get("type") == "connections"]
        self.assertEqual(len(connections), 1)
        participants = connections[0]["participant_list"]
        self.assertEqual(len(participants), 1)
        self.assertEqual(participants[0]["id"], self.guest_id)
        self.assertNotEqual(participants[0]["id"], str(self.token.token))
        # No message on the wire may contain the secret token.
        dumped = json.dumps(messages)
        self.assertNotIn(str(self.token.token), dumped)
        session_infos = [
            m for m in messages if m.get("type") == "session_info"
        ]
        self.assertEqual(session_infos[0]["guest_id"], self.guest_id)

    def test_chat_from_is_guest_id_not_token(self):
        async def run():
            guest = self._communicator(
                AnonymousUser(), token=str(self.token.token)
            )
            owner = self._communicator(self.owner)
            g_connected, _ = await guest.connect()
            assert g_connected
            await guest.receive_from(5)  # welcome
            await guest.send_json_to(
                {
                    "type": "subscribe",
                    "c": 1,
                    "s": 1,
                    "connection": 0,
                    "v": self.doc.version,
                }
            )

            o_connected, _ = await owner.connect()
            assert o_connected
            await owner.receive_from(5)  # welcome
            await owner.send_json_to(
                {
                    "type": "subscribe",
                    "c": 1,
                    "s": 1,
                    "connection": 1,
                    "v": self.doc.version,
                }
            )
            # Drain owner's bootstrap messages.
            while True:
                message = json.loads(await owner.receive_from(5))
                if message.get("type") == "connections":
                    break

            await guest.send_json_to(
                {"type": "chat", "body": "hello", "c": 2, "s": 9999}
            )
            chat = None
            for _ in range(10):
                message = json.loads(await owner.receive_from(5))
                if message.get("type") == "chat":
                    chat = message
                    break
            await guest.disconnect()
            await owner.disconnect()
            return chat

        chat = async_to_sync(run)()
        self.assertIsNotNone(chat)
        self.assertEqual(chat["from"], self.guest_id)
        self.assertNotEqual(chat["from"], str(self.token.token))
        self.assertNotIn(str(self.token.token), json.dumps(chat))

    def test_guest_id_cannot_authenticate_as_token(self):
        async def run():
            # Replaying the observed guest participant id as a share
            # token must not grant access.
            communicator = self._communicator(
                AnonymousUser(), token=self.guest_id
            )
            try:
                connected, _ = await communicator.connect()
                if connected:
                    message = json.loads(await communicator.receive_from(5))
                    return message
                return {"type": "not-connected"}
            except Exception:
                return {"type": "rejected"}

        result = async_to_sync(run)()
        self.assertIn(
            result["type"], ("access_denied", "not-connected", "rejected")
        )

    def test_stored_comments_use_guest_id(self):
        async def run():
            guest = self._communicator(
                AnonymousUser(), token=str(self.token.token)
            )
            owner = self._communicator(self.writer)

            g_connected, _ = await guest.connect()
            assert g_connected
            await guest.receive_from(5)  # welcome

            o_connected, _ = await owner.connect()
            assert o_connected
            await owner.receive_from(5)  # welcome
            await owner.send_json_to(
                {
                    "type": "subscribe",
                    "c": 1,
                    "s": 1,
                    "connection": 1,
                    "v": self.doc.version,
                }
            )
            # owner messages: subscribed...
            for _ in range(3):
                await owner.receive_from(5)

            await guest.send_json_to(
                {
                    "type": "subscribe",
                    "c": 1,
                    "s": 1,
                    "connection": 0,
                    "v": self.doc.version,
                }
            )
            await guest.receive_from(5)  # subscribed

            # A comment update by the guest (a write-role user receives
            # the diff so we can see the stored comment).
            await guest.send_json_to(
                {
                    "type": "diff",
                    "c": 2,
                    "s": 9999,
                    "rid": "r1",
                    "v": self.doc.version,
                    "cu": [
                        {
                            "id": "comment-1",
                            "type": "create",
                            "user": self.guest_id,
                            "username": "Guest 0",
                            "assignedUser": None,
                            "assignedUsername": None,
                            "date": 0,
                            "comment": "hi",
                            "isMajor": False,
                            "resolved": False,
                        }
                    ],
                }
            )
            diff_to_owner = None
            for _ in range(10):
                message = json.loads(await owner.receive_from(5))
                if message.get("type") == "diff":
                    diff_to_owner = message
                    break
            await guest.disconnect()
            await owner.disconnect()
            return diff_to_owner

        diff = async_to_sync(run)()
        self.assertIsNotNone(diff)
        self.doc.refresh_from_db()
        self.assertIn("comment-1", self.doc.comments)
        stored_user = self.doc.comments["comment-1"]["user"]
        self.assertEqual(stored_user, self.guest_id)
        self.assertNotEqual(stored_user, str(self.token.token))


class CommentOnlyRightsTest(TransactionTestCase):
    """comment-only roles must not be able to alter content,
    title, bibliography or images through the diff envelope, and review
    roles may only touch their own comments."""

    def setUp(self):
        self.owner = User.objects.create_user(
            username="co-owner", password="pass"
        )
        self.writer = User.objects.create_user(
            username="co-writer", password="pass"
        )
        self.template = DocumentTemplate.objects.create(
            title="CO Template", content={}
        )
        self.doc = Document.objects.create(
            owner=self.owner, template=self.template, title="Doc"
        )
        AccessRight.objects.create(
            document=self.doc, holder_obj=self.writer, rights="write"
        )

    def tearDown(self):
        WebsocketConsumer.remove_session(self.doc.id)

    def _communicator(self, user=None, token=None):
        path = f"/ws/document/{self.doc.id}/"
        if token:
            path = f"{path}?token={token}"
        return WebsocketCommunicator(consumer_app(user, self.doc.id), path)

    async def _drain_until(self, communicator, message_type):
        while True:
            message = json.loads(await communicator.receive_from(5))
            if message.get("type") == message_type:
                return message

    async def _open_owner(self):
        """Connect owner first so there is an open session and a second
        participant watching the wire. Must be awaited inside the same
        event loop as the rest of the scenario."""
        owner = self._communicator(self.owner)
        connected, _ = await owner.connect()
        assert connected
        await owner.receive_from(5)  # welcome
        await owner.send_json_to(
            {
                "type": "subscribe",
                "c": 1,
                "s": 1,
                "connection": 0,
                "v": self.doc.version,
            }
        )
        await self._drain_until(owner, "connections")
        return owner

    def _guest_connect(self, token, rights):
        token_obj = ShareToken.objects.create(
            document=self.doc,
            rights=rights,
            created_by=self.owner,
            is_active=True,
        )
        return token_obj, self._communicator(
            AnonymousUser(), str(token_obj.token)
        )

    async def _expect_silence(self, owner):
        import asyncio as _asyncio

        await _asyncio.sleep(0.7)
        while True:
            try:
                raw = await owner.receive_from(0.2)
            except TimeoutError:
                return True
            except Exception:
                return False
            message = json.loads(raw)
            return message.get("type") not in ("diff", "confirm_diff")

    def test_review_diff_with_title_change_is_discarded(self):
        token_obj, _ = self._guest_connect(None, "review")
        guest = self._communicator(AnonymousUser(), str(token_obj.token))

        async def run():
            owner = await self._open_owner()
            connected, _ = await guest.connect()
            assert connected
            await guest.receive_from(5)  # welcome
            await guest.send_json_to(
                {
                    "type": "subscribe",
                    "c": 1,
                    "s": 1,
                    "connection": 1,
                    "v": self.doc.version,
                }
            )
            await self._drain_until(guest, "access_right")
            await guest.send_json_to(
                {
                    "type": "diff",
                    "c": 2,
                    "s": 9999,
                    "rid": "r1",
                    "v": self.doc.version,
                    "ti": "pwned",
                    "ds": [
                        {
                            "stepType": "addMark",
                            "mark": {
                                "type": "comment",
                                "attrs": {
                                    "comment": {"id": "comment-x"},
                                },
                            },
                            "from": 0,
                            "to": 5,
                        }
                    ],
                    "cu": [],
                }
            )
            silent = await self._expect_silence(owner)
            try:
                await guest.disconnect()
            except TimeoutError:
                pass
            return silent

        self.assertTrue(async_to_sync(run)())
        self.doc.refresh_from_db()
        self.assertNotEqual(self.doc.title, "pwned")
        self.assertEqual(self.doc.version, 0)

    def test_review_diff_missing_ds_is_discarded(self):
        token_obj, _ = self._guest_connect(None, "review")
        guest = self._communicator(AnonymousUser(), str(token_obj.token))

        async def run():
            owner = await self._open_owner()
            connected, _ = await guest.connect()
            assert connected
            await guest.receive_from(5)
            await guest.send_json_to(
                {
                    "type": "subscribe",
                    "c": 1,
                    "s": 1,
                    "connection": 1,
                    "v": self.doc.version,
                }
            )
            await self._drain_until(guest, "access_right")
            await guest.send_json_to(
                {
                    "type": "diff",
                    "c": 2,
                    "s": 9999,
                    "rid": "r1",
                    "v": self.doc.version,
                    "iu": [{"id": 1, "file": {"image": {"src": "evil"}}}],
                    "cu": [],
                }
            )
            silent = await self._expect_silence(owner)
            try:
                await guest.disconnect()
            except TimeoutError:
                pass
            return silent

        self.assertTrue(async_to_sync(run)())
        self.doc.refresh_from_db()
        self.assertEqual(self.doc.version, 0)

    def test_review_touching_foreign_comment_is_discarded(self):
        # A comment by the writer exists; the review guest tries to edit it.
        self.doc.comments = {
            "comment-foreign": {
                "id": "comment-foreign",
                "user": self.writer.id,
                "username": self.writer.username,
                "assignedUser": None,
                "assignedUsername": None,
                "date": 0,
                "comment": "writer comment",
                "isMajor": False,
                "resolved": False,
                "answers": [],
            }
        }
        self.doc.save()
        token_obj, _ = self._guest_connect(None, "review")
        guest = self._communicator(AnonymousUser(), str(token_obj.token))
        guest_id = guest_participant_id(str(token_obj.token), self.doc.id)

        async def run():
            owner = await self._open_owner()
            connected, _ = await guest.connect()
            assert connected
            await guest.receive_from(5)
            await guest.send_json_to(
                {
                    "type": "subscribe",
                    "c": 1,
                    "s": 1,
                    "connection": 1,
                    "v": self.doc.version,
                }
            )
            await self._drain_until(guest, "access_right")
            await guest.send_json_to(
                {
                    "type": "diff",
                    "c": 2,
                    "s": 9999,
                    "rid": "r1",
                    "v": self.doc.version,
                    "cu": [
                        {
                            "id": "comment-foreign",
                            "type": "update",
                            "user": guest_id,
                            "username": "Guest",
                            "assignedUser": None,
                            "assignedUsername": None,
                            "date": 0,
                            "comment": "hijacked",
                            "isMajor": False,
                            "resolved": False,
                        }
                    ],
                }
            )
            silent = await self._expect_silence(owner)
            try:
                await guest.disconnect()
            except TimeoutError:
                pass
            return silent

        self.assertTrue(async_to_sync(run)())
        self.doc.refresh_from_db()
        self.assertEqual(
            self.doc.comments["comment-foreign"]["comment"],
            "writer comment",
        )
        self.assertEqual(self.doc.version, 0)


class LiveCommentFilterTest(TransactionTestCase):
    """comment updates inside live diff messages must be
    filtered per recipient access right."""

    def setUp(self):
        self.owner = User.objects.create_user(
            username="cf-owner", password="pass"
        )
        self.writer = User.objects.create_user(
            username="cf-writer", password="pass"
        )
        self.template = DocumentTemplate.objects.create(
            title="CF Template", content={}
        )
        self.doc = Document.objects.create(
            owner=self.owner, template=self.template, title="Doc"
        )
        AccessRight.objects.create(
            document=self.doc, holder_obj=self.writer, rights="write"
        )
        self.review_token = ShareToken.objects.create(
            document=self.doc,
            rights="review",
            created_by=self.owner,
            is_active=True,
        )
        self.rwc_token = ShareToken.objects.create(
            document=self.doc,
            rights="read-without-comments",
            created_by=self.owner,
            is_active=True,
        )

    def tearDown(self):
        WebsocketConsumer.remove_session(self.doc.id)

    def _communicator(self, user=None, token=None):
        path = f"/ws/document/{self.doc.id}/"
        if token:
            path = f"{path}?token={token}"
        return WebsocketCommunicator(consumer_app(user, self.doc.id), path)

    async def _subscribe(self, comm, connection=1):
        connected, _ = await comm.connect()
        assert connected
        await comm.receive_from(5)  # welcome
        await comm.send_json_to(
            {
                "type": "subscribe",
                "c": 1,
                "s": 1,
                "connection": connection,
                "v": self.doc.version,
            }
        )
        return comm

    async def _next_message_of_type(self, comm, message_type):
        for _ in range(12):
            message = json.loads(await comm.receive_from(5))
            if message.get("type") == message_type:
                return message
        self.fail(f"no {message_type} message received")

    def test_foreign_comments_filtered_from_live_diffs(self):
        async def run():
            writer = await self._subscribe(
                self._communicator(self.writer), connection=0
            )
            await self._next_message_of_type(writer, "confirm_version")
            review = await self._subscribe(
                self._communicator(
                    AnonymousUser(), token=str(self.review_token.token)
                )
            )
            rwc = await self._subscribe(
                self._communicator(
                    AnonymousUser(), token=str(self.rwc_token.token)
                )
            )
            await writer.send_json_to(
                {
                    "type": "diff",
                    "c": 2,
                    "s": 9999,
                    "rid": "r1",
                    "v": self.doc.version,
                    "cu": [
                        {
                            "id": "comment-1",
                            "type": "create",
                            "user": self.writer.id,
                            "username": "writer",
                            "assignedUser": None,
                            "assignedUsername": None,
                            "date": 0,
                            "comment": "public-ish",
                            "isMajor": False,
                            "resolved": False,
                        }
                    ],
                }
            )
            review_diff = await self._next_message_of_type(review, "diff")
            rwc_diff = await self._next_message_of_type(rwc, "diff")
            await review.disconnect()
            await rwc.disconnect()
            return review_diff, rwc_diff

        review_diff, rwc_diff = async_to_sync(run)()
        # Review role: only own comment entries survive -> foreign entry gone
        self.assertEqual(review_diff.get("cu", []), [])
        # read-without-comments: the cu field is removed entirely
        self.assertNotIn("cu", rwc_diff)
        # The comment itself is stored in the session (not lost):
        session = WebsocketConsumer.get_session(self.doc.id)
        self.assertIsNotNone(session)
        self.assertIn("comment-1", session["doc"].comments)


class E2EEProtocolTest(TransactionTestCase):
    """E2EE wire-protocol invariants."""

    def setUp(self):
        self.owner = User.objects.create_user(
            username="e2eep-owner", password="pass"
        )
        self.writer = User.objects.create_user(
            username="e2eep-writer", password="pass"
        )
        self.template = DocumentTemplate.objects.create(
            title="E2EE Template", content={}
        )
        self.salt = os.urandom(16)
        self.doc = Document.objects.create(
            owner=self.owner,
            template=self.template,
            title="Secret",
            e2ee=True,
            e2ee_salt=self.salt,
            e2ee_iterations=600000,
            content={"type": "doc", "content": []},
        )

    def tearDown(self):
        WebsocketConsumer.remove_session(self.doc.id)

    def _communicator(self, user):
        path = f"/ws/document/{self.doc.id}/"
        return WebsocketCommunicator(consumer_app(user, self.doc.id), path)

    async def _subscribe(self, comm, connection=0):
        connected, _ = await comm.connect()
        assert connected
        await comm.receive_from(5)  # welcome
        await comm.send_json_to(
            {
                "type": "subscribe",
                "c": 1,
                "s": 1,
                "connection": connection,
                "v": self.doc.version,
            }
        )
        return comm

    async def _next_message_of_type(self, comm, message_type, limit=12):
        for _ in range(limit):
            message = json.loads(await comm.receive_from(5))
            if message.get("type") == message_type:
                return message
        self.fail(f"no {message_type} message received")

    async def _silence(self, comm, timeout=0.6):
        import asyncio as _asyncio

        await _asyncio.sleep(timeout)
        try:
            raw = await comm.receive_from(0.2)
            return json.loads(raw)
        except TimeoutError:
            return None

    def _salt_b64(self, salt=None):
        return base64.b64encode(salt or self.salt).decode("ascii")

    def test_snapshot_requires_matching_salt(self):
        async def run():
            owner = await self._subscribe(self._communicator(self.owner))
            await owner.send_json_to(
                {
                    "type": "e2ee_snapshot",
                    "c": 2,
                    "s": 9999,
                    "v": self.doc.version,
                    "content": "ciphertext",
                    "comments": "ciphertext",
                    "bibliography": "ciphertext",
                    "e2ee_salt": self._salt_b64(os.urandom(16)),
                }
            )
            await self._silence(owner)
            await owner.disconnect()

        async_to_sync(run)()
        self.doc.refresh_from_db()
        self.assertNotEqual(self.doc.content, "ciphertext")

    def test_snapshot_version_must_match(self):
        async def run():
            owner = await self._subscribe(self._communicator(self.owner))
            await owner.send_json_to(
                {
                    "type": "e2ee_snapshot",
                    "c": 2,
                    "s": 9999,
                    "v": self.doc.version + 4,
                    "content": "ciphertext",
                    "comments": "ciphertext",
                    "bibliography": "ciphertext",
                    "e2ee_salt": self._salt_b64(),
                    "e2ee_iterations": 600000,
                }
            )
            await self._silence(owner)
            await owner.disconnect()

        async_to_sync(run)()
        self.doc.refresh_from_db()
        self.assertNotEqual(self.doc.content, "ciphertext")
        self.assertIsNone(self.doc.e2ee_snapshot_version)

    def test_later_snapshot_rejects_plaintext_fields(self):
        self.doc.content = "old-ciphertext"
        self.doc.e2ee_snapshot_version = 0
        self.doc.save()

        async def run():
            owner = await self._subscribe(self._communicator(self.owner))
            await owner.send_json_to(
                {
                    "type": "e2ee_snapshot",
                    "c": 2,
                    "s": 9999,
                    "v": self.doc.version,
                    "content": {"type": "doc", "content": []},
                    "e2ee_salt": self._salt_b64(),
                    "e2ee_iterations": 600000,
                }
            )
            await self._silence(owner)
            await owner.disconnect()

        async_to_sync(run)()
        self.doc.refresh_from_db()
        self.assertEqual(self.doc.content, "old-ciphertext")

    def test_snapshot_salt_change_rejected(self):
        """e2ee_snapshot may not change the key epoch."""
        self.doc.content = "old-ciphertext"
        self.doc.save()

        async def run():
            owner = await self._subscribe(self._communicator(self.owner))
            await owner.send_json_to(
                {
                    "type": "e2ee_snapshot",
                    "c": 2,
                    "s": 9999,
                    "v": self.doc.version,
                    "content": "new-ciphertext",
                    "comments": "x",
                    "bibliography": "y",
                    "e2ee_salt": self._salt_b64(os.urandom(16)),
                    "e2ee_iterations": 700000,
                }
            )
            await self._silence(owner)
            await owner.disconnect()

        async_to_sync(run)()
        self.doc.refresh_from_db()
        self.assertEqual(bytes(self.doc.e2ee_salt), self.salt)
        self.assertEqual(self.doc.e2ee_iterations, 600000)
        self.assertNotEqual(self.doc.content, "new-ciphertext")

    def test_snapshot_to_non_e2ee_document_rejected(self):
        """the snapshot handler must not write to legacy docs."""
        plain_doc = Document.objects.create(
            owner=self.owner,
            template=self.template,
            title="Plain",
            content={"type": "doc", "content": []},
        )
        try:
            communicator = WebsocketCommunicator(
                consumer_app(self.owner, plain_doc.id),
                f"/ws/document/{plain_doc.id}/",
            )

            async def run():
                comm = await self._subscribe_owner(communicator)
                await comm.send_json_to(
                    {
                        "type": "e2ee_snapshot",
                        "c": 2,
                        "s": 9999,
                        "v": plain_doc.version,
                        "content": "overwritten",
                        "e2ee_salt": self._salt_b64(),
                    }
                )
                await self._silence(comm)
                await comm.disconnect()

            async_to_sync(run)()
        finally:
            WebsocketConsumer.remove_session(plain_doc.id)
        plain_doc.refresh_from_db()
        self.assertEqual(plain_doc.content, {"type": "doc", "content": []})

    async def _subscribe_owner(self, comm, connection=0):
        connected, _ = await comm.connect()
        assert connected
        await comm.receive_from(5)
        await comm.send_json_to(
            {
                "type": "subscribe",
                "c": 1,
                "s": 1,
                "connection": connection,
                "v": 0,
            }
        )
        return comm

    def test_encrypted_diff_requires_ep_and_matching_salt(self):
        salt_b64 = self._salt_b64()
        bad_salt_b64 = self._salt_b64(os.urandom(16))

        async def run():
            owner = await self._subscribe(self._communicator(self.owner))
            # no ep field
            await owner.send_json_to(
                {
                    "type": "diff",
                    "c": 2,
                    "s": 9999,
                    "v": self.doc.version,
                    "rid": "r1",
                    "e2ee_salt": salt_b64,
                    "ds": [{"stepType": "insert"}],
                }
            )
            # missing salt
            await owner.send_json_to(
                {
                    "type": "diff",
                    "c": 3,
                    "s": 9999,
                    "v": self.doc.version,
                    "rid": "r2",
                    "ep": "ciphertext",
                }
            )
            # wrong salt
            await owner.send_json_to(
                {
                    "type": "diff",
                    "c": 4,
                    "s": 9999,
                    "v": self.doc.version,
                    "rid": "r3",
                    "ep": "ciphertext",
                    "e2ee_salt": bad_salt_b64,
                }
            )
            # valid
            await owner.send_json_to(
                {
                    "type": "diff",
                    "c": 5,
                    "s": 9999,
                    "v": self.doc.version,
                    "rid": "r4",
                    "ep": "ciphertext",
                    "e2ee_salt": salt_b64,
                }
            )
            confirm = await self._next_message_of_type(
                owner, "confirm_diff", limit=10
            )
            await owner.disconnect()
            return confirm

        confirm = async_to_sync(run)()
        self.assertEqual(confirm["rid"], "r4")
        self.doc.refresh_from_db()
        self.assertEqual(self.doc.version, 1)

    def test_plaintext_chat_in_e2ee_room_is_dropped(self):
        """fail closed — no plaintext relay inside E2EE rooms."""
        AccessRight.objects.create(
            document=self.doc, holder_obj=self.writer, rights="write"
        )

        async def run():
            owner = await self._subscribe(self._communicator(self.owner))
            writer = await self._subscribe(
                self._communicator(self.writer), connection=1
            )
            await writer.send_json_to(
                {"type": "chat", "body": "oops", "c": 2, "s": 9999}
            )
            rejected = await self._next_message_of_type(
                writer, "chat_rejected"
            )
            leaked = await self._silence(owner, 0.4)
            await writer.disconnect()
            await owner.disconnect()
            return rejected, leaked

        rejected, leaked = async_to_sync(run)()
        self.assertEqual(rejected["reason"], "e2ee-mode")
        self.assertTrue(leaked is None or leaked.get("type") != "chat")

    def test_owner_rekey_updates_epoch_and_envelopes(self):
        AccessRight.objects.create(
            document=self.doc, holder_obj=self.writer, rights="write"
        )
        DocumentEncryptionKey.objects.create(
            document=self.doc,
            holder=self.writer,
            encrypted_key="old-envelope",
            encrypted_with_master_key=False,
        )
        new_salt = os.urandom(16)

        async def run():
            owner = await self._subscribe(self._communicator(self.owner))
            await owner.send_json_to(
                {
                    "type": "e2ee_rekey",
                    "c": 2,
                    "s": 9999,
                    "v": self.doc.version,
                    "content": "new-ciphertext",
                    "comments": "enc-comments",
                    "bibliography": "enc-bib",
                    "title": "enc-title",
                    "e2ee_salt": self._salt_b64(new_salt),
                    "e2ee_iterations": 600000,
                    "keys": [
                        {
                            "holder_id": self.writer.id,
                            "encrypted_key": "new-envelope-writer",
                            "encrypted_with_master_key": False,
                        },
                        {
                            "holder_id": self.owner.id,
                            "encrypted_key": "new-envelope-owner",
                            "encrypted_with_master_key": True,
                        },
                    ],
                }
            )
            done = await self._next_message_of_type(owner, "e2ee_rekey_done")
            await owner.disconnect()
            return done

        done = async_to_sync(run)()
        self.assertEqual(done["v"], self.doc.version)
        self.doc.refresh_from_db()
        self.assertEqual(bytes(self.doc.e2ee_salt), new_salt)
        self.assertEqual(self.doc.content, "new-ciphertext")
        self.assertEqual(self.doc.diffs, [])
        self.assertEqual(self.doc.e2ee_snapshot_version, self.doc.version)
        dek = DocumentEncryptionKey.objects.get(
            document=self.doc, holder=self.writer
        )
        self.assertEqual(dek.encrypted_key, "new-envelope-writer")
        owner_dek = DocumentEncryptionKey.objects.get(
            document=self.doc, holder=self.owner
        )
        self.assertEqual(owner_dek.encrypted_key, "new-envelope-owner")

    def test_rekey_rejects_non_owner_and_missing_envelopes(self):
        AccessRight.objects.create(
            document=self.doc, holder_obj=self.writer, rights="write"
        )
        DocumentEncryptionKey.objects.create(
            document=self.doc,
            holder=self.writer,
            encrypted_key="old-envelope",
            encrypted_with_master_key=False,
        )
        new_salt = os.urandom(16)
        rekey_msg = {
            "type": "e2ee_rekey",
            "s": 9999,
            "v": 0,
            "content": "attacker-ciphertext",
            "comments": "x",
            "bibliography": "y",
            "e2ee_salt": self._salt_b64(new_salt),
            "e2ee_iterations": 600000,
            "keys": [
                {
                    "holder_id": self.owner.id,
                    "encrypted_key": "only-owner",
                    "encrypted_with_master_key": True,
                }
            ],
        }

        async def run():
            # Non-owner attempt
            writer = await self._subscribe(
                self._communicator(self.writer), connection=1
            )
            await writer.send_json_to(dict(rekey_msg, c=2, rid="nw"))
            await self._silence(writer, 0.4)
            # Owner attempt that does not cover all current holders
            owner = await self._subscribe(
                self._communicator(self.owner), connection=2
            )
            await owner.send_json_to(dict(rekey_msg, c=2, rid="no-env"))
            await self._silence(owner, 0.4)
            await writer.disconnect()
            await owner.disconnect()

        async_to_sync(run)()
        self.doc.refresh_from_db()
        self.assertEqual(bytes(self.doc.e2ee_salt), self.salt)
        self.assertNotEqual(self.doc.content, "attacker-ciphertext")
        dek = DocumentEncryptionKey.objects.get(
            document=self.doc, holder=self.writer
        )
        self.assertEqual(dek.encrypted_key, "old-envelope")

    def test_rekey_below_pbkdf2_floor_rejected(self):
        """floors are enforced on the re-key path as well."""

        async def run():
            owner = await self._subscribe(self._communicator(self.owner))
            await owner.send_json_to(
                {
                    "type": "e2ee_rekey",
                    "c": 2,
                    "s": 9999,
                    "v": self.doc.version,
                    "content": "c",
                    "comments": "c",
                    "bibliography": "c",
                    "e2ee_salt": self._salt_b64(),
                    "e2ee_iterations": 1,
                    "keys": [
                        {
                            "holder_id": self.owner.id,
                            "encrypted_key": "env",
                            "encrypted_with_master_key": True,
                        }
                    ],
                }
            )
            await self._silence(owner, 0.4)
            await owner.disconnect()

        async_to_sync(run)()
        self.doc.refresh_from_db()
        self.assertNotEqual(self.doc.content, "c")

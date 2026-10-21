"""Unit tests for document views that don't require a browser."""

import importlib
import json
import base64
import os
import shutil
import tempfile
from io import StringIO
from unittest.mock import patch
from django.test import TestCase, Client, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.core.management.base import CommandError
from django.conf import settings

from user.models import User, UserEncryptionKey
from document.models import (
    AccessRight,
    Document,
    DocumentTemplate,
    DocumentEncryptionKey,
    ShareToken,
    DocumentRevision,
)
from document.views import _handle_automatic_key_sharing
from base.models import AuditLog

_revision_migration = importlib.import_module(
    "document.migrations.0027_move_revisions_to_app_storage"
)
move_revisions_to_app_storage = (
    _revision_migration.move_revisions_to_app_storage
)


AJAX_HEADERS = {"HTTP_X_REQUESTED_WITH": "XMLHttpRequest"}


def json_post(client, url, data):
    return client.post(
        url,
        json.dumps(data),
        content_type="application/json",
        **AJAX_HEADERS,
    )


def ajax_get(client, url, params=None):
    return client.get(url, params or {}, **AJAX_HEADERS)


class HandleAutomaticKeySharingTest(TestCase):
    """Tests for the _handle_automatic_key_sharing() helper."""

    def setUp(self):
        self.owner = User.objects.create_user(
            username="docowner", password="pass"
        )
        self.collaborator = User.objects.create_user(
            username="collabo", password="pass"
        )
        self.template = DocumentTemplate.objects.create(
            title="Test Template", content={}
        )

    def test_non_e2ee_document_returns_false(self):
        doc = Document.objects.create(
            owner=self.owner,
            template=self.template,
            e2ee=False,
        )
        result = _handle_automatic_key_sharing(doc, self.collaborator)
        self.assertFalse(result)

    def test_user_already_has_dek_returns_false(self):
        doc = Document.objects.create(
            owner=self.owner,
            template=self.template,
            e2ee=True,
        )
        # Create a DEK for the collaborator
        DocumentEncryptionKey.objects.create(
            document=doc,
            holder=self.collaborator,
            encrypted_key="enckey",
        )
        result = _handle_automatic_key_sharing(doc, self.collaborator)
        self.assertFalse(result)

    def test_user_without_encryption_keys_returns_false(self):
        doc = Document.objects.create(
            owner=self.owner,
            template=self.template,
            e2ee=True,
        )
        # Collaborator has no UserEncryptionKey
        result = _handle_automatic_key_sharing(doc, self.collaborator)
        self.assertFalse(result)

    def test_eligible_user_returns_true(self):
        doc = Document.objects.create(
            owner=self.owner,
            template=self.template,
            e2ee=True,
        )
        # Give collaborator encryption keys but no DEK
        UserEncryptionKey.objects.create(
            user=self.collaborator,
            public_key="pub",
            encrypted_private_key="encpriv",
            encrypted_master_key="encmk",
            user_salt=b"\x00" * 16,
            user_iterations=600000,
            encrypted_master_key_backup="backup",
        )
        result = _handle_automatic_key_sharing(doc, self.collaborator)
        self.assertTrue(result)


class CreateDocViewTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="createdocuser", password="pass"
        )
        self.client.force_login(self.user)
        self.template = DocumentTemplate.objects.create(
            title="Default Template", content={}
        )

    def test_create_normal_document(self):
        response = json_post(
            self.client,
            "/api/document/create_doc/",
            {"template_id": self.template.id, "path": "", "e2ee": False},
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertIn("id", data)
        self.assertTrue(Document.objects.filter(id=data["id"]).exists())

    def test_create_document_sets_owner(self):
        response = json_post(
            self.client,
            "/api/document/create_doc/",
            {"template_id": self.template.id, "path": "", "e2ee": False},
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()
        doc = Document.objects.get(id=data["id"])
        self.assertEqual(doc.owner, self.user)

    def test_create_document_with_path(self):
        response = json_post(
            self.client,
            "/api/document/create_doc/",
            {
                "template_id": self.template.id,
                "path": "/my-folder",
                "e2ee": False,
            },
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()
        doc = Document.objects.get(id=data["id"])
        self.assertEqual(doc.path, "/my-folder")

    def test_create_with_invalid_template_returns_405(self):
        response = json_post(
            self.client,
            "/api/document/create_doc/",
            {"template_id": 999999, "path": "", "e2ee": False},
        )
        self.assertEqual(response.status_code, 405)

    @override_settings(E2EE_MODE="optional")
    def test_create_e2ee_document(self):
        salt = base64.b64encode(b"\x00" * 16).decode("ascii")
        response = json_post(
            self.client,
            "/api/document/create_doc/",
            {
                "template_id": self.template.id,
                "path": "",
                "e2ee": True,
                "e2ee_salt": salt,
                "e2ee_iterations": 600000,
            },
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()
        doc = Document.objects.get(id=data["id"])
        self.assertTrue(doc.e2ee)


class DeleteDocViewTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.owner = User.objects.create_user(
            username="deldocuser", password="pass"
        )
        self.other = User.objects.create_user(
            username="otherdocuser", password="pass"
        )
        self.template = DocumentTemplate.objects.create(
            title="Default Template", content={}
        )
        self.client.force_login(self.owner)

    def test_delete_own_document_returns_done_true(self):
        doc = Document.objects.create(owner=self.owner, template=self.template)
        response = json_post(
            self.client, "/api/document/delete/", {"id": doc.id}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["done"])
        self.assertFalse(Document.objects.filter(id=doc.id).exists())

    def test_cannot_delete_others_document(self):
        doc = Document.objects.create(owner=self.other, template=self.template)
        # Trying to delete a document owned by 'other' raises an error
        # because Document.objects.get(pk=doc_id, owner=request.user) raises DoesNotExist
        try:
            json_post(self.client, "/api/document/delete/", {"id": doc.id})
        except Exception:
            pass
        # Whether the view raises or returns an error, the doc must still exist
        self.assertTrue(Document.objects.filter(id=doc.id).exists())

    def test_delete_e2ee_document_with_encryption_key(self):
        """Regression: an E2EE document with at least one
        DocumentEncryptionKey row must still be deletable."""
        doc = Document.objects.create(
            owner=self.owner,
            template=self.template,
            e2ee=True,
            e2ee_salt=b"dummy-salt",
            e2ee_iterations=100000,
        )
        DocumentEncryptionKey.objects.create(
            document=doc,
            holder=self.owner,
            encrypted_key="dummy-ciphertext",
            encrypted_with_master_key=True,
        )
        response = json_post(
            self.client, "/api/document/delete/", {"id": doc.id}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["done"])
        self.assertFalse(Document.objects.filter(id=doc.id).exists())
        self.assertFalse(
            DocumentEncryptionKey.objects.filter(document_id=doc.id).exists()
        )


class ImportDocViewTest(TestCase):
    """Replacing an existing document via import requires
    write or write-tracked rights; comment/review roles must not be able
    to overwrite the document content."""

    def setUp(self):
        self.client = Client()
        self.owner = User.objects.create_user(
            username="importowner", password="pass"
        )
        self.commenter = User.objects.create_user(
            username="importcommenter", password="pass"
        )
        self.reviewer = User.objects.create_user(
            username="importreviewer", password="pass"
        )
        self.tracked_writer = User.objects.create_user(
            username="importtracked", password="pass"
        )
        self.stranger = User.objects.create_user(
            username="importstranger", password="pass"
        )
        self.template = DocumentTemplate.objects.create(
            title="Import Template", content={}
        )
        self.doc = Document.objects.create(
            owner=self.owner,
            template=self.template,
            title="Original",
            content={"type": "doc", "content": [{"type": "title"}]},
            comments={},
            bibliography={},
        )

    def _grant(self, user, rights):
        AccessRight.objects.create(
            document=self.doc, holder_obj=user, rights=rights
        )

    def _import(self, client, doc=None, title="Replaced", **overrides):
        doc = doc or self.doc
        data = {
            "id": doc.id,
            "title": title,
            "content": {
                "type": "doc",
                "content": [{"type": "title", "content": [{"text": title}]}],
            },
            "comments": {},
            "bibliography": {},
        }
        data.update(overrides)
        return json_post(client, "/api/document/import/", data)

    def test_comment_role_cannot_replace_document(self):
        self._grant(self.commenter, "comment")
        self.client.force_login(self.commenter)
        response = self._import(self.client)
        self.assertEqual(response.status_code, 403)
        self.doc.refresh_from_db()
        self.assertEqual(self.doc.title, "Original")

    def test_review_role_cannot_replace_document(self):
        self._grant(self.reviewer, "review")
        self.client.force_login(self.reviewer)
        response = self._import(self.client)
        self.assertEqual(response.status_code, 403)
        self.doc.refresh_from_db()
        self.assertEqual(self.doc.title, "Original")

    def test_review_tracked_role_cannot_replace_document(self):
        # review-tracked only writes tracked changes; a whole-document
        # replace is not allowed.
        self._grant(self.reviewer, "review-tracked")
        self.client.force_login(self.reviewer)
        response = self._import(self.client)
        self.assertEqual(response.status_code, 403)
        self.doc.refresh_from_db()
        self.assertEqual(self.doc.title, "Original")

    def test_write_tracked_can_replace_document(self):
        self._grant(self.tracked_writer, "write-tracked")
        self.client.force_login(self.tracked_writer)
        response = self._import(self.client)
        self.assertEqual(response.status_code, 200)
        self.doc.refresh_from_db()
        self.assertEqual(self.doc.title, "Replaced")

    def test_write_role_can_replace_document(self):
        self._grant(self.stranger, "write")
        self.client.force_login(self.stranger)
        response = self._import(self.client)
        self.assertEqual(response.status_code, 200)

    def test_no_access_returns_403(self):
        self.client.force_login(self.stranger)
        response = self._import(self.client)
        self.assertEqual(response.status_code, 403)
        self.doc.refresh_from_db()
        self.assertEqual(self.doc.title, "Original")

    def test_owner_can_replace_document(self):
        self.client.force_login(self.owner)
        response = self._import(self.client)
        self.assertEqual(response.status_code, 200)

    def test_nonexistent_document_returns_404(self):
        self.client.force_login(self.owner)
        response = self._import(self.client, doc=None, id=999999)
        self.assertEqual(response.status_code, 404)

    def test_e2ee_document_rejects_plain_object_payload(self):
        doc = Document.objects.create(
            owner=self.owner,
            template=self.template,
            title="Encrypted",
            e2ee=True,
            e2ee_snapshot_version=0,
        )
        self.client.force_login(self.owner)
        response = self._import(self.client, doc=doc)
        self.assertEqual(response.status_code, 400)
        doc.refresh_from_db()
        self.assertEqual(doc.content, {})

    def test_e2ee_document_accepts_string_payload(self):
        doc = Document.objects.create(
            owner=self.owner,
            template=self.template,
            title="Encrypted",
            e2ee=True,
        )
        self.client.force_login(self.owner)
        response = self._import(
            self.client,
            doc=doc,
            title="ciphertext-title",
            content="ciphertext-content",
            comments="ciphertext-comments",
            bibliography="ciphertext-bibliography",
        )
        self.assertEqual(response.status_code, 200)
        doc.refresh_from_db()
        self.assertEqual(doc.content, "ciphertext-content")
        self.assertEqual(doc.e2ee_snapshot_version, 0)

    def test_plaintext_document_rejects_string_payload(self):
        self.client.force_login(self.owner)
        response = self._import(
            self.client,
            content="ciphertext-content",
            comments="ciphertext-comments",
            bibliography="ciphertext-bibliography",
        )
        self.assertEqual(response.status_code, 400)
        self.doc.refresh_from_db()
        self.assertEqual(self.doc.title, "Original")


class ShareTokenViewTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.owner = User.objects.create_user(
            username="sharetokenuser", password="pass"
        )
        self.other = User.objects.create_user(
            username="othertokenuser", password="pass"
        )
        self.template = DocumentTemplate.objects.create(
            title="Default Template", content={}
        )
        self.doc = Document.objects.create(
            owner=self.owner, template=self.template
        )
        self.client.force_login(self.owner)

    def test_create_share_token_returns_201(self):
        response = json_post(
            self.client,
            "/api/document/share_token/create/",
            {
                "document_id": self.doc.id,
                "rights": "read",
                "expires_at": None,
                "note": "Test token",
            },
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertIn("token", data)
        self.assertIn("share_url", data)
        self.assertEqual(data["rights"], "read")
        self.assertEqual(data["note"], "Test token")

    def test_create_share_token_creates_db_record(self):
        json_post(
            self.client,
            "/api/document/share_token/create/",
            {
                "document_id": self.doc.id,
                "rights": "write",
                "expires_at": None,
                "note": "",
            },
        )
        self.assertTrue(ShareToken.objects.filter(document=self.doc).exists())

    def test_create_token_for_non_owned_doc_returns_403(self):
        other_doc = Document.objects.create(
            owner=self.other, template=self.template
        )
        response = json_post(
            self.client,
            "/api/document/share_token/create/",
            {
                "document_id": other_doc.id,
                "rights": "read",
                "expires_at": None,
                "note": "",
            },
        )
        self.assertEqual(response.status_code, 403)

    def test_list_share_tokens_returns_active_tokens(self):
        token = ShareToken.objects.create(
            document=self.doc,
            rights="read",
            created_by=self.owner,
            is_active=True,
        )
        response = json_post(
            self.client,
            "/api/document/share_token/list/",
            {"document_id": self.doc.id},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data["tokens"]), 1)
        self.assertEqual(data["tokens"][0]["token"], str(token.token))

    def test_revoke_share_token(self):
        token = ShareToken.objects.create(
            document=self.doc,
            rights="read",
            created_by=self.owner,
            is_active=True,
        )
        response = json_post(
            self.client,
            "/api/document/share_token/revoke/",
            {"token_id": token.id},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        token.refresh_from_db()
        self.assertFalse(token.is_active)

    def test_revoke_token_for_non_owned_doc_returns_failure(self):
        other_doc = Document.objects.create(
            owner=self.other, template=self.template
        )
        token = ShareToken.objects.create(
            document=other_doc,
            rights="read",
            created_by=self.other,
            is_active=True,
        )
        response = json_post(
            self.client,
            "/api/document/share_token/revoke/",
            {"token_id": token.id},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["success"])
        # Token should still be active
        token.refresh_from_db()
        self.assertTrue(token.is_active)

    def test_list_tokens_for_non_owned_doc_returns_403(self):
        other_doc = Document.objects.create(
            owner=self.other, template=self.template
        )
        response = json_post(
            self.client,
            "/api/document/share_token/list/",
            {"document_id": other_doc.id},
        )
        self.assertEqual(response.status_code, 403)

    def test_revoked_token_not_in_list(self):
        ShareToken.objects.create(
            document=self.doc,
            rights="read",
            created_by=self.owner,
            is_active=False,
        )
        response = json_post(
            self.client,
            "/api/document/share_token/list/",
            {"document_id": self.doc.id},
        )
        data = response.json()
        self.assertEqual(len(data["tokens"]), 0)


@override_settings(EDITOR_SAVE_MODE="direct")
class SaveDocumentViewTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.owner = User.objects.create_user(
            username="savedocuser", password="pass"
        )
        self.other = User.objects.create_user(
            username="othersavedocuser", password="pass"
        )
        self.template = DocumentTemplate.objects.create(
            title="Default Template", content={}
        )
        self.client.force_login(self.owner)

    def test_save_own_document(self):
        doc = Document.objects.create(
            owner=self.owner,
            template=self.template,
            content={"type": "doc", "content": [{"type": "title"}]},
            comments={},
            bibliography={},
            title="Old Title",
            version=0,
        )
        response = json_post(
            self.client,
            "/api/document/save/",
            {
                "id": doc.id,
                "content": {
                    "type": "doc",
                    "content": [
                        {"type": "title", "content": [{"text": "New Title"}]}
                    ],
                },
                "comments": {"1": {"comment": "hello"}},
                "bibliography": {"1": {"bib_type": "article"}},
                "title": "New Title",
                "version": 0,
            },
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["version"], 1)
        doc.refresh_from_db()
        self.assertEqual(doc.title, "New Title")
        self.assertEqual(doc.version, 1)
        self.assertEqual(doc.comments, {"1": {"comment": "hello"}})
        self.assertEqual(doc.bibliography, {"1": {"bib_type": "article"}})

    def test_save_document_with_write_access(self):
        from document.models import AccessRight

        doc = Document.objects.create(
            owner=self.other,
            template=self.template,
            content={"type": "doc", "content": [{"type": "title"}]},
            comments={},
            bibliography={},
            title="Old",
            version=0,
        )
        AccessRight.objects.create(
            document=doc, holder_obj=self.owner, rights="write"
        )
        response = json_post(
            self.client,
            "/api/document/save/",
            {
                "id": doc.id,
                "content": {"type": "doc", "content": [{"type": "title"}]},
                "comments": {},
                "bibliography": {},
                "title": "Updated",
                "version": 0,
            },
        )
        self.assertEqual(response.status_code, 200)
        doc.refresh_from_db()
        self.assertEqual(doc.title, "Updated")

    def test_cannot_save_without_access(self):
        doc = Document.objects.create(
            owner=self.other,
            template=self.template,
            content={"type": "doc", "content": [{"type": "title"}]},
            title="Old",
            version=0,
        )
        response = json_post(
            self.client,
            "/api/document/save/",
            {
                "id": doc.id,
                "content": {"type": "doc", "content": [{"type": "title"}]},
                "comments": {},
                "bibliography": {},
                "title": "Updated",
                "version": 0,
            },
        )
        self.assertEqual(response.status_code, 403)
        doc.refresh_from_db()
        self.assertEqual(doc.title, "Old")

    def test_save_nonexistent_document_returns_404(self):
        response = json_post(
            self.client,
            "/api/document/save/",
            {
                "id": 99999,
                "content": {"type": "doc"},
                "comments": {},
                "bibliography": {},
                "title": "X",
                "version": 0,
            },
        )
        self.assertEqual(response.status_code, 404)

    def test_save_with_version_conflict_returns_409(self):
        doc = Document.objects.create(
            owner=self.owner,
            template=self.template,
            content={"type": "doc", "content": [{"type": "title"}]},
            title="Test",
            version=5,
        )
        response = json_post(
            self.client,
            "/api/document/save/",
            {
                "id": doc.id,
                "content": {"type": "doc"},
                "comments": {},
                "bibliography": {},
                "title": "X",
                "version": 3,
            },
        )
        self.assertEqual(response.status_code, 409)
        data = response.json()
        self.assertEqual(data["version"], 5)

    def test_two_users_editing_same_document_conflict(self):
        from user.models import User

        user_a = User.objects.create_user(username="user_a", password="pass")
        user_b = User.objects.create_user(username="user_b", password="pass")
        doc = Document.objects.create(
            owner=user_a,
            template=self.template,
            content={"type": "doc", "content": [{"type": "title"}]},
            title="Original",
            version=0,
        )
        AccessRight.objects.create(
            document=doc, holder_obj=user_b, rights="write"
        )

        # User A saves first
        client_a = Client()
        client_a.force_login(user_a)
        response_a = json_post(
            client_a,
            "/api/document/save/",
            {
                "id": doc.id,
                "content": {
                    "type": "doc",
                    "content": [
                        {"type": "title", "content": [{"text": "User A"}]}
                    ],
                },
                "comments": {},
                "bibliography": {},
                "title": "User A Title",
                "version": 0,
            },
        )
        self.assertEqual(response_a.status_code, 200)

        # User B tries to save with stale version
        client_b = Client()
        client_b.force_login(user_b)
        response_b = json_post(
            client_b,
            "/api/document/save/",
            {
                "id": doc.id,
                "content": {
                    "type": "doc",
                    "content": [
                        {"type": "title", "content": [{"text": "User B"}]}
                    ],
                },
                "comments": {},
                "bibliography": {},
                "title": "User B Title",
                "version": 0,
            },
        )
        self.assertEqual(response_b.status_code, 409)
        data_b = response_b.json()
        self.assertEqual(data_b["version"], 1)

        # User B can save after fetching the current version
        response_b2 = json_post(
            client_b,
            "/api/document/save/",
            {
                "id": doc.id,
                "content": {
                    "type": "doc",
                    "content": [
                        {
                            "type": "title",
                            "content": [{"text": "User B merged"}],
                        }
                    ],
                },
                "comments": {},
                "bibliography": {},
                "title": "User B Title",
                "version": 1,
            },
        )
        self.assertEqual(response_b2.status_code, 200)
        doc.refresh_from_db()
        self.assertEqual(doc.version, 2)


class SaveDocumentBlockedInCollaborativeModeTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.owner = User.objects.create_user(
            username="collabsaveuser", password="pass"
        )
        self.client.force_login(self.owner)
        self.template = DocumentTemplate.objects.create(
            title="Default Template", content={}
        )
        self.doc = Document.objects.create(
            owner=self.owner, template=self.template, title="Test", version=0
        )

    @override_settings(EDITOR_SAVE_MODE="collaborative")
    def test_save_document_blocked_when_collaborative_enabled(self):
        response = json_post(
            self.client,
            "/api/document/save/",
            {
                "id": self.doc.id,
                "content": {"type": "doc"},
                "comments": {},
                "bibliography": {},
                "title": "X",
                "version": 0,
            },
        )
        self.assertEqual(response.status_code, 403)
        data = response.json()
        self.assertIn("error", data)


class RequestAccessViewTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.owner = User.objects.create_user(
            username="raowner", password="pass"
        )
        self.requester = User.objects.create_user(
            username="rarequester", password="pass"
        )
        self.template = DocumentTemplate.objects.create(
            title="Default Template", content={}
        )
        self.doc = Document.objects.create(
            owner=self.owner, template=self.template, title="Test"
        )

    def test_request_access_for_existing_document(self):
        self.client.force_login(self.requester)
        response = json_post(
            self.client,
            "/api/document/request_access/",
            {"document_id": self.doc.id, "rights": "write"},
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.json()["success"])

    def test_request_access_for_nonexistent_document_does_not_reveal_existence(
        self,
    ):
        self.client.force_login(self.requester)
        response = json_post(
            self.client,
            "/api/document/request_access/",
            {"document_id": 999999, "rights": "write"},
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.json()["success"])

    def test_request_access_by_owner_does_not_reveal_ownership(self):
        self.client.force_login(self.owner)
        response = json_post(
            self.client,
            "/api/document/request_access/",
            {"document_id": self.doc.id, "rights": "write"},
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.json()["success"])

    def test_request_access_when_already_has_access_does_not_reveal_access(
        self,
    ):
        from django.contrib.contenttypes.models import ContentType

        user_type = ContentType.objects.get_for_model(User)
        AccessRight.objects.create(
            document=self.doc,
            holder_type=user_type,
            holder_id=self.requester.id,
            rights="read",
        )
        self.client.force_login(self.requester)
        response = json_post(
            self.client,
            "/api/document/request_access/",
            {"document_id": self.doc.id, "rights": "write"},
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.json()["success"])

    def test_request_access_by_guest_is_rejected(self):
        response = json_post(
            self.client,
            "/api/document/request_access/",
            {"document_id": self.doc.id, "rights": "write"},
        )
        self.assertEqual(response.status_code, 302)

    def test_request_access_with_invalid_rights(self):
        self.client.force_login(self.requester)
        response = json_post(
            self.client,
            "/api/document/request_access/",
            {"document_id": self.doc.id, "rights": "admin"},
        )
        self.assertEqual(response.status_code, 400)


class GetRevisionViewTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.owner = User.objects.create_user(
            username="revisionuser", password="pass"
        )
        self.other = User.objects.create_user(
            username="revisionother", password="pass"
        )
        self.template = DocumentTemplate.objects.create(
            title="Default Template", content={}
        )
        self.doc = Document.objects.create(
            owner=self.owner, template=self.template, title="Test"
        )
        self.revision = DocumentRevision.objects.create(
            document=self.doc,
            note="first",
            file_object=SimpleUploadedFile(
                "mydoc.fidus",
                b"PK\x03\x04fidus",
                content_type="application/zip",
            ),
        )
        self.client.force_login(self.owner)

    def test_owner_downloads_revision(self):
        response = self.client.get(
            f"/api/document/get_revision/{self.revision.id}/"
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("application/zip", response["Content-Type"])

    def test_unauthenticated_cannot_download_revision(self):
        anonymous = Client()
        response = anonymous.get(
            f"/api/document/get_revision/{self.revision.id}/"
        )
        self.assertEqual(response.status_code, 302)

    def test_revision_file_stored_in_app_storage(self):
        name = self.revision.file_object.name
        self.assertTrue(name.startswith("document-revisions/"))
        self.assertTrue(
            os.path.isfile(os.path.join(settings.APP_STORAGE_ROOT, name))
        )
        self.assertFalse(
            os.path.isfile(os.path.join(settings.MEDIA_ROOT, name))
        )

    def test_legacy_file_in_media_folder_is_moved_on_download(self):
        name = self.revision.file_object.name
        current_path = self.revision.file_object.storage.path(name)
        legacy_dir = os.path.join(settings.MEDIA_ROOT, "document-revisions")
        os.makedirs(legacy_dir, exist_ok=True)
        legacy_path = os.path.join(legacy_dir, name.split("/")[-1])
        os.remove(current_path)
        with open(legacy_path, "wb") as f:
            f.write(b"PK\x03\x04legacy")
        response = self.client.get(
            f"/api/document/get_revision/{self.revision.id}/"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"PK\x03\x04legacy")
        self.assertTrue(os.path.isfile(current_path))
        self.assertFalse(os.path.isfile(legacy_path))

    def test_legacy_file_with_bare_name_is_moved_on_download(self):
        name = self.revision.file_object.name
        bare_name = name.split("/")[-1]
        current_path = self.revision.file_object.storage.path(name)
        os.remove(current_path)
        DocumentRevision.objects.filter(pk=self.revision.pk).update(
            file_object=bare_name
        )
        legacy_path = os.path.join(settings.MEDIA_ROOT, bare_name)
        with open(legacy_path, "wb") as f:
            f.write(b"PK\x03\x04bare")
        response = self.client.get(
            f"/api/document/get_revision/{self.revision.id}/"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"PK\x03\x04bare")
        self.assertTrue(
            os.path.isfile(os.path.join(settings.APP_STORAGE_ROOT, bare_name))
        )
        self.assertFalse(os.path.isfile(legacy_path))

    def test_missing_revision_file_returns_404(self):
        name = self.revision.file_object.name
        os.remove(self.revision.file_object.storage.path(name))
        response = self.client.get(
            f"/api/document/get_revision/{self.revision.id}/"
        )
        self.assertEqual(response.status_code, 404)


class MoveRevisionsToAppStorageTest(TestCase):
    """Tests for the data migration moving revision files."""

    def setUp(self):
        self.owner = User.objects.create_user(
            username="migrationuser", password="pass"
        )
        self.template = DocumentTemplate.objects.create(
            title="Default Template", content={}
        )
        self.doc = Document.objects.create(
            owner=self.owner, template=self.template, title="Test"
        )
        self.media_root = tempfile.mkdtemp()
        self.app_storage_root = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.media_root, ignore_errors=True)
        shutil.rmtree(self.app_storage_root, ignore_errors=True)

    def _create_revision_row(self, name):
        revision = DocumentRevision.objects.create(
            document=self.doc, note="", file_object=""
        )
        DocumentRevision.objects.filter(pk=revision.pk).update(
            file_object=name
        )
        return revision

    def _run_migration(self):
        class AppsShim:
            @staticmethod
            def get_model(app_label, model_name):
                return DocumentRevision

        with override_settings(
            MEDIA_ROOT=self.media_root,
            APP_STORAGE_ROOT=self.app_storage_root,
        ):
            move_revisions_to_app_storage(AppsShim, None)

    def test_moves_prefixed_and_bare_files(self):
        self._create_revision_row("document-revisions/11.fidus")
        self._create_revision_row("12.fidus")
        legacy_dir = os.path.join(self.media_root, "document-revisions")
        os.makedirs(legacy_dir)
        with open(os.path.join(legacy_dir, "11.fidus"), "wb") as f:
            f.write(b"data11")
        with open(os.path.join(self.media_root, "12.fidus"), "wb") as f:
            f.write(b"data12")
        self._run_migration()
        self.assertEqual(
            open(
                os.path.join(
                    self.app_storage_root, "document-revisions", "11.fidus"
                ),
                "rb",
            ).read(),
            b"data11",
        )
        self.assertEqual(
            open(os.path.join(self.app_storage_root, "12.fidus"), "rb").read(),
            b"data12",
        )
        self.assertFalse(os.path.exists(legacy_dir))

    def test_migration_is_idempotent(self):
        self._create_revision_row("document-revisions/13.fidus")
        legacy_dir = os.path.join(self.media_root, "document-revisions")
        os.makedirs(legacy_dir)
        with open(os.path.join(legacy_dir, "13.fidus"), "wb") as f:
            f.write(b"data13")
        self._run_migration()
        self._run_migration()
        self.assertEqual(
            open(
                os.path.join(
                    self.app_storage_root, "document-revisions", "13.fidus"
                ),
                "rb",
            ).read(),
            b"data13",
        )

    def test_missing_files_are_tolerated(self):
        self._create_revision_row("document-revisions/14.fidus")
        self._run_migration()

    def test_leftover_orphan_files_are_moved_out_of_media(self):
        self._create_revision_row("document-revisions/15.fidus")
        legacy_dir = os.path.join(self.media_root, "document-revisions")
        os.makedirs(legacy_dir)
        with open(os.path.join(legacy_dir, "15.fidus"), "wb") as f:
            f.write(b"live")
        # Orphaned files without a database row, in both possible locations:
        with open(os.path.join(legacy_dir, "16.fidus"), "wb") as f:
            f.write(b"orphan1")
        with open(os.path.join(self.media_root, "17.fidus"), "wb") as f:
            f.write(b"orphan2")
        self._run_migration()
        orphan_dir = os.path.join(self.app_storage_root, "orphaned-revisions")
        self.assertFalse(os.path.exists(legacy_dir))
        self.assertEqual(
            open(os.path.join(orphan_dir, "16.fidus"), "rb").read(),
            b"orphan1",
        )
        self.assertEqual(
            open(os.path.join(orphan_dir, "17.fidus"), "rb").read(),
            b"orphan2",
        )
        # The referenced file is moved into the revision storage, not the
        # orphan folder.
        self.assertEqual(
            open(
                os.path.join(
                    self.app_storage_root, "document-revisions", "15.fidus"
                ),
                "rb",
            ).read(),
            b"live",
        )
        self.assertFalse(os.path.exists(os.path.join(orphan_dir, "15.fidus")))


class CleanupRevisionsCommandTest(TestCase):
    """Tests for the cleanup_revisions management command."""

    def setUp(self):
        self.owner = User.objects.create_user(
            username="cleanupuser", password="pass"
        )
        self.template = DocumentTemplate.objects.create(
            title="Default Template", content={}
        )
        self.doc = Document.objects.create(
            owner=self.owner, template=self.template, title="Test"
        )
        self.media_root = tempfile.mkdtemp()
        self.app_storage_root = tempfile.mkdtemp()
        self.override = override_settings(
            MEDIA_ROOT=self.media_root,
            APP_STORAGE_ROOT=self.app_storage_root,
        )
        self.override.enable()

    def tearDown(self):
        self.override.disable()
        shutil.rmtree(self.media_root, ignore_errors=True)
        shutil.rmtree(self.app_storage_root, ignore_errors=True)

    def _write(self, path, content=b"x"):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as f:
            f.write(content)

    def _create_revision_row(self, name):
        revision = DocumentRevision.objects.create(
            document=self.doc, note="", file_object=""
        )
        DocumentRevision.objects.filter(pk=revision.pk).update(
            file_object=name
        )
        return revision

    def test_default_moves_unreferenced_files_to_orphan_folder(self):
        self._create_revision_row("document-revisions/31.fidus")
        # Referenced file in app storage: keep.
        self._write(
            os.path.join(
                self.app_storage_root, "document-revisions", "31.fidus"
            )
        )
        # Referenced bare-name file in media root: keep.
        self._create_revision_row("32.fidus")
        self._write(os.path.join(self.media_root, "32.fidus"))
        # Orphans: move into the orphan folder.
        self._write(
            os.path.join(self.media_root, "document-revisions", "41.fidus")
        )
        self._write(os.path.join(self.media_root, "42.fidus"))
        self._write(
            os.path.join(
                self.app_storage_root, "document-revisions", "43.fidus"
            )
        )
        # Non-fidus files are never touched.
        self._write(os.path.join(self.media_root, "image.png"))
        out = StringIO()
        call_command("cleanup_revisions", stdout=out)
        orphan_dir = os.path.join(self.app_storage_root, "orphaned-revisions")
        self.assertTrue(
            os.path.isfile(
                os.path.join(
                    self.app_storage_root, "document-revisions", "31.fidus"
                )
            )
        )
        self.assertTrue(
            os.path.isfile(os.path.join(self.media_root, "32.fidus"))
        )
        for file_name in ["41.fidus", "42.fidus", "43.fidus"]:
            self.assertTrue(
                os.path.isfile(os.path.join(orphan_dir, file_name))
            )
        self.assertTrue(
            os.path.isfile(os.path.join(self.media_root, "image.png"))
        )
        self.assertIn("Moved 3 orphaned", out.getvalue())
        # A second run finds nothing new to move.
        out2 = StringIO()
        call_command("cleanup_revisions", stdout=out2)
        self.assertIn("No orphaned revision files found", out2.getvalue())

    def test_delete_only_considers_orphan_folder(self):
        # An orphan outside the orphan folder is NOT touched by --delete.
        self._write(
            os.path.join(self.media_root, "document-revisions", "61.fidus")
        )
        out = StringIO()
        call_command("cleanup_revisions", "--delete", stdout=out)
        self.assertIn("Nothing to delete", out.getvalue())
        self.assertTrue(
            os.path.isfile(
                os.path.join(self.media_root, "document-revisions", "61.fidus")
            )
        )

    def test_delete_prompts_and_aborts_on_no(self):
        self._write(
            os.path.join(self.media_root, "document-revisions", "71.fidus")
        )
        call_command("cleanup_revisions", stdout=StringIO())
        out = StringIO()
        with patch("sys.stdin", StringIO("no\n")):
            call_command("cleanup_revisions", "--delete", stdout=out)
        self.assertIn("WARNING", out.getvalue())
        self.assertIn("Aborted", out.getvalue())
        # Nothing was deleted.
        self.assertTrue(
            os.path.isfile(
                os.path.join(
                    self.app_storage_root, "orphaned-revisions", "71.fidus"
                )
            )
        )

    def test_delete_prompts_and_deletes_on_yes(self):
        self._write(
            os.path.join(self.media_root, "document-revisions", "72.fidus")
        )
        call_command("cleanup_revisions", stdout=StringIO())
        out = StringIO()
        with patch("sys.stdin", StringIO("yes\n")):
            call_command("cleanup_revisions", "--delete", stdout=out)
        self.assertIn("Deleted 1 orphaned", out.getvalue())
        self.assertFalse(
            os.path.isfile(
                os.path.join(
                    self.app_storage_root, "orphaned-revisions", "72.fidus"
                )
            )
        )

    def test_delete_prompt_aborts_on_eof(self):
        self._write(
            os.path.join(self.media_root, "document-revisions", "73.fidus")
        )
        call_command("cleanup_revisions", stdout=StringIO())
        out = StringIO()
        with patch("sys.stdin", StringIO("")):
            call_command("cleanup_revisions", "--delete", stdout=out)
        self.assertIn("Aborted", out.getvalue())
        self.assertTrue(
            os.path.isfile(
                os.path.join(
                    self.app_storage_root, "orphaned-revisions", "73.fidus"
                )
            )
        )

    def test_delete_with_confirm_removes_orphan_folder(self):
        self._write(
            os.path.join(self.media_root, "document-revisions", "81.fidus")
        )
        call_command("cleanup_revisions", stdout=StringIO())
        out = StringIO()
        call_command("cleanup_revisions", "--delete", "--confirm", stdout=out)
        self.assertIn("Deleted 1 orphaned", out.getvalue())
        self.assertFalse(
            os.path.isfile(
                os.path.join(
                    self.app_storage_root, "orphaned-revisions", "81.fidus"
                )
            )
        )

    def test_confirm_requires_delete(self):
        with self.assertRaises(CommandError):
            call_command("cleanup_revisions", "--confirm", stdout=StringIO())


class RevisionFileDeletionTest(TestCase):
    """Deleting a revision must remove its file from the revision storage."""

    def setUp(self):
        self.owner = User.objects.create_user(
            username="deletionuser", password="pass"
        )
        self.template = DocumentTemplate.objects.create(
            title="Default Template", content={}
        )
        self.doc = Document.objects.create(
            owner=self.owner, template=self.template, title="Test"
        )
        self.revision = DocumentRevision.objects.create(
            document=self.doc,
            note="first",
            file_object=SimpleUploadedFile(
                "rev.fidus",
                b"PK\x03\x04fidus",
                content_type="application/zip",
            ),
        )

    def _file_path(self, revision):
        return revision.file_object.storage.path(revision.file_object.name)

    def test_deleting_revision_removes_file(self):
        path = self._file_path(self.revision)
        self.assertTrue(os.path.isfile(path))
        with self.captureOnCommitCallbacks(execute=True):
            self.revision.delete()
        self.assertFalse(os.path.isfile(path))
        self.assertFalse(
            DocumentRevision.objects.filter(pk=self.revision.pk).exists()
        )

    def test_deleting_document_removes_revision_files(self):
        path = self._file_path(self.revision)
        self.assertTrue(os.path.isfile(path))
        with self.captureOnCommitCallbacks(execute=True):
            self.doc.delete()
        self.assertFalse(os.path.isfile(path))

    def test_deleting_revision_without_file_does_not_error(self):
        revision = DocumentRevision.objects.create(
            document=self.doc, note="", file_object=""
        )
        with self.captureOnCommitCallbacks(execute=True):
            revision.delete()
        self.assertFalse(
            DocumentRevision.objects.filter(pk=revision.pk).exists()
        )


# ---------------------------------------------------------------------------


class AuditTrailDocumentTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.owner = User.objects.create_user(
            username="audit_owner", password="pass"
        )
        self.template = DocumentTemplate.objects.create(
            title="Audit Template", content={}
        )
        self.doc = Document.objects.create(
            owner=self.owner, template=self.template
        )
        self.client.force_login(self.owner)

    def test_share_token_create_and_revoke_logged(self):
        response = json_post(
            self.client,
            "/api/document/share_token/create/",
            {"document_id": self.doc.id, "rights": "read"},
        )
        self.assertEqual(response.status_code, 201)
        token = ShareToken.objects.get(document=self.doc)
        json_post(
            self.client,
            "/api/document/share_token/revoke/",
            {"token_id": token.id},
        )
        create_entries = AuditLog.objects.filter(
            action="share_token.create",
            target_type="document",
            target_id=str(self.doc.id),
            outcome="success",
        )
        self.assertTrue(create_entries.exists())
        # Token value must not appear anywhere in the entry
        for entry in create_entries:
            self.assertNotIn(str(token.token), json.dumps(entry.new_state))
        self.assertTrue(
            AuditLog.objects.filter(
                action="share_token.revoke",
                target_type="document",
                new_state__token_id=token.id,
            ).exists()
        )

    def test_access_rights_change_logged_with_state(self):
        reader = User.objects.create_user(
            username="audit_reader", password="pass"
        )
        json_post(
            self.client,
            "/api/document/save_access_rights/",
            {
                "document_ids": [self.doc.id],
                "access_rights": [
                    {
                        "holder": {"type": "user", "id": reader.id},
                        "rights": "read",
                    }
                ],
            },
        )
        entry = AuditLog.objects.filter(
            action="access_rights.change",
            target_type="document",
            target_id=str(self.doc.id),
        ).first()
        self.assertIsNotNone(entry)
        self.assertEqual(entry.old_state, [])
        self.assertEqual(
            entry.new_state,
            [
                {
                    "holder_type": "user",
                    "holder_id": reader.id,
                    "rights": "read",
                }
            ],
        )

    def test_revision_delete_logged(self):
        revision = DocumentRevision.objects.create(document=self.doc)
        response = json_post(
            self.client,
            "/api/document/delete_revision/",
            {"id": revision.id},
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            AuditLog.objects.filter(
                action="revision.delete",
                target_type="document",
                new_state__revision_id=revision.id,
            ).exists()
        )

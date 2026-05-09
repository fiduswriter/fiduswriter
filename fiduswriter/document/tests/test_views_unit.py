"""Unit tests for document views that don't require a browser."""

import json
import base64
from django.test import TestCase, Client, override_settings

from user.models import User, UserEncryptionKey
from document.models import (
    AccessRight,
    Document,
    DocumentTemplate,
    DocumentEncryptionKey,
    ShareToken,
)
from document.views import _handle_automatic_key_sharing


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


@override_settings(COLLABORATIVE_EDITING=False)
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

    @override_settings(COLLABORATIVE_EDITING=True)
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

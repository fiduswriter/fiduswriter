"""Unit tests for document helper modules."""

import uuid
from datetime import timedelta
from django.test import TestCase
from django.utils import timezone

from user.models import User
from document.models import Document, DocumentTemplate, ShareToken
from document.helpers.token_access import get_token_access


class GetTokenAccessTest(TestCase):
    """Tests for the get_token_access() helper function."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="tokenowner", password="pass"
        )
        self.template = DocumentTemplate.objects.create(
            title="Template", content={}
        )
        self.doc = Document.objects.create(
            owner=self.user, template=self.template
        )

    def test_valid_active_token_returns_document_and_rights(self):
        token = ShareToken.objects.create(
            document=self.doc,
            rights="read",
            created_by=self.user,
            is_active=True,
        )
        document, rights = get_token_access(str(token.token))
        self.assertEqual(document.id, self.doc.id)
        self.assertEqual(rights, "read")

    def test_inactive_token_returns_none_none(self):
        token = ShareToken.objects.create(
            document=self.doc,
            rights="read",
            created_by=self.user,
            is_active=False,
        )
        document, rights = get_token_access(str(token.token))
        self.assertIsNone(document)
        self.assertIsNone(rights)

    def test_nonexistent_token_returns_none_none(self):
        fake_token = str(uuid.uuid4())
        document, rights = get_token_access(fake_token)
        self.assertIsNone(document)
        self.assertIsNone(rights)

    def test_expired_token_returns_none_none(self):
        expired_time = timezone.now() - timedelta(days=1)
        token = ShareToken.objects.create(
            document=self.doc,
            rights="write",
            created_by=self.user,
            is_active=True,
            expires_at=expired_time,
        )
        document, rights = get_token_access(str(token.token))
        self.assertIsNone(document)
        self.assertIsNone(rights)

    def test_future_expiry_token_is_valid(self):
        future_time = timezone.now() + timedelta(days=30)
        token = ShareToken.objects.create(
            document=self.doc,
            rights="comment",
            created_by=self.user,
            is_active=True,
            expires_at=future_time,
        )
        document, rights = get_token_access(str(token.token))
        self.assertIsNotNone(document)
        self.assertEqual(rights, "comment")

    def test_token_with_no_expiry_is_always_valid(self):
        token = ShareToken.objects.create(
            document=self.doc,
            rights="read",
            created_by=self.user,
            is_active=True,
            expires_at=None,
        )
        document, rights = get_token_access(str(token.token))
        self.assertIsNotNone(document)
        self.assertEqual(rights, "read")

    def test_returns_correct_rights_for_write(self):
        token = ShareToken.objects.create(
            document=self.doc,
            rights="write",
            created_by=self.user,
            is_active=True,
        )
        document, rights = get_token_access(str(token.token))
        self.assertEqual(rights, "write")

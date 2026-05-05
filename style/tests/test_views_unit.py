"""Unit tests for style views.

Covers:
  - delete_document_style  (guards, success, staff bypass)
  - save_document_style    (create → 201, update → 200)
  - delete_export_template (success)
"""

import json

from django.test import TestCase, Client

from document.models import DocumentTemplate
from style.models import DocumentStyle, ExportTemplate
from user.models import User


AJAX_HEADERS = {"HTTP_X_REQUESTED_WITH": "XMLHttpRequest"}


def json_post(client, url, data):
    return client.post(
        url,
        json.dumps(data),
        content_type="application/json",
        **AJAX_HEADERS,
    )


# ---------------------------------------------------------------------------
# DocumentStyle views
# ---------------------------------------------------------------------------


class DocumentStyleViewsTest(TestCase):
    """Tests for delete_document_style and save_document_style."""

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="styleuser",
            email="styleuser@example.com",
            password="testpass",
        )
        self.template = DocumentTemplate.objects.create(
            title="My Template",
            user=self.user,
        )
        # One style on the template — used as the baseline throughout.
        self.style = DocumentStyle.objects.create(
            title="Default Style",
            slug="default",
            contents="body { font-size: 12pt; }",
            document_template=self.template,
        )
        self.client.force_login(self.user)

    # ------------------------------------------------------------------
    # delete_document_style
    # ------------------------------------------------------------------

    def test_delete_document_style_last_style_returns_400(self):
        """Attempting to delete the only style on a template returns 400."""
        response = json_post(
            self.client,
            "/api/style/delete_document_style/",
            {"id": self.style.id},
        )
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn("errors", data)
        self.assertIn("template", data["errors"])
        # The style must still exist in the database.
        self.assertTrue(
            DocumentStyle.objects.filter(id=self.style.id).exists()
        )

    def test_delete_document_style_success(self):
        """With 2 styles present, deleting one returns 200 and removes it."""
        second = DocumentStyle.objects.create(
            title="Secondary Style",
            slug="secondary",
            contents="body { font-size: 10pt; }",
            document_template=self.template,
        )
        response = json_post(
            self.client,
            "/api/style/delete_document_style/",
            {"id": second.id},
        )
        self.assertEqual(response.status_code, 200)
        # Deleted style is gone.
        self.assertFalse(DocumentStyle.objects.filter(id=second.id).exists())
        # Original style is untouched.
        self.assertTrue(
            DocumentStyle.objects.filter(id=self.style.id).exists()
        )

    def test_delete_document_style_staff_can_delete_any(self):
        """A staff user can delete a style owned by a different user's template."""
        # Give the template a second style so the "last style" guard doesn't fire.
        DocumentStyle.objects.create(
            title="Extra Style",
            slug="extra",
            contents="",
            document_template=self.template,
        )

        staff = User.objects.create_user(
            username="staffmember",
            email="staff@example.com",
            password="staffpass",
            is_staff=True,
        )
        staff_client = Client()
        staff_client.force_login(staff)

        response = json_post(
            staff_client,
            "/api/style/delete_document_style/",
            {"id": self.style.id},
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(
            DocumentStyle.objects.filter(id=self.style.id).exists()
        )

    # ------------------------------------------------------------------
    # save_document_style
    # ------------------------------------------------------------------

    def test_save_document_style_create(self):
        """Posting with id=0 creates a new DocumentStyle and returns 201."""
        response = json_post(
            self.client,
            "/api/style/save_document_style/",
            {
                "template_id": self.template.id,
                "id": 0,
                "title": "New Style",
                "slug": "new-style",
                "contents": "h1 { color: blue; }",
            },
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(
            DocumentStyle.objects.filter(
                title="New Style",
                slug="new-style",
                document_template=self.template,
            ).exists()
        )
        # Response body should contain the serialised style.
        data = response.json()
        self.assertIn("doc_style", data)

    def test_save_document_style_update(self):
        """Posting with an existing id updates the style and returns 200."""
        response = json_post(
            self.client,
            "/api/style/save_document_style/",
            {
                "template_id": self.template.id,
                "id": self.style.id,
                "title": "Updated Title",
                "slug": "default",  # unchanged slug keeps unique constraint happy
                "contents": "body { color: green; }",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.style.refresh_from_db()
        self.assertEqual(self.style.title, "Updated Title")
        self.assertEqual(self.style.contents, "body { color: green; }")


# ---------------------------------------------------------------------------
# ExportTemplate views
# ---------------------------------------------------------------------------


class ExportTemplateViewsTest(TestCase):
    """Tests for delete_export_template."""

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="exportuser",
            email="export@example.com",
            password="exportpass",
        )
        self.template = DocumentTemplate.objects.create(
            title="Export Owner Template",
            user=self.user,
        )
        # Create the ExportTemplate record directly using a string path for
        # the FileField so that no real file write occurs during the test.
        self.export_template = ExportTemplate.objects.create(
            document_template=self.template,
            template_file="export-template-files/test.docx",
            file_type="docx",
            title="test",
        )
        self.client.force_login(self.user)

    def test_delete_export_template(self):
        """Deleting an existing ExportTemplate returns 200 and removes it."""
        response = json_post(
            self.client,
            "/api/style/delete_export_template/",
            {"id": self.export_template.id},
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(
            ExportTemplate.objects.filter(id=self.export_template.id).exists()
        )

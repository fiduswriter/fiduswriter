"""Unit tests for style views (no Selenium required)."""

import json

from django.test import Client, TestCase

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
# Helpers
# ---------------------------------------------------------------------------


def make_user(username):
    return User.objects.create_user(username=username, password="pass")


def make_template(user, title="Test Template"):
    return DocumentTemplate.objects.create(title=title, user=user, content={})


def make_style(template, title="Default Style", slug="default"):
    return DocumentStyle.objects.create(
        title=title,
        slug=slug,
        contents="body { color: red; }",
        document_template=template,
    )


# ---------------------------------------------------------------------------
# DocumentStyle views
# ---------------------------------------------------------------------------


class DocumentStyleViewsTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = make_user("style_user")
        self.client.force_login(self.user)
        self.template = make_template(self.user)
        self.style = make_style(self.template)

    # ------------------------------------------------------------------
    # delete_document_style
    # ------------------------------------------------------------------

    def test_delete_document_style_last_style_returns_400(self):
        """Deleting the only style on a template is blocked (returns 400)."""
        response = json_post(
            self.client,
            "/api/style/delete_document_style/",
            {"id": self.style.id},
        )

        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn("errors", data)
        # Style must still exist.
        self.assertTrue(
            DocumentStyle.objects.filter(id=self.style.id).exists()
        )

    def test_delete_document_style_success(self):
        """With 2 styles on a template, one can be deleted (returns 200)."""
        second_style = make_style(
            self.template, title="Second Style", slug="second"
        )

        response = json_post(
            self.client,
            "/api/style/delete_document_style/",
            {"id": second_style.id},
        )

        self.assertEqual(response.status_code, 200)
        self.assertFalse(
            DocumentStyle.objects.filter(id=second_style.id).exists()
        )
        # The first style must still be there.
        self.assertTrue(
            DocumentStyle.objects.filter(id=self.style.id).exists()
        )

    def test_delete_document_style_staff_can_delete_any(self):
        """Staff users can delete styles regardless of template ownership."""
        other_user = make_user("other_style_user")
        other_template = make_template(other_user, title="Other Template")
        other_style1 = make_style(
            other_template, title="Style A", slug="style-a"
        )
        make_style(other_template, title="Style B", slug="style-b")

        # Log in as staff.
        staff = make_user("staff_user")
        staff.is_staff = True
        staff.save()
        self.client.force_login(staff)

        response = json_post(
            self.client,
            "/api/style/delete_document_style/",
            {"id": other_style1.id},
        )

        self.assertEqual(response.status_code, 200)
        self.assertFalse(
            DocumentStyle.objects.filter(id=other_style1.id).exists()
        )

    # ------------------------------------------------------------------
    # save_document_style
    # ------------------------------------------------------------------

    def test_save_document_style_create(self):
        """id=0 creates a new DocumentStyle and returns 201."""
        response = json_post(
            self.client,
            "/api/style/save_document_style/",
            {
                "template_id": self.template.id,
                "id": 0,
                "title": "Brand New Style",
                "slug": "brand-new",
                "contents": "h1 { color: blue; }",
            },
        )

        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertIn("doc_style", data)
        self.assertTrue(
            DocumentStyle.objects.filter(
                title="Brand New Style",
                document_template=self.template,
            ).exists()
        )

    def test_save_document_style_update(self):
        """id>0 updates an existing style and returns 200."""
        response = json_post(
            self.client,
            "/api/style/save_document_style/",
            {
                "template_id": self.template.id,
                "id": self.style.id,
                "title": "Updated Style",
                "slug": self.style.slug,
                "contents": "h2 { font-size: 2em; }",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.style.refresh_from_db()
        self.assertEqual(self.style.title, "Updated Style")
        self.assertEqual(self.style.contents, "h2 { font-size: 2em; }")


# ---------------------------------------------------------------------------
# ExportTemplate views
# ---------------------------------------------------------------------------


class ExportTemplateViewsTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = make_user("export_user")
        self.client.force_login(self.user)
        self.template = make_template(self.user)
        # Create the ExportTemplate directly with a string path (no real file
        # needed for the delete test).
        self.export_template = ExportTemplate.objects.create(
            document_template=self.template,
            template_file="export-template-files/test.docx",
            file_type="docx",
            title="Test Export Template",
        )

    def test_delete_export_template(self):
        """Deleting an owned export template returns 200 and removes it from the DB."""
        et_id = self.export_template.id

        response = json_post(
            self.client,
            "/api/style/delete_export_template/",
            {"id": et_id},
        )

        self.assertEqual(response.status_code, 200)
        self.assertFalse(ExportTemplate.objects.filter(id=et_id).exists())

    def test_delete_export_template_staff_can_delete_any(self):
        """Staff can delete export templates on templates they don't own."""
        other_user = make_user("other_export_user")
        other_template = make_template(other_user, title="Other ET Template")
        other_et = ExportTemplate.objects.create(
            document_template=other_template,
            template_file="export-template-files/other.docx",
            file_type="docx",
            title="Other Export",
        )

        staff = make_user("export_staff")
        staff.is_staff = True
        staff.save()
        self.client.force_login(staff)

        response = json_post(
            self.client,
            "/api/style/delete_export_template/",
            {"id": other_et.id},
        )

        self.assertEqual(response.status_code, 200)
        self.assertFalse(
            ExportTemplate.objects.filter(id=other_et.id).exists()
        )

"""Unit tests for user_template_manager views (no Selenium required)."""

import json

from django.contrib.auth import get_user_model
from django.test import Client, TestCase

from document.models import Document, DocumentTemplate

User = get_user_model()

AJAX_HEADERS = {"HTTP_X_REQUESTED_WITH": "XMLHttpRequest"}

BASE_URL = "/api/user_template_manager/"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def json_post(client, url, data):
    """POST JSON to a view with the AJAX header."""
    return client.post(
        url,
        json.dumps(data),
        content_type="application/json",
        **AJAX_HEADERS,
    )


def ajax_get(client, url, params=None):
    """GET a view with the AJAX header."""
    return client.get(url, params or {}, **AJAX_HEADERS)


# ---------------------------------------------------------------------------
# get_template  POST /api/user_template_manager/get/
# ---------------------------------------------------------------------------


class GetTemplateViewTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="get_tmpl_user", password="pass"
        )
        self.client.force_login(self.user)

    def test_get_template_creates_new_when_id_zero(self):
        """id=0 should create a blank template and return 201."""
        response = json_post(self.client, BASE_URL + "get/", {"id": 0})

        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertIn("id", data)
        self.assertTrue(
            DocumentTemplate.objects.filter(
                id=data["id"], user=self.user
            ).exists()
        )

    def test_get_template_returns_existing(self):
        """Fetching an existing (owned) template returns 200 with the right id."""
        template = DocumentTemplate.objects.create(
            title="My Existing Template",
            user=self.user,
        )

        response = json_post(
            self.client, BASE_URL + "get/", {"id": template.id}
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["id"], template.id)
        self.assertEqual(data["title"], "My Existing Template")

    def test_get_template_returns_405_for_unknown(self):
        """A non-existent id should return 405."""
        response = json_post(self.client, BASE_URL + "get/", {"id": 99999})

        self.assertEqual(response.status_code, 405)


# ---------------------------------------------------------------------------
# list  GET /api/user_template_manager/list/
# ---------------------------------------------------------------------------


class ListTemplatesViewTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="list_tmpl_user", password="pass"
        )
        self.client.force_login(self.user)

    def test_list_returns_document_templates(self):
        """The list endpoint returns all templates owned by (or shared with) the user."""
        DocumentTemplate.objects.create(title="Alpha", user=self.user)
        DocumentTemplate.objects.create(title="Beta", user=self.user)

        response = ajax_get(self.client, BASE_URL + "list/")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("document_templates", data)
        titles = [t["title"] for t in data["document_templates"]]
        self.assertIn("Alpha", titles)
        self.assertIn("Beta", titles)


# ---------------------------------------------------------------------------
# save  POST /api/user_template_manager/save/
# ---------------------------------------------------------------------------


class SaveTemplateViewTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="save_tmpl_user", password="pass"
        )
        self.client.force_login(self.user)
        self.template = DocumentTemplate.objects.create(
            title="Original Title",
            import_id="orig-id",
            content={"type": "doc"},
            user=self.user,
        )

    def test_save_updates_template(self):
        """Saving with valid data updates title, content and import_id; returns 200."""
        new_content = {"type": "doc", "content": []}

        response = json_post(
            self.client,
            BASE_URL + "save/",
            {
                "id": self.template.id,
                "title": "Updated Title",
                "value": new_content,
                "import_id": "updated-id",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.template.refresh_from_db()
        self.assertEqual(self.template.title, "Updated Title")
        self.assertEqual(self.template.import_id, "updated-id")
        self.assertEqual(self.template.content, new_content)

    def test_save_returns_405_for_unknown(self):
        """Saving to a non-existent id returns 405."""
        response = json_post(
            self.client,
            BASE_URL + "save/",
            {
                "id": 99999,
                "title": "Anything",
                "value": {},
                "import_id": "x",
            },
        )

        self.assertEqual(response.status_code, 405)


# ---------------------------------------------------------------------------
# create  POST /api/user_template_manager/create/
# ---------------------------------------------------------------------------


class CreateTemplateViewTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="create_tmpl_user", password="pass"
        )
        self.client.force_login(self.user)

    def _payload(self, title="My Template"):
        return {
            "title": title,
            "content": {"type": "doc"},
            "import_id": "my-tmpl",
            "document_styles": [],
            "export_templates": [],
        }

    def test_create_makes_new_template(self):
        """A valid create request returns 201 and stores a new record in the DB."""
        response = json_post(
            self.client, BASE_URL + "create/", self._payload()
        )

        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertIn("id", data)
        self.assertIn("title", data)
        self.assertIn("added", data)
        self.assertIn("updated", data)
        self.assertTrue(
            DocumentTemplate.objects.filter(
                id=data["id"], user=self.user
            ).exists()
        )

    def test_create_deduplicates_title(self):
        """When the requested title is already taken the view appends ' 1'."""
        # Pre-create a conflicting template owned by the same user.
        DocumentTemplate.objects.create(
            title="My Template",
            user=self.user,
        )

        response = json_post(
            self.client, BASE_URL + "create/", self._payload("My Template")
        )

        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["title"], "My Template 1")


# ---------------------------------------------------------------------------
# copy  POST /api/user_template_manager/copy/
# ---------------------------------------------------------------------------


class CopyTemplateViewTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="copy_tmpl_user", password="pass"
        )
        self.client.force_login(self.user)
        # content must contain attrs.template and attrs.import_id so that
        # the view can write the new title/import_id into the copy.
        self.source = DocumentTemplate.objects.create(
            title="Source Template",
            import_id="src-tmpl",
            content={
                "type": "doc",
                "attrs": {
                    "template": "Source Template",
                    "import_id": "src-tmpl",
                },
            },
            user=self.user,
        )

    def test_copy_creates_new_template(self):
        """Copying a template creates a fresh DB record with a different id."""
        response = json_post(
            self.client,
            BASE_URL + "copy/",
            {"id": self.source.id, "title": "Copy of Source"},
        )

        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertIn("id", data)
        # The copy must have a different primary key.
        self.assertNotEqual(data["id"], self.source.id)
        # The user now owns two templates.
        self.assertEqual(
            DocumentTemplate.objects.filter(user=self.user).count(), 2
        )
        # The title should match what we requested.
        self.assertEqual(data["title"], "Copy of Source")


# ---------------------------------------------------------------------------
# delete  POST /api/user_template_manager/delete/
# ---------------------------------------------------------------------------


class DeleteTemplateViewTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="delete_tmpl_user", password="pass"
        )
        self.client.force_login(self.user)

    def test_delete_owned_template(self):
        """Deleting a template with no dependents returns 200 + done=True and removes it."""
        template = DocumentTemplate.objects.create(
            title="Deletable Template",
            user=self.user,
        )

        response = json_post(
            self.client, BASE_URL + "delete/", {"id": template.id}
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["done"])
        self.assertFalse(
            DocumentTemplate.objects.filter(id=template.id).exists()
        )

    def test_delete_non_deletable_template(self):
        """When a Document references the template, done=False and it stays in the DB."""
        template = DocumentTemplate.objects.create(
            title="Pinned Template",
            user=self.user,
        )
        # Create a Document that references the template; this makes
        # template.is_deletable() return False.
        Document.objects.create(owner=self.user, template=template)

        response = json_post(
            self.client, BASE_URL + "delete/", {"id": template.id}
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["done"])
        # The template must still be in the database.
        self.assertTrue(
            DocumentTemplate.objects.filter(id=template.id).exists()
        )

    def test_delete_returns_405_for_unknown(self):
        """Attempting to delete a non-existent template returns 405."""
        response = json_post(self.client, BASE_URL + "delete/", {"id": 99999})

        self.assertEqual(response.status_code, 405)

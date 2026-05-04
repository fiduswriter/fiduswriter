"""Unit tests for bibliography views."""

import json
from django.test import TestCase, Client
from bibliography.models import Entry, EntryCategory
from user.models import User


AJAX_HEADERS = {"HTTP_X_REQUESTED_WITH": "XMLHttpRequest"}


def json_post(client, url, data):
    return client.post(
        url,
        json.dumps(data),
        content_type="application/json",
        **AJAX_HEADERS,
    )


class BiblistViewTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="bibuser", password="pass"
        )
        self.client.force_login(self.user)

    def _biblist_request(
        self, last_modified=0, number_of_entries=0, user_id=None
    ):
        return json_post(
            self.client,
            "/api/bibliography/biblist/",
            {
                "last_modified": last_modified,
                "number_of_entries": number_of_entries,
                "user_id": user_id if user_id is not None else self.user.id,
            },
        )

    def test_empty_bib_no_list_returned_when_up_to_date(self):
        """Client is up to date (no entries); bib_list not required."""
        response = self._biblist_request(last_modified=0, number_of_entries=0)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        # No entries server-side and client_count == 0 → no bib_list key
        self.assertNotIn("bib_list", data)

    def test_stale_client_gets_bib_list(self):
        """Client's last_modified is older than server's → bib_list returned."""
        Entry.objects.create(
            entry_key="ref1",
            entry_owner=self.user,
            bib_type="article",
            cats=[],
            fields={"title": "My Paper"},
        )
        # Client reports timestamp 0 (far in the past)
        response = self._biblist_request(last_modified=0, number_of_entries=0)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("bib_list", data)
        self.assertEqual(len(data["bib_list"]), 1)

    def test_user_id_mismatch_returns_bib_list(self):
        """If the user_id in the request differs, the full list is returned."""
        Entry.objects.create(
            entry_key="ref2",
            entry_owner=self.user,
            bib_type="book",
            cats=[],
            fields={},
        )
        response = self._biblist_request(
            last_modified=9999999999,
            number_of_entries=1,
            user_id=self.user.id + 999,  # wrong user_id
        )
        data = response.json()
        self.assertIn("bib_list", data)

    def test_response_includes_user_id(self):
        response = self._biblist_request()
        data = response.json()
        self.assertEqual(data["user_id"], self.user.id)

    def test_response_includes_bib_categories(self):
        response = self._biblist_request()
        data = response.json()
        self.assertIn("bib_categories", data)

    def test_categories_returned_for_current_user(self):
        EntryCategory.objects.create(
            category_title="History", category_owner=self.user
        )
        response = self._biblist_request()
        data = response.json()
        # bib_categories is a list of serialized category objects
        self.assertGreater(len(data["bib_categories"]), 0)


class BibSaveViewTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="bibsaveuser", password="pass"
        )
        self.client.force_login(self.user)

    def _bib_entry(self, key="testref"):
        return {
            "entry_key": key,
            "bib_type": "article",
            "cats": [],
            "fields": {"title": f"Test {key}"},
        }

    def test_save_new_entry_creates_and_returns_id_translation(self):
        response = json_post(
            self.client,
            "/api/bibliography/save/",
            {
                "is_new": True,
                "bibs": {"client_0": self._bib_entry("newref")},
            },
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("id_translations", data)
        self.assertEqual(len(data["id_translations"]), 1)
        client_id, server_id = data["id_translations"][0]
        self.assertEqual(client_id, "client_0")
        self.assertTrue(Entry.objects.filter(id=server_id).exists())

    def test_save_duplicate_returns_existing_id(self):
        # Create the entry first
        existing = Entry.objects.create(
            entry_key="dupref",
            entry_owner=self.user,
            bib_type="article",
            cats=[],
            fields={"title": "Test dupref"},
        )
        # Now save the same entry again
        response = json_post(
            self.client,
            "/api/bibliography/save/",
            {
                "is_new": True,
                "bibs": {"client_0": self._bib_entry("dupref")},
            },
        )
        data = response.json()
        _, server_id = data["id_translations"][0]
        self.assertEqual(server_id, existing.id)

    def test_update_existing_entry(self):
        entry = Entry.objects.create(
            entry_key="updateref",
            entry_owner=self.user,
            bib_type="article",
            cats=[],
            fields={"title": "Old Title"},
        )
        response = json_post(
            self.client,
            "/api/bibliography/save/",
            {
                "is_new": False,
                "bibs": {
                    str(entry.id): {
                        "entry_key": "updateref",
                        "bib_type": "book",
                        "cats": [1],
                        "fields": {"title": "New Title"},
                    }
                },
            },
        )
        self.assertEqual(response.status_code, 200)
        entry.refresh_from_db()
        self.assertEqual(entry.bib_type, "book")
        self.assertEqual(entry.fields["title"], "New Title")


class BibDeleteViewTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="bibdeluser", password="pass"
        )
        self.other_user = User.objects.create_user(
            username="otheruser_bib", password="pass"
        )
        self.client.force_login(self.user)

    def test_delete_owned_entry(self):
        entry = Entry.objects.create(
            entry_key="toDelete",
            entry_owner=self.user,
            bib_type="misc",
            cats=[],
            fields={},
        )
        response = json_post(
            self.client,
            "/api/bibliography/delete/",
            {"ids": [entry.id]},
        )
        self.assertEqual(response.status_code, 201)
        self.assertFalse(Entry.objects.filter(id=entry.id).exists())

    def test_cannot_delete_other_users_entry(self):
        entry = Entry.objects.create(
            entry_key="notMine",
            entry_owner=self.other_user,
            bib_type="misc",
            cats=[],
            fields={},
        )
        json_post(
            self.client,
            "/api/bibliography/delete/",
            {"ids": [entry.id]},
        )
        # Entry should still exist since it doesn't belong to self.user
        self.assertTrue(Entry.objects.filter(id=entry.id).exists())

    def test_delete_multiple_entries(self):
        entries = [
            Entry.objects.create(
                entry_key=f"multi{i}",
                entry_owner=self.user,
                bib_type="misc",
                cats=[],
                fields={},
            )
            for i in range(3)
        ]
        ids = [e.id for e in entries]
        json_post(self.client, "/api/bibliography/delete/", {"ids": ids})
        self.assertEqual(Entry.objects.filter(id__in=ids).count(), 0)


class BibSaveCategoryViewTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="bibcatuser", password="pass"
        )
        self.client.force_login(self.user)

    def test_create_new_category(self):
        response = json_post(
            self.client,
            "/api/bibliography/save_category/",
            {"ids": [0], "titles": ["Science"]},
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(len(data["entries"]), 1)
        self.assertEqual(data["entries"][0]["category_title"], "Science")
        self.assertTrue(
            EntryCategory.objects.filter(
                category_title="Science", category_owner=self.user
            ).exists()
        )

    def test_update_existing_category(self):
        cat = EntryCategory.objects.create(
            category_title="Old Title", category_owner=self.user
        )
        response = json_post(
            self.client,
            "/api/bibliography/save_category/",
            {"ids": [cat.id], "titles": ["New Title"]},
        )
        self.assertEqual(response.status_code, 201)
        cat.refresh_from_db()
        self.assertEqual(cat.category_title, "New Title")

    def test_categories_not_in_ids_are_deleted(self):
        cat_keep = EntryCategory.objects.create(
            category_title="Keep", category_owner=self.user
        )
        cat_delete = EntryCategory.objects.create(
            category_title="Delete Me", category_owner=self.user
        )
        # Only submit cat_keep in the ids list
        json_post(
            self.client,
            "/api/bibliography/save_category/",
            {"ids": [cat_keep.id], "titles": ["Keep"]},
        )
        self.assertTrue(EntryCategory.objects.filter(id=cat_keep.id).exists())
        self.assertFalse(
            EntryCategory.objects.filter(id=cat_delete.id).exists()
        )

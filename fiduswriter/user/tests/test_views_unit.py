"""Unit tests for user views that don't require a browser."""

import json
import base64
from django.test import TestCase, Client

from user.models import User, UserEncryptionKey, UserInvite
from user.views import is_email, invites_connect


AJAX_HEADERS = {"HTTP_X_REQUESTED_WITH": "XMLHttpRequest"}


def json_post(client, url, data):
    """Helper: POST JSON to a view with the AJAX header."""
    return client.post(
        url,
        json.dumps(data),
        content_type="application/json",
        **AJAX_HEADERS,
    )


def ajax_get(client, url, params=None):
    """Helper: GET a view with the AJAX header."""
    return client.get(url, params or {}, **AJAX_HEADERS)


# ---------------------------------------------------------------------------
# is_email()
# ---------------------------------------------------------------------------


class IsEmailTest(TestCase):
    def test_valid_email(self):
        self.assertTrue(is_email("user@example.com"))

    def test_invalid_email_no_at(self):
        self.assertFalse(is_email("notanemail"))

    def test_invalid_email_no_domain(self):
        self.assertFalse(is_email("user@"))

    def test_empty_string(self):
        self.assertFalse(is_email(""))

    def test_email_with_subdomain(self):
        self.assertTrue(is_email("user@mail.example.co.uk"))


# ---------------------------------------------------------------------------
# delete_user view
# ---------------------------------------------------------------------------


class DeleteUserViewTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="testuser",
            password="correct_password",
        )

    def test_wrong_password_returns_401(self):
        self.client.force_login(self.user)
        response = json_post(
            self.client,
            "/api/user/delete/",
            {"password": "wrong_password"},
        )
        self.assertEqual(response.status_code, 401)

    def test_staff_user_returns_403(self):
        self.user.is_staff = True
        self.user.save()
        self.client.force_login(self.user)
        response = json_post(
            self.client,
            "/api/user/delete/",
            {"password": "correct_password"},
        )
        self.assertEqual(response.status_code, 403)
        # Staff user should not be deleted
        self.assertTrue(User.objects.filter(pk=self.user.pk).exists())

    def test_correct_password_deletes_user_and_returns_200(self):
        user_pk = self.user.pk
        self.client.force_login(self.user)
        response = json_post(
            self.client,
            "/api/user/delete/",
            {"password": "correct_password"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(User.objects.filter(pk=user_pk).exists())

    def test_unauthenticated_redirects(self):
        response = json_post(
            self.client,
            "/api/user/delete/",
            {"password": "irrelevant"},
        )
        # login_required redirects
        self.assertIn(response.status_code, [302, 401])


# ---------------------------------------------------------------------------
# get_encryption_key view
# ---------------------------------------------------------------------------


class GetEncryptionKeyViewTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="keyuser", password="pass"
        )
        self.client.force_login(self.user)

    def test_no_key_returns_has_key_false(self):
        response = ajax_get(self.client, "/api/user/encryption_key/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["has_key"])

    def test_with_key_returns_has_key_true_and_fields(self):
        salt = b"\x12\x34\x56\x78" * 4  # 16 bytes
        UserEncryptionKey.objects.create(
            user=self.user,
            public_key="mypubkey",
            encrypted_private_key="encpriv",
            encrypted_master_key="encmk",
            user_salt=salt,
            user_iterations=600000,
            encrypted_master_key_backup="encmkbackup",
        )
        response = ajax_get(self.client, "/api/user/encryption_key/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["has_key"])
        self.assertEqual(data["public_key"], "mypubkey")
        self.assertEqual(data["encrypted_private_key"], "encpriv")
        self.assertEqual(data["encrypted_master_key"], "encmk")
        self.assertEqual(data["user_iterations"], 600000)
        # user_salt is returned as base64
        decoded_salt = base64.b64decode(data["user_salt"])
        self.assertEqual(decoded_salt, salt)


# ---------------------------------------------------------------------------
# save_encryption_key view
# ---------------------------------------------------------------------------


class SaveEncryptionKeyViewTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="savekey_user", password="pass"
        )
        self.client.force_login(self.user)
        self.salt_bytes = b"\xaa\xbb\xcc\xdd" * 4
        self.salt_b64 = base64.b64encode(self.salt_bytes).decode("ascii")

    def _key_data(self, suffix=""):
        return {
            "public_key": f"pubkey{suffix}",
            "encrypted_private_key": f"encpriv{suffix}",
            "encrypted_master_key": f"encmk{suffix}",
            "user_salt": self.salt_b64,
            "user_iterations": 600000,
            "encrypted_master_key_backup": f"encmkbackup{suffix}",
        }

    def test_creates_new_key_record(self):
        response = json_post(
            self.client,
            "/api/user/encryption_key/save/",
            {"data": self._key_data()},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("id", data)
        self.assertTrue(
            UserEncryptionKey.objects.filter(user=self.user).exists()
        )

    def test_updates_existing_key_record(self):
        # First create
        json_post(
            self.client,
            "/api/user/encryption_key/save/",
            {"data": self._key_data()},
        )
        # Then update
        response = json_post(
            self.client,
            "/api/user/encryption_key/save/",
            {"data": self._key_data(suffix="_updated")},
        )
        self.assertEqual(response.status_code, 200)
        key = UserEncryptionKey.objects.get(user=self.user)
        self.assertEqual(key.public_key, "pubkey_updated")
        self.assertEqual(key.encrypted_master_key, "encmk_updated")

    def test_returns_key_id(self):
        response = json_post(
            self.client,
            "/api/user/encryption_key/save/",
            {"data": self._key_data()},
        )
        data = response.json()
        key = UserEncryptionKey.objects.get(user=self.user)
        self.assertEqual(data["id"], key.id)


# ---------------------------------------------------------------------------
# get_public_key view
# ---------------------------------------------------------------------------


class GetPublicKeyViewTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.requester = User.objects.create_user(
            username="requester", password="pass"
        )
        self.target = User.objects.create_user(
            username="target", password="pass"
        )
        self.client.force_login(self.requester)

    def test_user_not_found_returns_404(self):
        response = ajax_get(
            self.client,
            "/api/user/encryption_public_key/999999/",
        )
        self.assertEqual(response.status_code, 404)

    def test_user_without_key_returns_has_key_false(self):
        response = ajax_get(
            self.client,
            f"/api/user/encryption_public_key/{self.target.pk}/",
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["has_key"])

    def test_user_with_key_returns_has_key_true(self):
        UserEncryptionKey.objects.create(
            user=self.target,
            public_key="targetpubkey",
            encrypted_private_key="encpriv",
            encrypted_master_key="encmk",
            user_salt=b"\x00" * 16,
            user_iterations=600000,
            encrypted_master_key_backup="encmkbackup",
        )
        response = ajax_get(
            self.client,
            f"/api/user/encryption_public_key/{self.target.pk}/",
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["has_key"])
        self.assertEqual(data["public_key"], "targetpubkey")


# ---------------------------------------------------------------------------
# update_preferences and get_preferences views
# ---------------------------------------------------------------------------


class PreferencesViewTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="prefuser", password="pass"
        )
        self.client.force_login(self.user)

    def test_get_preferences_returns_empty_dict_initially(self):
        response = ajax_get(self.client, "/api/user/preferences/get/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["preferences"], {})

    def test_update_preferences_allowed_key(self):
        response = json_post(
            self.client,
            "/api/user/preferences/update/",
            {"has_dismissed_passphrase_offer": True},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["preferences"]["has_dismissed_passphrase_offer"])

    def test_update_preferences_unknown_key_is_ignored(self):
        response = json_post(
            self.client,
            "/api/user/preferences/update/",
            {"unknown_malicious_key": "value"},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertNotIn("unknown_malicious_key", data["preferences"])

    def test_get_preferences_reflects_previously_saved_values(self):
        self.user.preferences = {"has_dismissed_passphrase_offer": True}
        self.user.save()
        response = ajax_get(self.client, "/api/user/preferences/get/")
        data = response.json()
        self.assertTrue(data["preferences"]["has_dismissed_passphrase_offer"])


# ---------------------------------------------------------------------------
# has_encryption_keys view
# ---------------------------------------------------------------------------


class HasEncryptionKeysViewTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="haskeyuser", password="pass"
        )
        self.target = User.objects.create_user(
            username="target_hek", password="pass"
        )
        self.client.force_login(self.user)

    def test_missing_user_id_returns_400(self):
        response = self.client.get(
            "/api/user/encryption_key/has_keys/",
            **AJAX_HEADERS,
        )
        self.assertEqual(response.status_code, 400)

    def test_invalid_user_id_returns_400(self):
        response = self.client.get(
            "/api/user/encryption_key/has_keys/",
            {"user_id": "notanint"},
            **AJAX_HEADERS,
        )
        self.assertEqual(response.status_code, 400)

    def test_nonexistent_user_returns_404(self):
        response = self.client.get(
            "/api/user/encryption_key/has_keys/",
            {"user_id": 999999},
            **AJAX_HEADERS,
        )
        self.assertEqual(response.status_code, 404)

    def test_user_without_keys_returns_false(self):
        response = self.client.get(
            "/api/user/encryption_key/has_keys/",
            {"user_id": self.target.pk},
            **AJAX_HEADERS,
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["has_keys"])

    def test_user_with_keys_returns_true(self):
        UserEncryptionKey.objects.create(
            user=self.target,
            public_key="pub",
            encrypted_private_key="encpriv",
            encrypted_master_key="encmk",
            user_salt=b"\x00" * 16,
            user_iterations=600000,
            encrypted_master_key_backup="backup",
        )
        response = self.client.get(
            "/api/user/encryption_key/has_keys/",
            {"user_id": self.target.pk},
            **AJAX_HEADERS,
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["has_keys"])

    def test_post_method_with_user_id(self):
        response = json_post(
            self.client,
            "/api/user/encryption_key/has_keys/",
            {"user_id": self.target.pk},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["has_keys"])

    def test_post_method_missing_user_id(self):
        response = json_post(
            self.client,
            "/api/user/encryption_key/has_keys/",
            {},
        )
        self.assertEqual(response.status_code, 400)


# ---------------------------------------------------------------------------
# invites_connect() utility function
# ---------------------------------------------------------------------------


class InvitesConnectTest(TestCase):
    def setUp(self):
        self.inviter = User.objects.create_user(
            username="inviter", email="inviter@example.com", password="pass"
        )
        self.invitee = User.objects.create_user(
            username="invitee", email="invitee@example.com", password="pass"
        )

    def test_no_invites_returns_false(self):
        result = invites_connect(self.invitee)
        self.assertFalse(result)

    def test_matching_email_invite_is_connected(self):
        invite = UserInvite.objects.create(
            email="invitee@example.com",
            username="invitee",
            by=self.inviter,
            to=None,
        )
        result = invites_connect(self.invitee)
        self.assertTrue(result)
        invite.refresh_from_db()
        self.assertEqual(invite.to, self.invitee)

    def test_connect_by_key(self):
        invite = UserInvite.objects.create(
            email="someone@example.com",
            username="someone",
            by=self.inviter,
            to=None,
        )
        result = invites_connect(self.invitee, key=invite.key)
        self.assertTrue(result)
        invite.refresh_from_db()
        self.assertEqual(invite.to, self.invitee)

    def test_already_connected_invite_not_matched(self):
        # Invite already has a 'to' user, should not be picked up
        UserInvite.objects.create(
            email="invitee@example.com",
            username="invitee",
            by=self.inviter,
            to=self.invitee,  # already connected
        )
        result = invites_connect(self.invitee)
        self.assertFalse(result)

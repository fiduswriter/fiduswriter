"""Unit tests for user views that don't require a browser."""

import json
import base64
import hashlib
import hmac
import struct
import time
from importlib import import_module

from django.conf import settings
from django.contrib.auth import SESSION_KEY
from django.test import TestCase, Client
from django_otp.plugins.otp_totp.models import TOTPDevice

from user.models import User, UserEncryptionKey, UserInvite
from user.views import is_email, invites_connect
from base.models import AuditLog


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
            self._key_data(),
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("id", data)
        self.assertTrue(
            UserEncryptionKey.objects.filter(user=self.user).exists()
        )
        key = UserEncryptionKey.objects.get(user=self.user)
        self.assertEqual(key.public_key, "pubkey")
        self.assertEqual(key.encrypted_private_key, "encpriv")
        self.assertEqual(key.encrypted_master_key, "encmk")
        self.assertEqual(key.user_salt, self.salt_bytes)
        self.assertEqual(key.user_iterations, 600000)
        self.assertEqual(key.encrypted_master_key_backup, "encmkbackup")

    def test_updates_existing_key_record(self):
        # First create
        json_post(
            self.client,
            "/api/user/encryption_key/save/",
            self._key_data(),
        )
        # Then update
        response = json_post(
            self.client,
            "/api/user/encryption_key/save/",
            self._key_data(suffix="_updated"),
        )
        self.assertEqual(response.status_code, 200)
        key = UserEncryptionKey.objects.get(user=self.user)
        self.assertEqual(key.public_key, "pubkey_updated")
        self.assertEqual(key.encrypted_master_key, "encmk_updated")
        self.assertEqual(key.encrypted_private_key, "encpriv_updated")
        self.assertEqual(key.user_salt, self.salt_bytes)
        self.assertEqual(
            key.encrypted_master_key_backup, "encmkbackup_updated"
        )

    def test_returns_key_id(self):
        response = json_post(
            self.client,
            "/api/user/encryption_key/save/",
            self._key_data(),
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


# ---------------------------------------------------------------------------
# Two_factor_disable step-up re-authentication
# ---------------------------------------------------------------------------


class TwoFactorDisableStepUpTest(TestCase):
    DISABLE_URL = "/api/user/two-factor/disable/"

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="2fa_user", password="topsecret"
        )
        self.client.force_login(self.user)
        self.client.session.save()
        self.device = TOTPDevice.objects.create(
            user=self.user,
            name="test device",
            confirmed=True,
            step=30,
            t0=0,
            digits=6,
        )

    def _totp_now(self):
        """RFC 6238 token computed from the unix epoch.

        Deliberately avoids pyotp.TOTP.now(), which derives the counter via
        a naive-datetime/``time.mktime`` round trip that is not reliable
        when the environment's TZ state is inconsistent with the C library's
        cached timezone. This matches the epoch arithmetic django_otp uses
        server-side.
        """
        key = self.device.bin_key
        counter = int(time.time()) // self.device.step
        digest = hmac.new(
            key, struct.pack(">Q", counter), hashlib.sha1
        ).digest()
        offset = digest[-1] & 0xF
        code = (
            (digest[offset] & 0x7F) << 24
            | digest[offset + 1] << 16
            | digest[offset + 2] << 8
            | digest[offset + 3]
        ) % 10**self.device.digits
        return "%0*d" % (self.device.digits, code)

    def _create_other_session(self):
        engine = import_module(settings.SESSION_ENGINE)
        store = engine.SessionStore()
        store[SESSION_KEY] = str(self.user.pk)
        store.save()
        return store.session_key

    def test_disable_without_credentials_rejected(self):
        response = json_post(self.client, self.DISABLE_URL, {})
        self.assertEqual(response.status_code, 403)
        self.assertTrue(
            TOTPDevice.objects.filter(user=self.user, confirmed=True).exists()
        )

    def test_disable_with_wrong_password_rejected(self):
        response = json_post(
            self.client,
            self.DISABLE_URL,
            {"password": "wrong", "code": self._totp_now()},
        )
        self.assertEqual(response.status_code, 403)
        self.assertTrue(
            TOTPDevice.objects.filter(user=self.user, confirmed=True).exists()
        )

    def test_disable_with_wrong_code_rejected(self):
        response = json_post(
            self.client,
            self.DISABLE_URL,
            {"password": "topsecret", "code": "000000"},
        )
        self.assertEqual(response.status_code, 403)
        self.assertTrue(
            TOTPDevice.objects.filter(user=self.user, confirmed=True).exists()
        )

    def test_disable_without_code_rejected(self):
        response = json_post(
            self.client, self.DISABLE_URL, {"password": "topsecret"}
        )
        self.assertEqual(response.status_code, 403)
        self.assertTrue(
            TOTPDevice.objects.filter(user=self.user, confirmed=True).exists()
        )

    def test_disable_with_password_and_code_succeeds(self):
        key = self._create_other_session()
        response = json_post(
            self.client,
            self.DISABLE_URL,
            {"password": "topsecret", "code": self._totp_now()},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "success")
        self.assertFalse(TOTPDevice.objects.filter(user=self.user).exists())
        from django.contrib.sessions.models import Session

        self.assertFalse(Session.objects.filter(session_key=key).exists())

    def test_disable_expires_other_sessions(self):
        other_session_key = self._create_other_session()
        current_session_key = self.client.session.session_key
        response = json_post(
            self.client,
            self.DISABLE_URL,
            {"password": "topsecret", "code": self._totp_now()},
        )
        self.assertEqual(response.status_code, 200)
        from django.contrib.sessions.models import Session

        self.assertFalse(
            Session.objects.filter(session_key=other_session_key).exists()
        )
        self.assertTrue(
            Session.objects.filter(session_key=current_session_key).exists()
        )


# ---------------------------------------------------------------------------
# Structured audit trail for account-critical actions
# ---------------------------------------------------------------------------


class AuditTrailUserTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="audit_user", password="topsecret"
        )
        self.client.force_login(self.user)
        TOTPDevice.objects.create(
            user=self.user,
            name="test",
            confirmed=True,
            step=30,
            t0=0,
            digits=6,
        )

    def test_two_factor_disable_denial_logged(self):
        self.client.post(
            "/api/user/two-factor/disable/",
            json.dumps({"password": "wrong", "code": "123456"}),
            content_type="application/json",
            **AJAX_HEADERS,
        )
        self.assertTrue(
            AuditLog.objects.filter(
                action="two_factor.disable",
                target_type="user",
                target_id=str(self.user.pk),
                outcome="denied",
                new_state__reason="password",
            ).exists()
        )

    def test_encryption_key_denials_logged(self):
        UserEncryptionKey.objects.create(
            user=self.user,
            public_key="pubkey",
            encrypted_private_key="encpriv",
            encrypted_master_key="encmk",
            user_salt=b"\x12" * 16,
            user_iterations=600000,
            encrypted_master_key_backup="backup",
        )
        json_post(
            self.client,
            "/api/user/encryption_key/save/",
            {
                "public_key": "evil",
                "password": "nope",
                "expected_version": 0,
                "old_public_key": "pubkey",
            },
        )
        self.assertTrue(
            AuditLog.objects.filter(
                action="encryption_key.replace",
                outcome="denied",
                new_state__reason="password",
            ).exists()
        )

    def test_key_rotation_success_logged(self):
        UserEncryptionKey.objects.create(
            user=self.user,
            public_key="pubkey",
            encrypted_private_key="encpriv",
            encrypted_master_key="encmk",
            user_salt=b"\x12" * 16,
            user_iterations=600000,
            encrypted_master_key_backup="backup",
        )
        json_post(
            self.client,
            "/api/user/encryption_key/save/",
            {
                "public_key": "pubkey2",
                "encrypted_private_key": "encpriv2",
                "encrypted_master_key": "encmk2",
                "user_salt": base64.b64encode(b"\x34" * 16).decode("ascii"),
                "user_iterations": 600000,
                "encrypted_master_key_backup": "backup2",
                "password": "topsecret",
                "expected_version": 0,
                "old_public_key": "pubkey",
            },
        )
        entry = AuditLog.objects.filter(
            action="encryption_key.rotate",
            target_type="user",
        ).first()
        self.assertIsNotNone(entry)
        self.assertTrue(entry.new_state["public_key_changed"])
        # key material itself must never be recorded
        self.assertNotIn("encpriv2", json.dumps(entry.new_state))
        self.assertNotIn("topsecret", json.dumps(entry.new_state))

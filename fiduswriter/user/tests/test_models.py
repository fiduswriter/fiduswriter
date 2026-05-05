"""Unit tests for user models."""

from django.test import TestCase
from user.models import User, UserEncryptionKey, UserInvite, auto_avatar


class AutoAvatarTest(TestCase):
    """Tests for the auto_avatar() function."""

    def test_returns_dict_with_required_keys(self):
        result = auto_avatar("testuser")
        self.assertIn("url", result)
        self.assertIn("uploaded", result)
        self.assertIn("html", result)

    def test_uploaded_is_false(self):
        result = auto_avatar("testuser")
        self.assertFalse(result["uploaded"])

    def test_html_contains_username_initial(self):
        result = auto_avatar("Alice")
        self.assertIn("<span>A</span>", result["html"])

    def test_html_contains_rgb_style(self):
        result = auto_avatar("testuser")
        self.assertIn("rgb(", result["html"])

    def test_html_contains_fw_string_avatar_class(self):
        result = auto_avatar("testuser")
        self.assertIn("fw-string-avatar", result["html"])

    def test_different_usernames_may_produce_different_colors(self):
        result1 = auto_avatar("alice")
        result2 = auto_avatar("bob")
        # They might be different (not guaranteed, but very likely with different names)
        # At minimum, they should both be valid dicts
        self.assertIn("html", result1)
        self.assertIn("html", result2)

    def test_deterministic_output(self):
        """Same username always produces the same result."""
        result1 = auto_avatar("charlie")
        result2 = auto_avatar("charlie")
        self.assertEqual(result1["html"], result2["html"])

    def test_single_char_username(self):
        result = auto_avatar("X")
        self.assertIn("<span>X</span>", result["html"])


class UserReadableNameTest(TestCase):
    """Tests for User.readable_name property."""

    def test_returns_full_name_when_set(self):
        user = User(
            username="jdoe",
            first_name="John",
            last_name="Doe",
        )
        self.assertEqual(user.readable_name, "John Doe")

    def test_returns_username_when_full_name_empty(self):
        user = User(username="jdoe", first_name="", last_name="")
        self.assertEqual(user.readable_name, "jdoe")

    def test_returns_username_when_only_first_name(self):
        # get_full_name() returns "John" (non-empty), so readable_name is "John"
        user = User(username="jdoe", first_name="John", last_name="")
        self.assertEqual(user.readable_name, "John")


class UserEncryptionKeyStrTest(TestCase):
    """Tests for UserEncryptionKey.__str__."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="cryptouser", password="pass"
        )
        self.key = UserEncryptionKey.objects.create(
            user=self.user,
            public_key="pubkey",
            encrypted_private_key="encpriv",
            encrypted_master_key="encmk",
            user_salt=b"\x00" * 16,
            user_iterations=600000,
            encrypted_master_key_backup="encmkbackup",
        )

    def test_str_contains_username(self):
        self.assertIn("cryptouser", str(self.key))

    def test_str_format(self):
        self.assertEqual(str(self.key), "EncryptionKey for cryptouser")


class UserInviteTest(TestCase):
    """Tests for UserInvite model methods."""

    def setUp(self):
        self.inviter = User.objects.create_user(
            username="inviter", password="pass"
        )
        self.invitee = User.objects.create_user(
            username="invitee", password="pass"
        )

    def test_readable_name_returns_username(self):
        invite = UserInvite(
            email="someone@example.com",
            username="Someone",
            by=self.inviter,
        )
        self.assertEqual(invite.readable_name, "Someone")

    def test_get_relative_url_contains_key(self):
        invite = UserInvite.objects.create(
            email="someone@example.com",
            username="someone",
            by=self.inviter,
        )
        url = invite.get_relative_url()
        self.assertTrue(url.startswith("/invite/"))
        self.assertIn(str(invite.key), url)

    def test_get_relative_url_format(self):
        invite = UserInvite.objects.create(
            email="test@example.com",
            username="testuser",
            by=self.inviter,
        )
        expected = f"/invite/{invite.key}/"
        self.assertEqual(invite.get_relative_url(), expected)

    def test_avatar_url_returns_dict(self):
        invite = UserInvite(
            email="test@example.com",
            username="testuser",
            by=self.inviter,
        )
        avatar = invite.avatar_url
        self.assertIsInstance(avatar, dict)
        self.assertIn("html", avatar)

    def test_str_with_to_user(self):
        invite = UserInvite.objects.create(
            email="invitee@example.com",
            username="invitee",
            by=self.inviter,
            to=self.invitee,
        )
        result = str(invite)
        self.assertIn("inviter", result)
        self.assertIn("invitee", result)

    def test_str_without_to_user(self):
        invite = UserInvite.objects.create(
            email="nobody@example.com",
            username="nobody",
            by=self.inviter,
            to=None,
        )
        result = str(invite)
        self.assertIn("nobody", result)
        self.assertIn("inviter", result)

    def test_apply_with_no_to_user_is_noop(self):
        """apply() without a 'to' user should be a no-op."""
        invite = UserInvite.objects.create(
            email="nobody@example.com",
            username="nobody",
            by=self.inviter,
            to=None,
        )
        invite_id = invite.id
        invite.apply()
        # Invite should still exist
        self.assertTrue(UserInvite.objects.filter(id=invite_id).exists())

"""Unit tests for user.adapter.AccountAdapter (no Selenium required)."""

from unittest.mock import MagicMock, patch

from allauth.account.adapter import DefaultAccountAdapter
from django.test import RequestFactory, TestCase

from user.adapter import AccountAdapter


class AccountAdapterTest(TestCase):
    """Tests for AccountAdapter's overridden methods."""

    def setUp(self):
        self.adapter = AccountAdapter(request=None)
        self.factory = RequestFactory()

    # -----------------------------------------------------------------------
    # get_email_confirmation_url
    # -----------------------------------------------------------------------

    def test_get_email_confirmation_url_format(self):
        """The returned URL must contain the path segment and the key."""
        request = self.factory.get("/")
        emailconfirmation = MagicMock()
        emailconfirmation.key = "test-confirm-key-abc123"

        url = self.adapter.get_email_confirmation_url(
            request, emailconfirmation
        )

        self.assertIn("/account/confirm-email/", url)
        self.assertIn("test-confirm-key-abc123", url)

    def test_get_email_confirmation_url_contains_key_at_end(self):
        """The key must appear as a path component in the URL, not just anywhere."""
        request = self.factory.get("/")
        emailconfirmation = MagicMock()
        emailconfirmation.key = "unique-key-xyz"

        url = self.adapter.get_email_confirmation_url(
            request, emailconfirmation
        )

        # The URL should end with /<key>/
        self.assertTrue(
            url.endswith("/unique-key-xyz/"),
            f"Expected URL to end with '/unique-key-xyz/', got: {url}",
        )

    # -----------------------------------------------------------------------
    # send_mail – password_reset_key prefix
    # -----------------------------------------------------------------------

    def test_send_mail_replaces_password_reset_url(self):
        """For password_reset_key, the reset URL is rewritten to the custom path."""
        request = self.factory.get("/")
        context = {
            # The URL as allauth normally builds it; the key is the second-to-last
            # path segment when split on "/".
            "password_reset_url": (
                "http://testserver/api/account/password/reset/key/MYKEY456/"
            ),
            "request": request,
        }

        with patch.object(
            DefaultAccountAdapter, "send_mail", return_value=None
        ) as mock_super_send:
            self.adapter.send_mail(
                "account/email/password_reset_key",
                "user@example.com",
                context,
            )

        # The URL must now point to the custom change-password path.
        self.assertIn(
            "/account/change-password/", context["password_reset_url"]
        )
        # The extracted key must appear in the new URL.
        self.assertIn("MYKEY456", context["password_reset_url"])
        # super().send_mail must have been called exactly once.
        mock_super_send.assert_called_once()

    def test_send_mail_password_reset_passes_modified_context_to_super(self):
        """The modified context (with the new URL) is forwarded to super().send_mail."""
        request = self.factory.get("/")
        context = {
            "password_reset_url": (
                "http://testserver/api/account/password/reset/key/KEYABC/"
            ),
            "request": request,
        }

        captured_context = {}

        def capture_context(self_inner, template_prefix, email, ctx):
            captured_context.update(ctx)

        with patch.object(
            DefaultAccountAdapter, "send_mail", new=capture_context
        ):
            self.adapter.send_mail(
                "account/email/password_reset_key",
                "user@example.com",
                context,
            )

        self.assertIn(
            "/account/change-password/",
            captured_context.get("password_reset_url", ""),
        )

    # -----------------------------------------------------------------------
    # send_mail – other prefixes
    # -----------------------------------------------------------------------

    def test_send_mail_other_prefix_calls_super(self):
        """For any prefix other than password_reset_key, super().send_mail is called."""
        context = {"activation_url": "http://example.com/verify/"}

        with patch.object(
            DefaultAccountAdapter, "send_mail", return_value=None
        ) as mock_super_send:
            self.adapter.send_mail(
                "account/email/email_confirmation",
                "user@example.com",
                context,
            )

        mock_super_send.assert_called_once()

    def test_send_mail_other_prefix_does_not_modify_context(self):
        """Non-password-reset prefixes must not modify the context dict."""
        context = {"activation_url": "http://example.com/verify/token123/"}
        original_context = dict(context)

        with patch.object(
            DefaultAccountAdapter, "send_mail", return_value=None
        ):
            self.adapter.send_mail(
                "account/email/email_confirmation",
                "user@example.com",
                context,
            )

        self.assertEqual(context, original_context)

"""Unit tests for user.emails notification helpers (no Selenium required)."""

from django.core import mail
from django.test import TestCase, override_settings

from user.emails import (
    send_accept_notification,
    send_decline_notification,
    send_invite_notification,
)

# Use Django's in-memory email backend so outbox is always populated.
_LOCMEM_BACKEND = "django.core.mail.backends.locmem.EmailBackend"


# ---------------------------------------------------------------------------
# send_invite_notification
# ---------------------------------------------------------------------------


@override_settings(EMAIL_BACKEND=_LOCMEM_BACKEND)
class SendInviteNotificationTest(TestCase):
    def test_send_invite_notification_sends_email(self):
        """One email is sent and the recipient matches."""
        send_invite_notification(
            "Alice", "bob@example.com", "http://example.com/invite/"
        )

        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["bob@example.com"])

    def test_invite_email_subject_contains_invite(self):
        """The subject must contain the word 'invite' (case-insensitive)."""
        send_invite_notification(
            "Alice", "bob@example.com", "http://example.com/invite/"
        )

        self.assertIn("invite", mail.outbox[0].subject.lower())

    def test_invite_email_body_contains_link(self):
        """The plain-text body must include the invite link."""
        link = "http://example.com/invite/abc123"
        send_invite_notification("Alice", "bob@example.com", link)

        self.assertIn(link, mail.outbox[0].body)

    def test_invite_email_subject_and_body(self):
        """Combined check: subject has 'invite' and body contains the link."""
        link = "http://example.com/invite/xyz"
        send_invite_notification("Alice", "bob@example.com", link)

        sent = mail.outbox[0]
        self.assertIn("invite", sent.subject.lower())
        self.assertIn(link, sent.body)

    def test_invite_email_from_sender_name_in_body(self):
        """The sender's name should appear somewhere in the plain-text body."""
        send_invite_notification(
            "Charlie", "dave@example.com", "http://example.com/invite/"
        )

        self.assertIn("Charlie", mail.outbox[0].body)


# ---------------------------------------------------------------------------
# send_decline_notification
# ---------------------------------------------------------------------------


@override_settings(EMAIL_BACKEND=_LOCMEM_BACKEND)
class SendDeclineNotificationTest(TestCase):
    def test_send_decline_notification_sends_email(self):
        """One email is sent and the recipient matches."""
        send_decline_notification(
            recipient_name="Bob",
            recipient_email="bob@example.com",
            sender_name="Alice",
            link="http://example.com/contacts/",
        )

        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["bob@example.com"])

    def test_decline_email_subject_contains_declined(self):
        """The subject must mention the decline."""
        send_decline_notification(
            recipient_name="Bob",
            recipient_email="bob@example.com",
            sender_name="Alice",
            link="http://example.com/contacts/",
        )

        self.assertIn("decline", mail.outbox[0].subject.lower())

    def test_decline_email_body_contains_link(self):
        """The plain-text body must include the contacts link."""
        link = "http://example.com/contacts/xyz"
        send_decline_notification(
            recipient_name="Bob",
            recipient_email="bob@example.com",
            sender_name="Alice",
            link=link,
        )

        self.assertIn(link, mail.outbox[0].body)

    def test_decline_email_body_contains_sender_name(self):
        """The sender's name should appear in the body so the recipient knows who declined."""
        send_decline_notification(
            recipient_name="Bob",
            recipient_email="bob@example.com",
            sender_name="Alice",
            link="http://example.com/contacts/",
        )

        self.assertIn("Alice", mail.outbox[0].body)


# ---------------------------------------------------------------------------
# send_accept_notification
# ---------------------------------------------------------------------------


@override_settings(EMAIL_BACKEND=_LOCMEM_BACKEND)
class SendAcceptNotificationTest(TestCase):
    def test_send_accept_notification_sends_email(self):
        """One email is sent and the recipient matches."""
        send_accept_notification(
            recipient_name="Bob",
            recipient_email="bob@example.com",
            sender_name="Alice",
            link="http://example.com/contacts/",
        )

        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["bob@example.com"])

    def test_accept_email_subject_contains_accepted(self):
        """The subject must mention the acceptance."""
        send_accept_notification(
            recipient_name="Bob",
            recipient_email="bob@example.com",
            sender_name="Alice",
            link="http://example.com/contacts/",
        )

        self.assertIn("accept", mail.outbox[0].subject.lower())

    def test_accept_email_body_contains_link(self):
        """The plain-text body must include the contacts link."""
        link = "http://example.com/contacts/abc"
        send_accept_notification(
            recipient_name="Bob",
            recipient_email="bob@example.com",
            sender_name="Alice",
            link=link,
        )

        self.assertIn(link, mail.outbox[0].body)

    def test_accept_email_body_contains_sender_name(self):
        """The sender's name should appear in the body."""
        send_accept_notification(
            recipient_name="Bob",
            recipient_email="bob@example.com",
            sender_name="Alice",
            link="http://example.com/contacts/",
        )

        self.assertIn("Alice", mail.outbox[0].body)

    def test_accept_and_decline_sent_to_distinct_recipients(self):
        """Regression: make sure each helper sends to the right address independently."""
        send_accept_notification(
            recipient_name="Bob",
            recipient_email="bob@example.com",
            sender_name="Alice",
            link="http://example.com/contacts/",
        )
        send_decline_notification(
            recipient_name="Carol",
            recipient_email="carol@example.com",
            sender_name="Dave",
            link="http://example.com/contacts/",
        )

        self.assertEqual(len(mail.outbox), 2)
        recipients = [m.to[0] for m in mail.outbox]
        self.assertIn("bob@example.com", recipients)
        self.assertIn("carol@example.com", recipients)

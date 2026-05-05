"""Unit tests for the feedback view and Feedback model.

Covers:
  - POST /api/feedback/feedback/ for authenticated users
  - POST /api/feedback/feedback/ for anonymous users
  - Feedback.__str__() with and without an owner

All tests patch ``feedback.emails.send_feedback`` to prevent real email
sends triggered by Feedback.save().
"""

import json
from unittest.mock import patch

from django.test import TestCase, Client

from feedback.models import Feedback
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
# View tests
# ---------------------------------------------------------------------------


class FeedbackViewTest(TestCase):
    """HTTP-level tests for the feedback endpoint."""

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="feedbackuser",
            email="fb@example.com",
            password="pass",
        )

    @patch("feedback.emails.send_feedback")
    def test_authenticated_user_feedback_saved(self, mock_send):
        """A logged-in user's feedback is saved with the correct owner."""
        self.client.force_login(self.user)
        response = json_post(
            self.client,
            "/api/feedback/feedback/",
            {"message": "Great tool!"},
        )
        self.assertEqual(response.status_code, 200)

        fb = Feedback.objects.get()
        self.assertEqual(fb.message, "Great tool!")
        self.assertEqual(fb.owner, self.user)

        # The email helper must have been called once.
        mock_send.assert_called_once()

    @patch("feedback.emails.send_feedback")
    def test_anonymous_user_feedback_saved(self, mock_send):
        """An anonymous request is accepted and owner is left as None."""
        response = json_post(
            self.client,
            "/api/feedback/feedback/",
            {"message": "Anonymous report"},
        )
        self.assertEqual(response.status_code, 200)

        fb = Feedback.objects.get()
        self.assertEqual(fb.message, "Anonymous report")
        self.assertIsNone(fb.owner)

        mock_send.assert_called_once()


# ---------------------------------------------------------------------------
# Model __str__ tests
# ---------------------------------------------------------------------------


class FeedbackStrTest(TestCase):
    """Tests for Feedback.__str__() representation."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="strowner",
            email="strowner@example.com",
            password="pass",
        )

    @patch("feedback.emails.send_feedback")
    def test_feedback_str_with_owner(self, mock_send):
        """str(feedback) includes the owner's username when one is set."""
        fb = Feedback.objects.create(owner=self.user, message="owner msg")
        self.assertIn(self.user.username, str(fb))

    @patch("feedback.emails.send_feedback")
    def test_feedback_str_without_owner(self, mock_send):
        """str(feedback) mentions 'Anonymous' when there is no owner."""
        fb = Feedback.objects.create(owner=None, message="anon msg")
        self.assertIn("Anonymous", str(fb))
        self.assertIn("anon msg", str(fb))

"""Unit tests for JsonToPostMiddleware.

The middleware is exercised directly (no HTTP server needed) by constructing
MagicMock request objects and calling the middleware callable.

Tested paths:
  1. application/json body   → request.JSON populated
  2. Empty body              → request.JSON == {}
  3. Invalid JSON body       → request.JSON == {}  (graceful fallback)
  4. GET request             → request.JSON == {}  (non-write method ignored)
  5. multipart with 'json' field  → request.JSON populated from that field
  6. multipart without 'json'     → request.JSON == {}
  7. csrfmiddlewaretoken in JSON body → injected into request.META
"""

import json
from unittest.mock import MagicMock

from django.conf import settings
from django.test import TestCase

from base.middleware import JsonToPostMiddleware


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_middleware():
    """Return a JsonToPostMiddleware wrapping a no-op get_response stub."""
    return JsonToPostMiddleware(MagicMock(return_value=MagicMock()))


def make_request(
    method="POST",
    content_type="application/json",
    body=b"",
    post_data=None,
):
    """Build a minimal mock request suitable for passing to the middleware."""
    request = MagicMock()
    request.method = method
    request.META = {"CONTENT_TYPE": content_type}
    request.body = body
    request.POST = post_data if post_data is not None else {}
    return request


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class JsonToPostMiddlewareTest(TestCase):
    """Direct unit tests for JsonToPostMiddleware.__call__."""

    def setUp(self):
        self.middleware = _make_middleware()

    # ------------------------------------------------------------------
    # application/json path
    # ------------------------------------------------------------------

    def test_json_body_parsed_to_request_JSON(self):
        """A POST with a JSON body populates request.JSON with the parsed dict."""
        payload = {"key": "value", "number": 42, "flag": True}
        request = make_request(body=json.dumps(payload).encode())

        self.middleware(request)

        self.assertEqual(request.JSON, payload)

    def test_empty_json_body_sets_empty_dict(self):
        """A POST with an empty body leaves request.JSON as an empty dict."""
        request = make_request(body=b"")

        self.middleware(request)

        self.assertEqual(request.JSON, {})

    def test_invalid_json_body_leaves_JSON_empty(self):
        """A POST with malformed JSON leaves request.JSON as an empty dict."""
        request = make_request(body=b"not-valid-json {{ !!!")

        self.middleware(request)

        self.assertEqual(request.JSON, {})

    # ------------------------------------------------------------------
    # Non-write method (GET)
    # ------------------------------------------------------------------

    def test_get_request_JSON_initialised_empty(self):
        """GET requests are not processed; request.JSON is always {} after the call."""
        payload = {"data": 1}
        # Even though we include a body the middleware must ignore it for GET.
        request = make_request(
            method="GET",
            body=json.dumps(payload).encode(),
        )

        self.middleware(request)

        self.assertEqual(request.JSON, {})

    # ------------------------------------------------------------------
    # multipart/form-data path
    # ------------------------------------------------------------------

    def test_multipart_with_json_field_parsed(self):
        """A multipart POST with a 'json' form field populates request.JSON."""
        payload = {"template_id": 5, "flag": True, "ids": [1, 2, 3]}
        request = make_request(
            content_type="multipart/form-data; boundary=----WebKitFormBoundary",
            body=b"",
            post_data={"json": json.dumps(payload)},
        )

        self.middleware(request)

        self.assertEqual(request.JSON, payload)

    def test_multipart_without_json_field_leaves_JSON_empty(self):
        """A multipart POST without a 'json' form field leaves request.JSON as {}."""
        request = make_request(
            content_type="multipart/form-data; boundary=----WebKitFormBoundary",
            body=b"",
            post_data={"other_field": "some value"},
        )

        self.middleware(request)

        self.assertEqual(request.JSON, {})

    # ------------------------------------------------------------------
    # CSRF token extraction
    # ------------------------------------------------------------------

    def test_csrf_token_extracted_from_json_body(self):
        """A csrfmiddlewaretoken key in the JSON body is injected into request.META."""
        payload = {"csrfmiddlewaretoken": "secret-csrf-abc", "data": "x"}
        request = make_request(body=json.dumps(payload).encode())

        self.middleware(request)

        # The token should have been written to the header Django uses for CSRF.
        self.assertEqual(
            request.META.get(settings.CSRF_HEADER_NAME), "secret-csrf-abc"
        )

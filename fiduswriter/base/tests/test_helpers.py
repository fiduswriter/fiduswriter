"""Unit tests for base helper modules."""

from django.test import TestCase
from base.helpers.ws import get_url_base


class GetUrlBaseTest(TestCase):
    """Tests for the get_url_base() helper function."""

    def test_single_port_int_returns_correct_ws_url(self):
        result = get_url_base("http://example.com", 8001)
        self.assertEqual(result, "example.com:8001/ws")

    def test_port_with_https_origin(self):
        result = get_url_base("https://myapp.example.com", 9000)
        self.assertEqual(result, "myapp.example.com:9000/ws")

    def test_dict_with_external_string_returns_external_host(self):
        conn = {"internal": 8000, "external": "ws1.fiduswriter.com"}
        result = get_url_base("http://example.com", conn)
        self.assertEqual(result, "ws1.fiduswriter.com/ws")

    def test_dict_with_external_int_uses_origin_hostname(self):
        conn = {"internal": 8000, "external": 9999}
        result = get_url_base("http://myapp.com", conn)
        self.assertEqual(result, "myapp.com:9999/ws")

    def test_zero_port_falls_back_to_slash_ws(self):
        # Port 0 is treated as falsy
        result = get_url_base("http://example.com", 0)
        self.assertEqual(result, "/ws")

    def test_unrecognized_conn_type_falls_back_to_slash_ws(self):
        result = get_url_base("http://example.com", "invalid")
        self.assertEqual(result, "/ws")

    def test_none_conn_falls_back_to_slash_ws(self):
        result = get_url_base("http://example.com", None)
        self.assertEqual(result, "/ws")

    def test_port_with_origin_that_has_port(self):
        # When the origin itself has a port, the hostname is still extracted
        result = get_url_base("http://localhost:8000", 8080)
        self.assertEqual(result, "localhost:8080/ws")

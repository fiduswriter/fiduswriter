"""Unit tests for user signals module."""

from django.test import TestCase
from user.signals import name_from_url


class NameFromUrlTest(TestCase):
    """Tests for the name_from_url() function."""

    def test_filename_from_url_with_extension(self):
        result = name_from_url("http://google.com/dir/file.ext")
        self.assertEqual(result, "file.ext")

    def test_directory_trailing_slash(self):
        result = name_from_url("http://google.com/dir/")
        self.assertEqual(result, "dir")

    def test_directory_no_trailing_slash(self):
        result = name_from_url("http://google.com/dir")
        self.assertEqual(result, "dir")

    def test_double_dot_path(self):
        result = name_from_url("http://google.com/dir/..")
        self.assertIsNotNone(result)

    def test_double_dot_with_trailing_slash(self):
        result = name_from_url("http://google.com/dir/../")
        self.assertIsNotNone(result)

    def test_domain_only(self):
        result = name_from_url("http://google.com")
        self.assertEqual(result, "google.com")

    def test_filename_with_multiple_dots(self):
        result = name_from_url("http://google.com/dir/subdir/file..ext")
        self.assertIsNotNone(result)
        # Slugify collapses multiple dots but result should be meaningful
        self.assertIn("file", result)

    def test_typical_avatar_url(self):
        result = name_from_url(
            "https://example.com/avatars/user123/profile.jpg"
        )
        self.assertEqual(result, "profile.jpg")

    def test_url_with_query_string_ignored(self):
        # Query string is not part of path, netloc is used as fallback
        result = name_from_url("http://example.com/image.png?v=1")
        self.assertEqual(result, "image.png")

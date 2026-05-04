"""Unit tests for base views."""

import json
from django.test import TestCase, Client
from django.contrib.sites.models import Site
from django.contrib.flatpages.models import FlatPage

from user.models import User


AJAX_HEADERS = {"HTTP_X_REQUESTED_WITH": "XMLHttpRequest"}


def json_post(client, url, data):
    return client.post(
        url,
        json.dumps(data),
        content_type="application/json",
        **AJAX_HEADERS,
    )


def ajax_get(client, url, params=None):
    return client.get(url, params or {}, **AJAX_HEADERS)


# ---------------------------------------------------------------------------
# flatpage view
# ---------------------------------------------------------------------------


class FlatpageViewTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.site = Site.objects.get_current()

    def test_unknown_url_returns_404(self):
        response = json_post(
            self.client,
            "/api/base/flatpage/",
            {"url": "/nonexistent-flatpage/"},
        )
        self.assertEqual(response.status_code, 404)

    def test_known_url_returns_200_with_content(self):
        page = FlatPage.objects.create(
            url="/about/",
            title="About Us",
            content="<p>Hello from the about page.</p>",
        )
        page.sites.add(self.site)
        response = json_post(
            self.client,
            "/api/base/flatpage/",
            {"url": "/about/"},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["title"], "About Us")
        self.assertIn("Hello from the about page", data["content"])

    def test_flatpage_on_different_site_not_visible(self):
        other_site = Site.objects.create(
            domain="other.example.com", name="Other"
        )
        page = FlatPage.objects.create(
            url="/other-only/",
            title="Other Site Only",
            content="secret",
        )
        page.sites.add(other_site)
        response = json_post(
            self.client,
            "/api/base/flatpage/",
            {"url": "/other-only/"},
        )
        self.assertEqual(response.status_code, 404)


# ---------------------------------------------------------------------------
# configuration view
# ---------------------------------------------------------------------------


class ConfigurationViewTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="configuser",
            email="configuser@example.com",
            password="pass",
            first_name="Config",
            last_name="User",
        )

    def test_anonymous_user_configuration(self):
        response = json_post(self.client, "/api/base/configuration/", {})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("user", data)
        self.assertFalse(data["user"]["is_authenticated"])
        self.assertIn("language", data)
        self.assertIn("ws_url_base", data)

    def test_authenticated_user_configuration(self):
        self.client.force_login(self.user)
        response = json_post(self.client, "/api/base/configuration/", {})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["user"]["is_authenticated"])
        self.assertEqual(data["user"]["username"], "configuser")
        self.assertEqual(data["user"]["first_name"], "Config")
        self.assertEqual(data["user"]["last_name"], "User")
        self.assertIn("emails", data["user"])
        self.assertIn("socialaccounts", data["user"])

    def test_configuration_includes_social_providers(self):
        response = json_post(self.client, "/api/base/configuration/", {})
        data = response.json()
        self.assertIn("socialaccount_providers", data)
        self.assertIsInstance(data["socialaccount_providers"], list)

    def test_authenticated_user_has_waiting_invites_field(self):
        self.client.force_login(self.user)
        response = json_post(self.client, "/api/base/configuration/", {})
        data = response.json()
        self.assertIn("waiting_invites", data["user"])

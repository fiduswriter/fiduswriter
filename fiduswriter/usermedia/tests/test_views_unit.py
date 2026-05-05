"""Unit tests for usermedia views."""

import json
import io
from PIL import Image as PilImage
from django.test import TestCase, Client
from django.core.files.uploadedfile import SimpleUploadedFile

from user.models import User
from usermedia.models import Image, UserImage, ImageCategory


AJAX_HEADERS = {"HTTP_X_REQUESTED_WITH": "XMLHttpRequest"}


def json_post(client, url, data):
    return client.post(
        url,
        json.dumps(data),
        content_type="application/json",
        **AJAX_HEADERS,
    )


def make_simple_png_bytes():
    """Create a minimal valid PNG image in memory."""
    buf = io.BytesIO()
    img = PilImage.new("RGB", (10, 10), color=(255, 0, 0))
    img.save(buf, format="PNG")
    return buf.getvalue()


class UsermediaDeleteViewTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="imgdeluser", password="pass"
        )
        self.other = User.objects.create_user(
            username="imgotheruser", password="pass"
        )
        self.client.force_login(self.user)

    def _create_image(self, owner):
        """Create a minimal Image + UserImage pair without an actual file.

        NOTE: Image.save() calls super().save() twice to save thumbnail info.
        Using Image.objects.create() passes force_insert=True to both calls,
        causing a UNIQUE constraint error on the second call. Instead we call
        img.save() directly so the second super().save() performs an UPDATE.
        """
        img = Image(uploader=owner)
        img.save()  # NOT .objects.create() – avoids double-INSERT issue
        user_img = UserImage.objects.create(
            title="Test Image", owner=owner, image=img
        )
        return img, user_img

    def test_delete_response_is_201(self):
        img, _user_img = self._create_image(self.user)
        response = json_post(
            self.client,
            "/api/usermedia/delete/",
            {"ids": [img.id]},
        )
        self.assertEqual(response.status_code, 201)

    def test_delete_removes_user_image(self):
        img, user_img = self._create_image(self.user)
        json_post(
            self.client,
            "/api/usermedia/delete/",
            {"ids": [img.id]},
        )
        self.assertFalse(UserImage.objects.filter(id=user_img.id).exists())

    def test_delete_removes_image_when_not_referenced(self):
        img, _user_img = self._create_image(self.user)
        img_id = img.id
        json_post(
            self.client,
            "/api/usermedia/delete/",
            {"ids": [img_id]},
        )
        self.assertFalse(Image.objects.filter(id=img_id).exists())

    def test_delete_does_not_remove_other_users_user_image(self):
        img, user_img = self._create_image(self.other)
        json_post(
            self.client,
            "/api/usermedia/delete/",
            {"ids": [img.id]},
        )
        # The other user's UserImage should not be deleted
        self.assertTrue(UserImage.objects.filter(id=user_img.id).exists())


class UsermediaImagesViewTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="imgslistuser", password="pass"
        )
        self.client.force_login(self.user)

    def test_images_returns_200(self):
        response = json_post(
            self.client,
            "/api/usermedia/images/",
            {},
        )
        self.assertEqual(response.status_code, 200)

    def test_images_returns_empty_list_when_no_images(self):
        response = json_post(
            self.client,
            "/api/usermedia/images/",
            {},
        )
        data = response.json()
        self.assertEqual(data["images"], [])

    def test_images_returns_image_categories(self):
        ImageCategory.objects.create(
            category_title="Nature", category_owner=self.user
        )
        response = json_post(
            self.client,
            "/api/usermedia/images/",
            {},
        )
        data = response.json()
        self.assertIn("imageCategories", data)


class UsermediaSaveCategoryViewTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="imgcatuser", password="pass"
        )
        self.client.force_login(self.user)

    def test_create_new_category(self):
        response = json_post(
            self.client,
            "/api/usermedia/save_category/",
            {"ids": [0], "titles": ["Landscapes"]},
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(len(data["entries"]), 1)
        self.assertEqual(data["entries"][0]["category_title"], "Landscapes")

    def test_update_existing_category(self):
        cat = ImageCategory.objects.create(
            category_title="Old Name", category_owner=self.user
        )
        response = json_post(
            self.client,
            "/api/usermedia/save_category/",
            {"ids": [cat.id], "titles": ["New Name"]},
        )
        self.assertEqual(response.status_code, 201)
        cat.refresh_from_db()
        self.assertEqual(cat.category_title, "New Name")

    def test_unlisted_categories_are_deleted(self):
        cat_keep = ImageCategory.objects.create(
            category_title="Keep", category_owner=self.user
        )
        cat_delete = ImageCategory.objects.create(
            category_title="Delete Me", category_owner=self.user
        )
        json_post(
            self.client,
            "/api/usermedia/save_category/",
            {"ids": [cat_keep.id], "titles": ["Keep"]},
        )
        self.assertTrue(ImageCategory.objects.filter(id=cat_keep.id).exists())
        self.assertFalse(
            ImageCategory.objects.filter(id=cat_delete.id).exists()
        )


class UsermediaSaveViewUnsupportedFiletypeTest(TestCase):
    """Test usermedia save view for unsupported filetype rejection."""

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="imguploader", password="pass"
        )
        self.client.force_login(self.user)

    def test_unsupported_filetype_returns_error(self):
        fake_file = SimpleUploadedFile(
            "malware.exe",
            b"MZ\x90\x00",
            content_type="application/octet-stream",
        )
        response = self.client.post(
            "/api/usermedia/save/",
            {"title": "bad file", "image": fake_file},
            **AJAX_HEADERS,
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("error", data["errormsg"])

from builtins import str
from builtins import object

import os
import uuid
from PIL import Image as PilImage
from io import BytesIO

from django.db import models
from django.contrib.auth.models import User
from django.db import IntegrityError
from django.core.files.uploadedfile import SimpleUploadedFile
from document.models import Document

ALLOWED_FILETYPES = ['image/jpeg', 'image/png', 'image/svg+xml']
ALLOWED_EXTENSIONS = ['jpeg', 'jpg', 'png', 'svg', 'jfif']


def get_file_path(instance, filename):
    ext = filename.split('.')[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise IntegrityError
    filename = "%s.%s" % (uuid.uuid4(), ext)
    return os.path.join('images', filename)


class Image(models.Model):
    uploader = models.ForeignKey(
        User,
        related_name='image_uploader',
        on_delete=models.deletion.SET_NULL,
        blank=True,
        null=True
    )
    added = models.DateTimeField(auto_now_add=True)
    image = models.FileField(upload_to=get_file_path)
    thumbnail = models.ImageField(
        upload_to='image_thumbnails',
        max_length=500,
        blank=True,
        null=True)
    file_type = models.CharField(max_length=20, blank=True, null=True)
    height = models.IntegerField(blank=True, null=True)
    width = models.IntegerField(blank=True, null=True)
    checksum = models.BigIntegerField(default=0)

    def __str__(self):
        return str(self.pk)

    def is_deletable(self):
        reverse_relations = [
            f for f in self._meta.model._meta.get_fields()
            if (f.one_to_many or f.one_to_one) and
            f.auto_created and not f.concrete
        ]

        for r in reverse_relations:
            if r.remote_field.model.objects.filter(
                **{r.field.name: self}
            ).exists():
                return False
        return True

    def create_checksum(self):
        if not self.image:
            return
        if self.checksum == 0:
            from time import time
            if hasattr(self.image.file, 'size'):
                self.checksum = int(
                    str(self.image.file.size) + str(time()).split('.')[0])
            else:
                self.checksum = time()

    def check_filetype(self):
        if not self.image:
            return
        if not hasattr(self.image.file, 'content_type'):
            return

        if self.image.file.content_type not in ALLOWED_FILETYPES:
            raise IntegrityError

    def create_thumbnail(self):
        # original code for this method came from
        # http://snipt.net/danfreak/generate-thumbnails-in-django-with-pil/

        # If there is no image associated with this.
        # do not create thumbnail
        if not self.image:
            return
        if not hasattr(self.image.file, 'content_type'):
            return

        # Set our max thumbnail size in a tuple (max width, max height)
        # THUMBNAIL_SIZE = (170,200)

        DJANGO_TYPE = self.image.file.content_type

        if DJANGO_TYPE == 'image/jpeg':
            PIL_TYPE = 'jpeg'
            FILE_EXTENSION = 'jpg'
            self.file_type = DJANGO_TYPE
        elif DJANGO_TYPE == 'image/png':
            PIL_TYPE = 'png'
            FILE_EXTENSION = 'png'
            self.file_type = DJANGO_TYPE
        else:
            self.file_type = DJANGO_TYPE
            return

        # Open original photo which we want to thumbnail using PIL's Image
        image = PilImage.open(BytesIO(self.image.read()))

        self.width, self.height = image.size

        # cropping the thumbnail to exactly 60 x 60 px
        src_width, src_height = image.size
        dst_width = dst_height = 60

        if src_width < src_height:
            crop_width = crop_height = src_width
            x_offset = 0
            y_offset = int((src_height - crop_height)/2)
        else:
            crop_width = crop_height = src_height
            x_offset = int((src_width - crop_width)/2)
            y_offset = 0

        image = image.crop(
            (x_offset,
             y_offset,
             x_offset +
             int(crop_width),
                y_offset +
                int(crop_height)))

        # Convert to RGB if necessary
        # Thanks to Limodou on DjangoSnippets.org
        # http://www.djangosnippets.org/snippets/20/
        #
        # I commented this part since it messes up my png files
        #
        # if image.mode not in ('L', 'RGB'):
        #    image = image.convert('RGB')

        # We use our PIL Image object to create the thumbnail, which already
        # has a thumbnail() convenience method that contrains proportions.
        # Additionally, we use Image.ANTIALIAS to make the image look better.
        # Without antialiasing the image pattern artifacts may result.
        image.thumbnail((dst_width, dst_height), PilImage.ANTIALIAS)

        # Save the thumbnail
        temp_handle = BytesIO()
        image.save(temp_handle, PIL_TYPE)
        temp_handle.seek(0)

        # Save image to a SimpleUploadedFile which can be saved into
        # ImageField
        suf = SimpleUploadedFile(os.path.split(
            self.image.name)[-1], temp_handle.read(), content_type=DJANGO_TYPE)
        # Save SimpleUploadedFile into image field
        self.thumbnail.save(
            '%s_thumbnail.%s' %
            (os.path.splitext(
                suf.name)[0],
                FILE_EXTENSION),
            suf,
            save=False)

    def save(self, *args, **kwargs):
        # create a thumbnail
        self.create_checksum()
        self.check_filetype()
        self.create_thumbnail()

        super().save(*args, **kwargs)


def default_copyright():
    return dict({
        "holder": False,
        "year": False,
        "freeToRead": True,
        "licenses": []
    })


# Image linked to a particular User.
class UserImage(models.Model):
    title = models.CharField(max_length=128)
    copyright = models.JSONField(default=default_copyright)
    owner = models.ForeignKey(
        User,
        related_name='image_owner',
        blank=True,
        null=True,
        on_delete=models.deletion.CASCADE
    )
    cats = models.JSONField(default=list)
    image = models.ForeignKey(
        Image,
        on_delete=models.deletion.CASCADE
    )

    def __str__(self):
        if len(self.title) > 0:
            return self.title
        else:
            return str(self.pk)


# Image linked to a document
class DocumentImage(models.Model):
    title = models.CharField(max_length=128, default='')
    copyright = models.JSONField(default=default_copyright)
    document = models.ForeignKey(
        Document,
        on_delete=models.deletion.CASCADE
    )
    image = models.ForeignKey(
        Image,
        on_delete=models.deletion.CASCADE
    )

    def __str__(self):
        if len(self.title) > 0:
            return self.title
        else:
            return str(self.pk)


# category
class ImageCategory(models.Model):
    category_title = models.CharField(max_length=100)
    category_owner = models.ForeignKey(
        User,
        on_delete=models.deletion.CASCADE
    )

    def __str__(self):
        return self.category_title

    class Meta(object):
        verbose_name_plural = 'Image categories'

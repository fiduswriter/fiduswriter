from time import mktime

from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.template.context_processors import csrf
from django.http import JsonResponse
from django.core.serializers.python import Serializer
from django.utils.translation import ugettext as _

from document.models import AccessRight, CAN_UPDATE_DOCUMENT
from usermedia.models import Image, ImageCategory, UserImage

from .models import ALLOWED_FILETYPES


class SimpleSerializer(Serializer):

    def end_object(self, obj):
        self._current['id'] = obj._get_pk_val()
        self.objects.append(self._current)
serializer = SimpleSerializer()


@login_required
def index(request):
    response = {}
    response.update(csrf(request))
    return render(request, 'usermedia/index.html', response)


# save changes or create a new entry
@login_required
def save_js(request):
    response = {}
    response['errormsg'] = {}
    status = 403
    if request.is_ajax() and request.method == 'POST':
        the_id = int(request.POST['id'])
        if 'owner_id' in request.POST:
            owner_id = int(request.POST['owner_id'])
            if owner_id != request.user.id:
                if not check_write_access_rights(owner_id, request.user):
                    return False
        else:
            owner_id = request.user.id
        if 'image' in request.FILES and \
                request.FILES['image'].content_type not in ALLOWED_FILETYPES:
            status = 200  # Not implemented
            response['errormsg']['error'] = _('Filetype not supported')
        else:
            # We only allow owners to change their images.
            user_image = UserImage.objects.filter(
                pk=the_id,
                owner=request.user
            )
            if user_image.exists():
                user_image = user_image[0]
                image = user_image.image
                status = 200
            else:
                image = Image()
                image.uploader = request.user
                image.owner_id = owner_id
                user_image = UserImage()
                status = 201
                if 'checksum' in request.POST:
                    image.checksum = request.POST['checksum']
            user_image.title = request.POST['title']
            if 'imageCat' in request.POST:
                user_image.image_cat = request.POST['imageCat']
            if 'image' in request.FILES:
                image.image = request.FILES['image']
            if status == 201 and 'image' not in request.FILES:
                status = 200
                response['errormsg']['error'] = _('No file uploaded')
            else:
                image.save()
                user_image.image = image
                user_image.save()
                response['values'] = {
                    'pk': image.pk,
                    'title': user_image.title,
                    'image': image.image.url,
                    'file_type': image.file_type,
                    'added': mktime(image.added.timetuple()) * 1000,
                    'checksum': image.checksum,
                    'cats': user_image.image_cat.split(',')
                }
                if image.thumbnail:
                    response['values']['thumbnail'] = image.thumbnail.url
                    response['values']['height'] = image.height
                    response['values']['width'] = image.width
    return JsonResponse(
        response,
        status=status
    )


# delete an image
@login_required
def delete_js(request):
    status = 405
    response = {}
    if request.is_ajax() and request.method == 'POST':
        status = 201
        ids = request.POST.getlist('ids[]')
        user_image = UserImage.objects.filter(pk__in=ids, owner=request.user)
        image = user_image.image
        user_image.delete()
        if len(image.userimage_set.all()) == 0:
            # There are no more links from user images to image, so delete it.
            image.delete()
    return JsonResponse(
        response,
        status=status
    )


def check_read_access_rights(other_user_id, this_user):
    other_user_id = int(other_user_id)
    has_access = False
    if other_user_id == 0:
        has_access = True
    elif other_user_id == this_user.id:
        has_access = True
    elif AccessRight.objects.filter(
        document__owner=other_user_id,
        user=this_user
    ).count() > 0:
        has_access = True
    return has_access


def check_write_access_rights(other_user_id, this_user):
    other_user_id = int(other_user_id)
    has_access = False
    if other_user_id == 0:
        has_access = True
    elif other_user_id == this_user.id:
        has_access = True
    elif AccessRight.objects.filter(
        document__owner=other_user_id,
        user=this_user,
        rights__in=CAN_UPDATE_DOCUMENT
    ).count() > 0:
        has_access = True
    return has_access


# returns list of images
@login_required
def images_js(request):
    response = {}
    status = 403
    if request.is_ajax() and request.method == 'POST':
        user_id = request.POST['owner_id']
        if len(user_id.split(',')) > 1:
            user_ids = user_id.split(',')
            status = 200
            for user_id in user_ids:
                if check_read_access_rights(user_id, request.user) is False:
                    status = 403
            if status == 200:
                user_images = UserImage.objects.filter(owner__in=user_ids)
                response['imageCategories'] = serializer.serialize(
                    ImageCategory.objects.filter(category_owner__in=user_ids))
        else:
            if check_read_access_rights(user_id, request.user):
                if int(user_id) == 0:
                    user_id = request.user.id
                user_images = UserImage.objects.filter(owner=user_id)
                status = 200
                response['imageCategories'] = serializer.serialize(
                    ImageCategory.objects.filter(category_owner=user_id))
        if status == 200:
            response['images'] = []
            for user_image in user_images:
                image = user_image.image
                if image.image:
                    field_obj = {
                        'pk': image.pk,
                        'title': user_image.title,
                        'image': image.image.url,
                        'file_type': image.file_type,
                        'added': mktime(image.added.timetuple()) * 1000,
                        'checksum': image.checksum,
                        'cats': user_image.image_cat.split(',')
                    }
                    if image.thumbnail:
                        field_obj['thumbnail'] = image.thumbnail.url
                        field_obj['height'] = image.height
                        field_obj['width'] = image.width
                    response['images'].append(field_obj)
    return JsonResponse(
        response,
        status=status
    )


# save changes or create a new category
@login_required
def save_category_js(request):
    status = 405
    response = {}
    response['entries'] = []
    if request.is_ajax() and request.method == 'POST':
        ids = request.POST.getlist('ids[]')
        titles = request.POST.getlist('titles[]')
        x = 0
        for the_id in ids:
            the_id = int(the_id)
            the_title = titles[x]
            x += 1
            if 0 == the_id:
                # if the category is new, then create new
                the_cat = ImageCategory(
                    category_title=the_title,
                    category_owner=request.user)
            else:
                # if the category already exists, update the title
                the_cat = ImageCategory.objects.get(pk=the_id)
                the_cat.category_title = the_title
            the_cat.save()
            response['entries'].append(
                {'id': the_cat.id, 'category_title': the_cat.category_title})
        status = 201

    return JsonResponse(
        response,
        status=status
    )

# delete a category


@login_required
def delete_category_js(request):
    status = 405
    response = {}
    if request.is_ajax() and request.method == 'POST':
        ids = request.POST.getlist('ids[]')
        for id in ids:
            ImageCategory.objects.get(pk=int(id)).delete()
        status = 201

    return JsonResponse(
        response,
        status=status
    )

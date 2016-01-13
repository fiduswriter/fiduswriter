#
# This file is part of Fidus Writer <http://www.fiduswriter.org>
#
# Copyright (C) 2013 Takuto Kojima, Johannes Wilm
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as
# published by the Free Software Foundation, either version 3 of the
# License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.

import json
from time import mktime

from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.template.context_processors import csrf
from django.http import JsonResponse
from django.contrib.auth.models import User
from django.core.serializers.python import Serializer

from document.models import AccessRight
from usermedia.models import Image, ImageCategory

class SimpleSerializer(Serializer):
    def end_object( self, obj ):
        self._current['id'] = obj._get_pk_val()
        self.objects.append( self._current )
serializer = SimpleSerializer()

@login_required
def index(request):
    response = {}

    response.update(csrf(request))
    return render(request, 'usermedia/index.html', response)

#save changes or create a new entry
@login_required
def save_js(request):
    response = {}
    response['errormsg'] = {}
    status = 403
    if request.is_ajax() and request.method == 'POST' :
        the_id    = int(request.POST['id'])
        image  = Image.objects.filter(pk = the_id, uploader = request.user)
        if image.exists():
            image = image[0]
            status = 200
        else:
            image = Image()
            image.uploader = request.user
            status = 201
            if 'checksum' in request.POST:
                image.checksum = request.POST['checksum']
        image.title = request.POST['title']
        if 'imageCat' in request.POST:
            image.image_cat = request.POST['imageCat']
        if 'image' in request.FILES:
            image.image = request.FILES['image']
        image.save()
        response['values'] = {
            'pk': image.pk,
            'title': image.title,
            'image': image.image.url,
            'file_type': image.file_type,
            'added': mktime(image.added.timetuple())*1000,
            'checksum': image.checksum,
            'cats': image.image_cat.split(',')
        }
        if image.thumbnail:
            response['values']['thumbnail'] = image.thumbnail.url
            response['values']['height'] = image.height
            response['values']['width'] = image.width
    return JsonResponse(
        response,
        status=status
    )



#delete an image
@login_required
def delete_js(request):
    status = 405
    response = {}
    if request.is_ajax() and request.method == 'POST' :
        status = 201
        ids = request.POST.getlist('ids[]')
        Image.objects.filter(pk__in = ids, uploader = request.user).delete()
    return JsonResponse(
        response,
        status=status
    )


def check_access_rights(other_user_id, this_user):
    other_user_id = int(other_user_id)
    has_access = False
    if other_user_id == 0:
        has_access = True
    elif other_user_id == this_user.id:
        has_access = True
    elif AccessRight.objects.filter(document__owner=other_user_id, user=this_user).count() > 0:
        has_access = True
    return has_access

#returns list of images
@login_required
def images_js(request):
    response = {}
    status = 403
    if request.is_ajax() and request.method == 'POST' :
        user_id = request.POST['owner_id']
        if len(user_id.split(',')) > 1:
            user_ids = user_id.split(',')
            status = 200
            for user_id in user_ids:
                if check_access_rights(user_id, request.user) == False:
                    status = 403
            if status == 200:
                images = Image.objects.filter(uploader__in = user_ids)
                response['imageCategories']  = serializer.serialize(ImageCategory.objects.filter(category_owner__in = user_ids))
        else:
            if check_access_rights(user_id, request.user):
                if int(user_id) == 0:
                    user_id = request.user.id
                images = Image.objects.filter(uploader = user_id)
                status = 200
                response['imageCategories']  = serializer.serialize(ImageCategory.objects.filter(category_owner = user_id))
        if status == 200:
            response['images'] = []
            for image in images :
                field_obj = {
                    'pk': image.pk,
                    'title': image.title,
                    'image': image.image.url,
                    'file_type': image.file_type,
                    'added': mktime(image.added.timetuple())*1000,
                    'checksum': image.checksum,
                    'cats': image.image_cat.split(',')
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

#save changes or create a new category
@login_required
def save_category_js(request):
    status = 405
    response = {}
    response['entries'] = []
    if request.is_ajax() and request.method == 'POST' :
        ids = request.POST.getlist('ids[]')
        titles = request.POST.getlist('titles[]')
        x = 0;
        for the_id in ids :
            the_id = int(the_id)
            the_title = titles[x]
            x += 1
            if 0 == the_id :
                #if the category is new, then create new
                the_cat = ImageCategory(category_title = the_title, category_owner = request.user)
            else :
                #if the category already exists, update the title
                the_cat = ImageCategory.objects.get(pk = the_id)
                the_cat.category_title = the_title
            the_cat.save()
            response['entries'].append({'id': the_cat.id, 'category_title': the_cat.category_title});
        status = 201

    return JsonResponse(
        response,
        status=status
    )

#delete a category
@login_required
def delete_category_js(request):
    status = 405
    response = {}
    if request.is_ajax() and request.method == 'POST' :
        ids = request.POST.getlist('ids[]')
        for id in ids :
            ImageCategory.objects.get(pk = int(id)).delete()
        status = 201

    return JsonResponse(
        response,
        status=status
    )

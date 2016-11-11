import time
import json
from builtins import range

from django.shortcuts import render
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.template.context_processors import csrf
from django.db import IntegrityError
from django.db.models import Max, Count
from django.core.serializers.python import Serializer

from bibliography.models import (
    Entry,
    EntryType,
    EntryCategory
)

from document.models import AccessRight


class SimpleSerializer(Serializer):

    def end_object(self, obj):
        self._current['id'] = obj._get_pk_val()
        self.objects.append(self._current)
serializer = SimpleSerializer()


@login_required
def index(request):
    response = {}
    response.update(csrf(request))
    return render(request, 'bibliography/index.html', response)


def save_bib_to_db(inserting_obj, suffix):
    try:
        the_entry = Entry(**inserting_obj)
        the_entry.save()
        return the_entry
    except IntegrityError:
        similar = Entry.objects.filter(**inserting_obj)
        if (len(similar) == 0):
            old_entry_key = inserting_obj['entry_key']
            new_suffix = suffix + 1
            if suffix == 0:
                new_entry_key = old_entry_key + '_1'
            else:
                new_entry_key = old_entry_key[
                    :-(len(str(suffix)) + 1)] + '_' + str(new_suffix)
            inserting_obj['entry_key'] = new_entry_key
            return save_bib_to_db(inserting_obj, new_suffix)
        else:
            # At least one similar entry exists. Return the first match.
            # This is important for BibTranslationTable on doc import
            return similar[0]


def check_access_rights(other_user_id, this_user):
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

# returns list of bibliography items


@login_required
def biblist_js(request):
    response = {}
    status = 403
    if request.is_ajax() and request.method == 'POST':
        user_id = request.POST['owner_id']
        if len(user_id.split(',')) > 1:
            user_ids = user_id.split(',')
            status = 200
            for user_id in user_ids:
                if check_access_rights(user_id, request.user) is False:
                    status = 403
            if status == 200:
                response['bibList'] = serializer.serialize(
                    Entry.objects.filter(
                        entry_owner__in=user_ids), fields=(
                            'entry_key',
                            'entry_owner',
                            'entry_type',
                            'entry_cat',
                            'fields'
                        )
                    )
                response['bibCategories'] = serializer.serialize(
                    EntryCategory.objects.filter(category_owner__in=user_ids))
        else:
            if check_access_rights(user_id, request.user):
                if int(user_id) == 0:
                    user_id = request.user.id
                if user_id == request.user.id and request.POST.__contains__(
                        'last_modified'):
                    last_modified_onclient = int(request.POST['last_modified'])
                    number_of_entries_onclient = int(
                        request.POST['number_of_entries'])
                    aggregation_values = Entry.objects.filter(
                        entry_owner=user_id).aggregate(
                        Max('last_modified'), Count('id'))
                    last_modified__max = aggregation_values[
                        'last_modified__max']
                    number_of_entries_onserver = aggregation_values[
                        'id__count']
                    if last_modified__max:
                        last_modified_onserver = int(
                            time.mktime(last_modified__max.timetuple()))
                    else:
                        last_modified_onserver = 0
                    if (
                        last_modified_onclient < last_modified_onserver or
                        number_of_entries_onclient > number_of_entries_onserver
                    ):
                        response['bibList'] = serializer.serialize(
                            Entry.objects.filter(
                                entry_owner=user_id), fields=(
                                    'entry_key',
                                    'entry_owner',
                                    'entry_type',
                                    'entry_cat',
                                    'fields'
                                )
                            )
                        response['last_modified'] = last_modified_onserver
                        response[
                            'number_of_entries'] = number_of_entries_onserver
                else:
                    response['bibList'] = serializer.serialize(
                        Entry.objects.filter(
                            entry_owner=user_id
                        ), fields=(
                            'entry_key',
                            'entry_owner',
                            'entry_type',
                            'entry_cat',
                            'fields'
                        )
                    )
                response['bibCategories'] = serializer.serialize(
                    EntryCategory.objects.filter(category_owner=user_id))
                status = 200
    return JsonResponse(
        response,
        status=status
    )


# bibtex file import
@login_required
def import_bibtex_js(request):
    response = {}
    status = 405
    if request.is_ajax() and request.method == 'POST':
        bibs = json.loads(request.POST['bibs'])
        status = 200
        e_types = {}
        for e_type in EntryType.objects.all():
            e_types[e_type.type_name] = e_type
        new_bibs = []
        response['key_translations'] = {}
        for bib_key in bibs:
            bib = bibs[bib_key]
            bib_type_name = bib['bibtype']
            del bib['bibtype']
            # the entry type must exists
            if bib_type_name in e_types:
                the_type = e_types[bib_type_name]

            inserting_obj = {
                'entry_key': bib_key,
                'entry_owner': request.user,
                'entry_type': the_type,
                'fields': json.dumps(bib)
            }
            the_entry = save_bib_to_db(inserting_obj, 0)
            if the_entry:
                new_bibs.append(the_entry)
                response['key_translations'][bib_key] = the_entry.entry_key
            response['bibs'] = serializer.serialize(
                new_bibs,
                fields=(
                    'entry_key',
                    'entry_owner',
                    'entry_type',
                    'entry_cat',
                    'fields'))
    return JsonResponse(
        response,
        status=status
    )


# save changes or create a new entry
@login_required
def save_js(request):
    response = {}
    response['errormsg'] = {}
    status = 403
    if request.is_ajax() and request.method == 'POST':
        owner_id = request.user.id
        bib_data = json.loads(request.POST['bib_data'])
        if 'owner_id' in bib_data:
            requested_owner_id = int(bib_data['owner_id'])
            # If the user has write access to at least one document of another
            # user, we allow him to add new and edit bibliography entries of
            # this user.
            if len(AccessRight.objects.filter(
                    document__owner=requested_owner_id,
                    user=request.user.id, rights='w')) > 0:
                owner_id = requested_owner_id
        status = 200
        the_id = bib_data['id']
        the_cat = bib_data['entry_cat']
        the_fields = bib_data['fields']
        the_type = EntryType.objects.filter(pk=int(bib_data['entry_type']))
        # the entry type must exists
        if the_type.exists():
            the_type = the_type[0]

            if 0 < the_id:  # saving changes
                the_entry = Entry.objects.get(
                    pk=the_id,
                    entry_owner=owner_id
                )
                the_entry.entry_type = the_type
            else:  # creating a new entry
                status = 201
                the_entry = Entry(
                    entry_key='tmp_key',
                    entry_owner_id=owner_id,
                    entry_type=the_type
                )
                the_entry.save()
                the_entry.entry_key = 'Fidusbibliography_' + str(
                    the_entry.id
                )
            # clear categories of the entry to restore them new
            the_entry.entry_cat = the_cat
            the_entry.fields = json.dumps(the_fields)
            the_entry.save()
            response['values'] = serializer.serialize(
                [the_entry],
                fields=(
                    'entry_key',
                    'entry_owner',
                    'entry_type',
                    'entry_cat',
                    'fields'
                )
            )
        else:
            # if the entry type doesn't exist
            status = 202
            errormsg = 'this type of entry does not exist.'
            response['errormsg']['error'] = errormsg

    return JsonResponse(
        response,
        status=status
    )


# delete an entry
@login_required
def delete_js(request):
    status = 405
    response = {}
    if request.is_ajax() and request.method == 'POST':
        status = 201
        ids = request.POST.getlist('ids[]')
        id_chunks = [ids[x:x + 100] for x in range(0, len(ids), 100)]
        for id_chunk in id_chunks:
            Entry.objects.filter(
                pk__in=id_chunk,
                entry_owner=request.user
            ).delete()
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
                the_cat = EntryCategory(
                    category_title=the_title,
                    category_owner=request.user
                )
            else:
                # if the category already exists, update the title
                the_cat = EntryCategory.objects.get(pk=the_id)
                the_cat.category_title = the_title
            the_cat.save()
            response['entries'].append(
                {'id': the_cat.id, 'category_title': the_cat.category_title}
            )
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
            EntryCategory.objects.get(pk=int(id)).delete()
        status = 201

    return JsonResponse(
        response,
        status=status
    )

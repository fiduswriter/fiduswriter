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

import time
import json

from django.conf import settings
from django.shortcuts import render_to_response
from django.http import HttpResponse
from django.contrib.auth.decorators import login_required
from django.core.context_processors import csrf
from django.core.exceptions import ValidationError
from django.template import RequestContext
from django.db import transaction, IntegrityError
from django.contrib.auth.models import User
from django.db.models import Max, Count

from bibliography.models import Entry, EntryType, EntryField, EntryCategory, EntryTypeAlias, EntryFieldAlias

from document.models import AccessRight

from django.core.serializers.python import Serializer

class SimpleSerializer(Serializer):
    def end_object( self, obj ):
        self._current['id'] = obj._get_pk_val()
        self.objects.append( self._current )
serializer = SimpleSerializer()

@login_required
def index(request):
    response = {}
    
    response.update(csrf(request))
    return render_to_response('bibliography/index.html', response, context_instance = RequestContext(request))

def save_bib_to_db(inserting_obj):
    try:
        the_entry = Entry(**inserting_obj)
        the_entry.save()
        return the_entry
    except IntegrityError:
        similar = Entry.objects.filter(**inserting_obj)
        if (len(similar) == 0):
            inserting_obj['entry_key'] = inserting_obj['entry_key']+ '+'
            return save_bib_to_db(inserting_obj)
        else:
            return False

#bibtex file import
@login_required
@transaction.commit_on_success
def import_bibtex_js(request):
    response = {}
    status = 405
    if request.is_ajax() and request.method == 'POST' :
        from bibliography.bib import Persons
        from bibliography.bib import BibDate
        response['errors'] = []
        response['warning'] = []
        bibs = json.loads(request.POST['bibs'])
        status = 200
        e_types = {}
        for e_type in EntryType.objects.all():
            e_types[e_type.type_name] = e_type
        e_types_alias = {}
        for e_type in EntryTypeAlias.objects.all():
            e_types_alias[e_type.type_name] = e_type
        e_fields = {}
        for e_field in EntryField.objects.all():
            e_fields[e_field.field_name] = e_field
        e_fields_alias = {}
        for e_field in EntryFieldAlias.objects.all():
            e_fields_alias[e_field.field_name] = e_field
        new_bibs = []
        response['bib_ids']=[]
        for bib_key in bibs :
            bib = bibs[bib_key]
            bib_type_name = bib['bibtype']
            #the entry type must exists
            try:
                the_type = e_types[bib_type_name]
            except KeyError:
                try:
                    type_alias = e_types_alias[bib_type_name]
                    the_type = type_alias.type_alias
                except KeyError:
                    the_type  = e_types['misc']
                    response['warning'].append(bib_key + ' is saved as misc. Fidus Writer does not support "' + bib_type_name + '"')
            inserting_obj = {
                'entry_key': bib_key,
                'entry_owner': request.user,
                'entry_type': the_type
            }
            the_fields = {}
            #save the posted values
            for key, val in bib.iteritems() :
                if key in ['bibtype', 'year', 'month'] :
                    #do not save the value of type, year and month
                    continue
                else :
                    try:
                        field_type = e_fields[key]
                    except KeyError:
                        try:
                            field_alias = e_fields_alias[key]
                            field_type = field_alias.field_alias
                        except KeyError:
                            response['errors'].append(key + ' of ' + bib_key + ' could not be saved. Fidus Writer does not support the field.')
                            continue
                    if 'l_name' == field_type.field_type :
                        #restore name list value like "author"
                        persons = Persons(val)
                        val = persons.get_names()
                    elif 'f_date' == field_type.field_type :
                        #restore date value like "date"
                        bib_date = BibDate(val)
                        val = bib_date.date
                    if isinstance(val, basestring) :
                        val = val.strip("{}")
                    if isinstance(val, list) :
                        val = ' and '.join(val)
                    the_fields[field_type.field_name] = val
            inserting_obj['fields'] = json.dumps(the_fields)        
            the_entry = save_bib_to_db(inserting_obj)
            if the_entry != False:
                new_bibs.append(the_entry)
                response['bib_ids'].append(the_entry.id)
            response['bibs'] = serializer.serialize(new_bibs, fields=('entry_key', 'entry_owner', 'entry_type', 'entry_cat', 'fields'))
    return HttpResponse(
        json.dumps(response),
        content_type = 'application/json; charset=utf8',
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

#returns list of bibliography items
@login_required
def biblist_js(request):
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
                response['bibList'] = serializer.serialize(Entry.objects.filter(entry_owner__in = user_ids), fields=('entry_key', 'entry_owner', 'entry_type', 'entry_cat', 'fields'))
                response['bibCategories']  = serializer.serialize(EntryCategory.objects.filter(category_owner__in = user_ids)) 
        else:
            if check_access_rights(user_id, request.user):
                if int(user_id) == 0:
                    user_id = request.user.id
                if user_id == request.user.id and request.POST.__contains__('last_modified'):    
                    last_modified_onclient = int(request.POST['last_modified'])
                    number_of_entries_onclient = int(request.POST['number_of_entries'])
                    aggregation_values = Entry.objects.filter(entry_owner=user_id).aggregate(Max('last_modified'),Count('id'))
                    last_modified__max = aggregation_values['last_modified__max']
                    number_of_entries_onserver = aggregation_values['id__count']
                    if last_modified__max:
                        last_modified_onserver = int(time.mktime(last_modified__max.timetuple()))
                    else:
                        last_modified_onserver = 0
                    if last_modified_onclient < last_modified_onserver or number_of_entries_onclient > number_of_entries_onserver:
                        response['bibList'] = serializer.serialize(Entry.objects.filter(entry_owner = user_id), fields=('entry_key', 'entry_owner', 'entry_type', 'entry_cat', 'fields'))
                        response['last_modified'] = last_modified_onserver
                        response['number_of_entries'] = number_of_entries_onserver
                else:
                    response['bibList'] = serializer.serialize(Entry.objects.filter(entry_owner = user_id), fields=('entry_key', 'entry_owner', 'entry_type', 'entry_cat', 'fields'))
                response['bibCategories']  = serializer.serialize(EntryCategory.objects.filter(category_owner = user_id))
                status = 200                
    return HttpResponse(
        json.dumps(response),
        content_type = 'application/json; charset=utf8',
        status=status
    )
           

#save changes or create a new entry
@login_required
def save_js(request):
    response = {}
    response['errormsg'] = {}
    status = 403
    if request.is_ajax() and request.method == 'POST' :
        owner_id = request.user.id
        if 'owner_id' in request.POST:
            requested_owner_id = int(request.POST['owner_id'])
            # If the user has write access to at least one document of another 
            # user, we allow him to add new and edit bibliography entries of 
            # this user.
            if len(AccessRight.objects.filter(
                document__owner = requested_owner_id, 
                user = request.user.id, rights = 'w')) > 0:
                owner_id = requested_owner_id
        status = 200
        the_id    = int(request.POST['id'])            
        the_type  = EntryType.objects.filter(pk = int(request.POST['entrytype']))
        #the entry type must exists
        if the_type.exists() :
            the_type = the_type[0]
            the_fields = {}
            the_cat = ''
            #save the posted values
            for key, val in request.POST.iteritems() :
                if 'id' == key or 'entrytype' == key:
                    #do nothing, if it is the ID or EntryType
                    continue
                elif 'entryCat[]' == key :
                    #categories are given as Array
                    #store them with loop
                    val = request.POST.getlist(key)
                    the_cat = ','.join(val)
                else :
                    #store other values into EntryValues
                    if 0 < key.find('[]') :
                        val = request.POST.getlist(key)
                    key = key[6:] #key should be formed like "eField" + name of the value type
                    key = key.replace('[]', '')
                    f_type = EntryField.objects.filter(field_name = key)
                    if f_type.exists():
                        f_type = f_type[0]
                    else:
                        continue
                    
                    if '' == val :
                        pass
                    elif 'null' == val :
                        #empty value not allowed
                        response['errormsg']['eField' + key] = 'Value must not be empty'
                        continue
                    elif f_type.field_type == 'f_date' :
                        #reform date field
                        dates = val.split('-')
                        new_value = []
                        i = 0
                        for each_date in dates :
                            date_parts = each_date.split('/')
                            new_value.append('');
                            new_value[i] += date_parts[0] if date_parts[0].isdigit() else 'AA'
                            new_value[i] += '-' + date_parts[1] if 2 <= len(date_parts) and date_parts[1].isdigit() else '-AA'
                            new_value[i] += '-' + date_parts[2] if 3 <= len(date_parts) and date_parts[2].isdigit() else '-AA'
                            i += 1
                        val = new_value[0] if 1 == len(new_value) else new_value[0] + '/' + new_value[1]
                    elif f_type.field_type == 'f_integer' :
                        #must be int
                        try :
                            val = int(val, 10)
                        except ValueError, e :
                            response['errormsg']['eField' + key] = 'Value must be number'
                            continue
                    elif f_type.field_type in ['l_name', 'l_literal', 'l_key'] :
                        if isinstance(val, list) :
                            val = ' and '.join(val);
                            
                    the_fields[f_type.field_name] = val
                    #setattr(the_entry, f_type.field_name, val)
                    
            if 0 == len(response['errormsg']) :
                if 0 < the_id : #saving changes
                    the_entry = Entry.objects.get(pk=the_id, entry_owner = owner_id)
                    the_entry.entry_type = the_type
                else : #creating a new entry
                    status = 201
                    the_entry = Entry(entry_key = 'tmp_key', entry_owner_id = owner_id, entry_type = the_type)
                    the_entry.save()
                    the_entry.entry_key = 'Fidusbibliography_' + str(the_entry.id)
                #clear categories of the entry to restore them new
                the_entry.entry_cat = the_cat
                the_entry.fields = json.dumps(the_fields)
                the_entry.save()
                response['values']  = serializer.serialize([the_entry], fields=('entry_key', 'entry_owner', 'entry_type', 'entry_cat', 'fields'))
        else :
            #if the entry type doesn't exist
            status = 202
            response['errormsg']['error'] = 'this type of entry does not exist.'
            
    return HttpResponse(
        json.dumps(response),
        content_type = 'application/json; charset=utf8',
        status=status
    )

#delete an entry
@login_required
def delete_js(request):
    status = 405
    if request.is_ajax() and request.method == 'POST' :
        status = 201
        ids = request.POST.getlist('ids[]')
        id_chunks=[ids[x:x+100] for x in xrange(0, len(ids), 100)]
        for id_chunk in id_chunks:
            Entry.objects.filter(pk__in = id_chunk, entry_owner = request.user).delete()
    return HttpResponse(status=status)

#save changes or create a new category
@login_required
def save_category_js(request):
    status = 405
    response = []
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
                the_cat = EntryCategory(category_title = the_title, category_owner = request.user)
            else :
                #if the category already exists, update the title
                the_cat = EntryCategory.objects.get(pk = the_id)
                the_cat.category_title = the_title
            the_cat.save()
            response.append({'id': the_cat.id, 'category_title': the_cat.category_title});
        status = 201
        
    return HttpResponse(
        json.dumps(response),
        content_type = 'application/json; charset=utf8',
        status=status
    )

#delete a category
@login_required
def delete_category_js(request):
    status = 405
    if request.is_ajax() and request.method == 'POST' :
        ids = request.POST.getlist('ids[]')
        for id in ids :
            EntryCategory.objects.get(pk = int(id)).delete()    
        status = 201
        
    return HttpResponse(status=status)
        
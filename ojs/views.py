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

import json, uuid, urllib, zipfile, StringIO

from io import BytesIO  

from django.http import HttpResponseRedirect, HttpResponse
from django.contrib.auth.decorators import login_required
from django.contrib.auth import logout
from django.core.context_processors import csrf
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.models import User
from django.core.files import File
from django.conf import settings
from django.views.defaults import bad_request
from django.utils.translation import ugettext as _

from usermedia.models import Image
from bibliography.models import Entry, EntryType, EntryField
from document.models import Document

from . import utils

@csrf_exempt
def index(request):
    if request.method == 'POST' and 'op' in request.POST:
        op = request.POST['op']
        if "validate" == op and 'apiKey' in request.POST:
            if settings.OJS_API_KEY == request.POST['apiKey']:
                return HttpResponse("OK")
            
        elif "edit" == op and all(key in request.POST for key in ("articleId", "apiUrl", "saveAccessKey", "redirectUrl")):
            #first: create a one-time account
            u_data = utils.make_tmp_user_data()
            if(utils.make_tmp_user(request, u_data)):
                tmp_u = utils.login_tmp_user(request, u_data['username'], u_data['password1'])
                request.session['ojs_articleId'] = request.POST['articleId']
                request.session['ojs_apiUrl'] = request.POST['apiUrl']
                request.session['ojs_saveAccessKey'] = request.POST['saveAccessKey']
                request.session['ojs_redirectUrl'] = request.POST['redirectUrl']
                if('loadAccessKey' in request.POST):
                    #second: open the existing document - unzip fidus-file from ojs and create new document
                    try:
                        data = urllib.urlencode({
                            'articleId': request.POST['articleId'],
                            'op': 'load',
                            'accessKey': request.POST['loadAccessKey']
                        })
                        response = urllib.urlopen(request.POST['apiUrl'], data)
                        raw_data = response.read()
                        fidusdata = StringIO.StringIO(raw_data)
                        fidusfile = zipfile.ZipFile(fidusdata)
                    except Exception as e:
                        return HttpResponse(e.message)
                    else:
                        name_list = fidusfile.namelist()
                        if all (key in name_list for key in ("filetype-version", "mimetype", "document.json", "images.json", "bibliography.json")):
                            if("1.1" == fidusfile.read('filetype-version') and "application/fidus+zip" == fidusfile.read('mimetype')):                        
                                #import images
                                imgs_json = json.loads(fidusfile.read('images.json'))
                                for img in imgs_json :
                                    img_pk = img['pk']
                                    image = Image.objects.filter(pk = img_pk, uploader = tmp_u.id)
                                    if image.exists():
                                        continue
                                    else:
                                        img_name = img['image'].split('/')[-1]
                                        if(img_name in name_list):
                                            img_bytes = bytearray(fidusfile.read(img_name))
                                            img_io = BytesIO(img_bytes)
                                            img_file = File(img_io)
                                            img_file.name = img_name
                                            img_file.size = len(img_bytes)
                                            img_file.content_type = str(img['file_type'])
                                            img_file.file = img_io
                                            
                                            image = Image()
                                            image.uploader = tmp_u
                                            image.checksum = img['checksum']
                                            image.title = img['title']
                                            image.image_cat = img['cats']
                                            image.image = img_file
                                            image.save()
                                        
                                #import bibs
                                bib_ids = []
                                bibs = json.loads(fidusfile.read('bibliography.json'))
                                for bib_key in bibs :
                                    bib = bibs[bib_key]
                                    bib_entry = Entry.objects.filter(pk = bib_key, entry_key = bib['entry_key'], entry_owner = tmp_u)
                                    if bib_entry.exists() :
                                        continue
                                    else :
                                        entry_type = EntryType.objects.get(pk = bib['entry_type'])
                                        bib_entry = Entry()
                                        bib_entry.entry_key = bib['entry_key']
                                        bib_entry.entry_owner = tmp_u
                                        bib_entry.entry_type = entry_type
                                        bib_entry.entry_cat = bib['entry_cat']
                                        
                                        bib_fields = {}
                                        for field_key in bib :
                                            bib_field = bib[field_key]
                                            f_type = EntryField.objects.filter(field_name = field_key)
                                            if f_type.exists():
                                                bib_fields[field_key] = bib_field
                                        
                                        bib_entry.fields = json.dumps(bib_fields)
                                        bib_entry.save()
                                        
                                        bib_ids.append({
                                            "old_id": "data-bib-entry=\"{}\"".format(bib_key),
                                            "new_id": "data-bib-entry=\"{}\"".format(bib_entry.id)
                                        })
                                        
                                #create document
                                document_json = json.loads(fidusfile.read('document.json'))
                                doc_meta = json.dumps(document_json['metadata'])
                                doc_settings = json.dumps(document_json['settings'])
                                doc_contents = document_json['contents']
                                for bib_id in bib_ids :
                                    doc_contents = doc_contents.replace(bib_id['old_id'], bib_id['new_id'])
                                    
                                document = utils.create_doc(tmp_u.pk, document_json['title'], doc_contents, doc_meta, doc_settings)
                                
                                #third: redirect to the document
                                return HttpResponseRedirect("/document/" + str(document.id))
                            
                            else:
                                return HttpResponse('Invalid Fidus File Format')
                        
                        else:
                            return HttpResponse('Fidus File must be broken')
                            
                else:
                    #second: create a blank new document
                    doc_title = _('Untitled')
                    doc_meta = '{"title": "' + doc_title + '","abstract": "' + _('Undefined') + '"}'
                    doc_settings = '{"papersize": "1117","citationstyle": "apa","tracking": false,"documentstyle": "elephant","metadata": {"abstract":true},"mathjax": false}'
                    document = utils.create_doc(tmp_u.pk, doc_title, "<p></p>", doc_meta, doc_settings)
                
                    #third: redirect to the document
                    return HttpResponseRedirect("/document/" + str(document.id))
            else:
                print()
                return HttpResponse('Unable to create tmp user')
    return bad_request(request, template_name='400.html')
    
@login_required
def geturl_js(request):
    status = 405
    response = {}
    if(all(key in request.session for key in ("ojs_articleId", "ojs_apiUrl", "ojs_saveAccessKey"))):
        status = 200
        response = {
            'articleId' : request.session['ojs_articleId'],
            'apiUrl' : request.session['ojs_apiUrl'],
            'saveAccessKey' : request.session['ojs_saveAccessKey'],
        }
        
    return HttpResponse(
        json.dumps(response),
        content_type = 'application/json; charset=utf8',
        status=status
    )

@login_required
def back(request):
    if("ojs_redirectUrl" in request.session):
        backurl = request.session["ojs_redirectUrl"]
        
        #delete the tmp. document
        documents = Document.objects.filter(owner=request.user)
        for doc in documents:
            doc.delete()
        
        #delete the tmp. account
        uid = request.user.id
        logout(request)
        user = User.objects.get(id=uid)
        user.delete()
        
        #flush session variables
        request.session.flush()
        
        return HttpResponseRedirect(backurl)
    
    return bad_request(request, template_name='400.html')
    

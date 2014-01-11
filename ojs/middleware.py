import re

from django.contrib import auth
from django.http import HttpResponseRedirect
from django.contrib.auth import logout
from django.contrib.auth.models import User

from document.models import Document

class OJSUserCheck: 
    def process_request(self, request):
        if not request.is_ajax() and "GET" == request.method and request.user.is_authenticated():
            if "ojsuser_" in request.user.username:
                bad_req_paths = [
                    '^/$',
                    '^/document/$',
                    '^/usermedia/',
                    '^/account/'
                ]
                bad_path = False
                
                for path in bad_req_paths:
                    p = re.compile(path)
                    if None != p.match(request.path):
                        bad_path = True
                        
                if bad_path:
                    documents = Document.objects.filter(owner=request.user)
                    doc_id = 0
                    for doc in documents:
                        doc_id = doc.id
                        
                    if 0 < doc_id:
                        return HttpResponseRedirect("/document/" + str(doc_id))
                    else:
                        #delete the tmp. account
                        uid = request.user.id
                        logout(request)
                        user = User.objects.get(id=uid)
                        user.delete()
                        return HttpResponseRedirect("/")

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

import uuid

from django.contrib.auth import authenticate, login, logout
from django.conf import settings

from allauth.account import forms as authforms
from allauth import utils as authutils

from document.models import Document

def make_tmp_user_data():
    uniq_id = uuid.uuid4().hex
    u_name = 'ojsuser_' + authutils.generate_unique_username(uniq_id)
    u_pass = settings.OJS_API_KEY
    u_data = {
        'username': u_name,
        'password1': u_pass,
        'password2': u_pass,
        'email': uniq_id + '@ojstmp.com'
    }
    
    return u_data

def make_tmp_user(request, user_data):
    signup_form = authforms.SignupForm(user_data)
    if(signup_form.is_valid()):
        signup_form.save(request)
        return True
    
    return False

def login_tmp_user(request, u_name, u_pass):
    if request.user.is_authenticated() :
        logout(request)
    user = authenticate(username=u_name, password=u_pass)
    login(request, user)
    
    return user

def create_doc(usr_id, title, contents, meta, settings):
    document = Document.objects.create(owner_id=usr_id)
    document.title = title
    document.contents = contents
    document.metadata = meta
    document.settings = settings
    document.save()
    
    return document
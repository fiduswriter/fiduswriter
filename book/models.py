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

from django.db import models

from text.models import Text
from usermedia.models import Image
from django.contrib.auth.models import User

class Book(models.Model):
    title = models.CharField(max_length=128)
    metadata = models.TextField(default='{}')
    settings = models.TextField(default='{}')
    cover_image = models.ForeignKey(Image, blank=True, null=True, default=None)
    chapters = models.ManyToManyField(Text, through='Chapter', blank=True, null=True, default=None)
    owner = models.ForeignKey(User)
    added = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now_add=True)    

    def __unicode__(self):
        return self.title

class Chapter(models.Model):
    text = models.ForeignKey(Text)
    book = models.ForeignKey(Book)
    number = models.IntegerField()
    part = models.CharField(max_length=128, blank=True, default='')
    
RIGHTS_CHOICES  = (
    ('r', 'read'),
    ('w', 'read/write'),
)

class BookAccessRight(models.Model):
    book = models.ForeignKey(Book)
    user = models.ForeignKey(User)
    rights = models.CharField(max_length=1, choices=RIGHTS_CHOICES, blank=False)
    
    class Meta:
        unique_together = (("book", "user"),)

    def __unicode__(self):
        return self.user.readable_name+' ('+self.rights+') on '+self.book.title    
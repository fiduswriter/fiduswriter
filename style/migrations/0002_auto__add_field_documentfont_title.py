# -*- coding: utf-8 -*-
from south.utils import datetime_utils as datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    def forwards(self, orm):
        # Adding field 'DocumentFont.title'
        db.add_column(u'style_documentfont', 'title',
                      self.gf('django.db.models.fields.CharField')(default='A font', max_length=128),
                      keep_default=False)


    def backwards(self, orm):
        # Deleting field 'DocumentFont.title'
        db.delete_column(u'style_documentfont', 'title')


    models = {
        u'style.documentfont': {
            'Meta': {'object_name': 'DocumentFont'},
            'font_file': ('django.db.models.fields.files.FileField', [], {'max_length': '100'}),
            'fontface_definition': ('django.db.models.fields.TextField', [], {}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'title': ('django.db.models.fields.CharField', [], {'max_length': '128'})
        },
        u'style.documentstyle': {
            'Meta': {'object_name': 'DocumentStyle'},
            'contents': ('django.db.models.fields.TextField', [], {}),
            'filename': ('django.db.models.fields.SlugField', [], {'max_length': '20'}),
            'fonts': ('django.db.models.fields.related.ManyToManyField', [], {'to': u"orm['style.DocumentFont']", 'symmetrical': 'False'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'title': ('django.db.models.fields.CharField', [], {'max_length': '128'})
        }
    }

    complete_apps = ['style']
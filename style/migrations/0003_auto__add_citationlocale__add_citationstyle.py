# -*- coding: utf-8 -*-
from south.utils import datetime_utils as datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    def forwards(self, orm):
        # Adding model 'CitationLocale'
        db.create_table(u'style_citationlocale', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('language_code', self.gf('django.db.models.fields.SlugField')(max_length=4)),
            ('contents', self.gf('django.db.models.fields.TextField')()),
        ))
        db.send_create_signal(u'style', ['CitationLocale'])

        # Adding model 'CitationStyle'
        db.create_table(u'style_citationstyle', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('title', self.gf('django.db.models.fields.CharField')(max_length=128)),
            ('short_title', self.gf('django.db.models.fields.SlugField')(max_length=20)),
            ('contents', self.gf('django.db.models.fields.TextField')()),
        ))
        db.send_create_signal(u'style', ['CitationStyle'])


    def backwards(self, orm):
        # Deleting model 'CitationLocale'
        db.delete_table(u'style_citationlocale')

        # Deleting model 'CitationStyle'
        db.delete_table(u'style_citationstyle')


    models = {
        u'style.citationlocale': {
            'Meta': {'object_name': 'CitationLocale'},
            'contents': ('django.db.models.fields.TextField', [], {}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'language_code': ('django.db.models.fields.SlugField', [], {'max_length': '4'})
        },
        u'style.citationstyle': {
            'Meta': {'object_name': 'CitationStyle'},
            'contents': ('django.db.models.fields.TextField', [], {}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'short_title': ('django.db.models.fields.SlugField', [], {'max_length': '20'}),
            'title': ('django.db.models.fields.CharField', [], {'max_length': '128'})
        },
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
            'fonts': ('django.db.models.fields.related.ManyToManyField', [], {'default': 'None', 'to': u"orm['style.DocumentFont']", 'null': 'True', 'symmetrical': 'False', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'title': ('django.db.models.fields.CharField', [], {'max_length': '128'})
        }
    }

    complete_apps = ['style']
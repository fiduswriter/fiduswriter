# -*- coding: utf-8 -*-
from south.utils import datetime_utils as datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    def forwards(self, orm):
        # Adding model 'DocumentFont'
        db.create_table(u'style_documentfont', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('font_file', self.gf('django.db.models.fields.files.FileField')(max_length=100)),
            ('fontface_definition', self.gf('django.db.models.fields.TextField')()),
        ))
        db.send_create_signal(u'style', ['DocumentFont'])

        # Adding model 'DocumentStyle'
        db.create_table(u'style_documentstyle', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('title', self.gf('django.db.models.fields.CharField')(max_length=128)),
            ('filename', self.gf('django.db.models.fields.SlugField')(max_length=20)),
            ('contents', self.gf('django.db.models.fields.TextField')()),
        ))
        db.send_create_signal(u'style', ['DocumentStyle'])

        # Adding M2M table for field fonts on 'DocumentStyle'
        m2m_table_name = db.shorten_name(u'style_documentstyle_fonts')
        db.create_table(m2m_table_name, (
            ('id', models.AutoField(verbose_name='ID', primary_key=True, auto_created=True)),
            ('documentstyle', models.ForeignKey(orm[u'style.documentstyle'], null=False)),
            ('documentfont', models.ForeignKey(orm[u'style.documentfont'], null=False))
        ))
        db.create_unique(m2m_table_name, ['documentstyle_id', 'documentfont_id'])


    def backwards(self, orm):
        # Deleting model 'DocumentFont'
        db.delete_table(u'style_documentfont')

        # Deleting model 'DocumentStyle'
        db.delete_table(u'style_documentstyle')

        # Removing M2M table for field fonts on 'DocumentStyle'
        db.delete_table(db.shorten_name(u'style_documentstyle_fonts'))


    models = {
        u'style.documentfont': {
            'Meta': {'object_name': 'DocumentFont'},
            'font_file': ('django.db.models.fields.files.FileField', [], {'max_length': '100'}),
            'fontface_definition': ('django.db.models.fields.TextField', [], {}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'})
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
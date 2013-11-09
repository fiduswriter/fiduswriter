# -*- coding: utf-8 -*-
import django.utils.timezone
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    def forwards(self, orm):
        # Adding field 'Entry.last_modified'
        db.add_column(u'bibliography_entry', 'last_modified',
                      self.gf('django.db.models.fields.DateTimeField')(auto_now=True, default=django.utils.timezone.now, blank=True),
                      keep_default=False)


    def backwards(self, orm):
        # Deleting field 'Entry.last_modified'
        db.delete_column(u'bibliography_entry', 'last_modified')


    models = {
        u'auth.group': {
            'Meta': {'object_name': 'Group'},
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '80'}),
            'permissions': ('django.db.models.fields.related.ManyToManyField', [], {'to': u"orm['auth.Permission']", 'symmetrical': 'False', 'blank': 'True'})
        },
        u'auth.permission': {
            'Meta': {'ordering': "(u'content_type__app_label', u'content_type__model', u'codename')", 'unique_together': "((u'content_type', u'codename'),)", 'object_name': 'Permission'},
            'codename': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'content_type': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['contenttypes.ContentType']"}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '50'})
        },
        u'auth.user': {
            'Meta': {'object_name': 'User'},
            'date_joined': ('django.db.models.fields.DateTimeField', [], {'default': 'datetime.datetime.now'}),
            'email': ('django.db.models.fields.EmailField', [], {'max_length': '75', 'blank': 'True'}),
            'first_name': ('django.db.models.fields.CharField', [], {'max_length': '30', 'blank': 'True'}),
            'groups': ('django.db.models.fields.related.ManyToManyField', [], {'to': u"orm['auth.Group']", 'symmetrical': 'False', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'is_active': ('django.db.models.fields.BooleanField', [], {'default': 'True'}),
            'is_staff': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'is_superuser': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'last_login': ('django.db.models.fields.DateTimeField', [], {'default': 'datetime.datetime.now'}),
            'last_name': ('django.db.models.fields.CharField', [], {'max_length': '30', 'blank': 'True'}),
            'password': ('django.db.models.fields.CharField', [], {'max_length': '128'}),
            'user_permissions': ('django.db.models.fields.related.ManyToManyField', [], {'to': u"orm['auth.Permission']", 'symmetrical': 'False', 'blank': 'True'}),
            'username': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '30'})
        },
        u'bibliography.entry': {
            'Meta': {'unique_together': "(('entry_key', 'entry_owner'),)", 'object_name': 'Entry'},
            'entry_cat': ('django.db.models.fields.CharField', [], {'default': "''", 'max_length': '255'}),
            'entry_key': ('django.db.models.fields.CharField', [], {'max_length': '64'}),
            'entry_owner': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['auth.User']"}),
            'entry_type': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['bibliography.EntryType']"}),
            'fields': ('django.db.models.fields.TextField', [], {'default': "'{}'"}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'last_modified': ('django.db.models.fields.DateTimeField', [], {'auto_now': 'True', 'blank': 'True'})
        },
        u'bibliography.entrycategory': {
            'Meta': {'object_name': 'EntryCategory'},
            'category_owner': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['auth.User']"}),
            'category_title': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'})
        },
        u'bibliography.entryfield': {
            'Meta': {'object_name': 'EntryField'},
            'biblatex': ('django.db.models.fields.CharField', [], {'max_length': '30'}),
            'csl': ('django.db.models.fields.CharField', [], {'max_length': '30', 'blank': 'True'}),
            'field_name': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '30'}),
            'field_title': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'field_type': ('django.db.models.fields.CharField', [], {'default': "'l_name'", 'max_length': '30'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'})
        },
        u'bibliography.entryfieldalias': {
            'Meta': {'object_name': 'EntryFieldAlias'},
            'field_alias': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['bibliography.EntryField']"}),
            'field_name': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '30'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'})
        },
        u'bibliography.entrytype': {
            'Meta': {'object_name': 'EntryType'},
            'biblatex': ('django.db.models.fields.CharField', [], {'max_length': '30'}),
            'csl': ('django.db.models.fields.CharField', [], {'max_length': '30'}),
            'eitheror_fields': ('django.db.models.fields.related.ManyToManyField', [], {'related_name': "'eitheror_fields'", 'symmetrical': 'False', 'to': u"orm['bibliography.EntryField']"}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'optional_fields': ('django.db.models.fields.related.ManyToManyField', [], {'related_name': "'optional_fields'", 'symmetrical': 'False', 'to': u"orm['bibliography.EntryField']"}),
            'required_fields': ('django.db.models.fields.related.ManyToManyField', [], {'related_name': "'required_fields'", 'symmetrical': 'False', 'to': u"orm['bibliography.EntryField']"}),
            'type_name': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '30'}),
            'type_order': ('django.db.models.fields.IntegerField', [], {}),
            'type_title': ('django.db.models.fields.CharField', [], {'max_length': '100'})
        },
        u'bibliography.entrytypealias': {
            'Meta': {'object_name': 'EntryTypeAlias'},
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'type_alias': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['bibliography.EntryType']"}),
            'type_name': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '30'})
        },
        u'bibliography.localizationkey': {
            'Meta': {'object_name': 'LocalizationKey'},
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'key_name': ('django.db.models.fields.CharField', [], {'max_length': '20'}),
            'key_title': ('django.db.models.fields.CharField', [], {'max_length': '48'}),
            'key_type': ('django.db.models.fields.CharField', [], {'max_length': '20'})
        },
        u'bibliography.texspecialchar': {
            'Meta': {'object_name': 'TexSpecialChar'},
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'tex': ('django.db.models.fields.CharField', [], {'max_length': '255'}),
            'unicode': ('django.db.models.fields.CharField', [], {'max_length': '20'})
        },
        u'contenttypes.contenttype': {
            'Meta': {'ordering': "('name',)", 'unique_together': "(('app_label', 'model'),)", 'object_name': 'ContentType', 'db_table': "'django_content_type'"},
            'app_label': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'model': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '100'})
        }
    }

    complete_apps = ['bibliography']
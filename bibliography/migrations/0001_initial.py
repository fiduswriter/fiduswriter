# -*- coding: utf-8 -*-
import datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    def forwards(self, orm):
        # Adding model 'TexSpecialChar'
        db.create_table(u'bibliography_texspecialchar', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('tex', self.gf('django.db.models.fields.CharField')(max_length=255)),
            ('unicode', self.gf('django.db.models.fields.CharField')(max_length=20)),
        ))
        db.send_create_signal(u'bibliography', ['TexSpecialChar'])

        # Adding model 'LocalizationKey'
        db.create_table(u'bibliography_localizationkey', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('key_type', self.gf('django.db.models.fields.CharField')(max_length=20)),
            ('key_name', self.gf('django.db.models.fields.CharField')(max_length=20)),
            ('key_title', self.gf('django.db.models.fields.CharField')(max_length=48)),
        ))
        db.send_create_signal(u'bibliography', ['LocalizationKey'])

        # Adding model 'EntryCategory'
        db.create_table(u'bibliography_entrycategory', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('category_title', self.gf('django.db.models.fields.CharField')(max_length=100)),
            ('category_owner', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['auth.User'])),
        ))
        db.send_create_signal(u'bibliography', ['EntryCategory'])

        # Adding model 'EntryField'
        db.create_table(u'bibliography_entryfield', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('field_name', self.gf('django.db.models.fields.CharField')(unique=True, max_length=30)),
            ('biblatex', self.gf('django.db.models.fields.CharField')(max_length=30)),
            ('cls', self.gf('django.db.models.fields.CharField')(max_length=30, blank=True)),
            ('field_title', self.gf('django.db.models.fields.CharField')(max_length=100)),
            ('field_type', self.gf('django.db.models.fields.CharField')(default='l_name', max_length=30)),
        ))
        db.send_create_signal(u'bibliography', ['EntryField'])

        # Adding model 'EntryFieldAlias'
        db.create_table(u'bibliography_entryfieldalias', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('field_name', self.gf('django.db.models.fields.CharField')(unique=True, max_length=30)),
            ('field_alias', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['bibliography.EntryField'])),
        ))
        db.send_create_signal(u'bibliography', ['EntryFieldAlias'])

        # Adding model 'EntryType'
        db.create_table(u'bibliography_entrytype', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('type_name', self.gf('django.db.models.fields.CharField')(unique=True, max_length=30)),
            ('type_title', self.gf('django.db.models.fields.CharField')(max_length=100)),
            ('type_order', self.gf('django.db.models.fields.IntegerField')()),
            ('biblatex', self.gf('django.db.models.fields.CharField')(max_length=30)),
            ('cls', self.gf('django.db.models.fields.CharField')(max_length=30)),
        ))
        db.send_create_signal(u'bibliography', ['EntryType'])

        # Adding M2M table for field required_fields on 'EntryType'
        db.create_table(u'bibliography_entrytype_required_fields', (
            ('id', models.AutoField(verbose_name='ID', primary_key=True, auto_created=True)),
            ('entrytype', models.ForeignKey(orm[u'bibliography.entrytype'], null=False)),
            ('entryfield', models.ForeignKey(orm[u'bibliography.entryfield'], null=False))
        ))
        db.create_unique(u'bibliography_entrytype_required_fields', ['entrytype_id', 'entryfield_id'])

        # Adding M2M table for field eitheror_fields on 'EntryType'
        db.create_table(u'bibliography_entrytype_eitheror_fields', (
            ('id', models.AutoField(verbose_name='ID', primary_key=True, auto_created=True)),
            ('entrytype', models.ForeignKey(orm[u'bibliography.entrytype'], null=False)),
            ('entryfield', models.ForeignKey(orm[u'bibliography.entryfield'], null=False))
        ))
        db.create_unique(u'bibliography_entrytype_eitheror_fields', ['entrytype_id', 'entryfield_id'])

        # Adding M2M table for field optional_fields on 'EntryType'
        db.create_table(u'bibliography_entrytype_optional_fields', (
            ('id', models.AutoField(verbose_name='ID', primary_key=True, auto_created=True)),
            ('entrytype', models.ForeignKey(orm[u'bibliography.entrytype'], null=False)),
            ('entryfield', models.ForeignKey(orm[u'bibliography.entryfield'], null=False))
        ))
        db.create_unique(u'bibliography_entrytype_optional_fields', ['entrytype_id', 'entryfield_id'])

        # Adding model 'EntryTypeAlias'
        db.create_table(u'bibliography_entrytypealias', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('type_name', self.gf('django.db.models.fields.CharField')(unique=True, max_length=30)),
            ('type_alias', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['bibliography.EntryType'])),
        ))
        db.send_create_signal(u'bibliography', ['EntryTypeAlias'])

        # Adding model 'Entry'
        db.create_table(u'bibliography_entry', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('entry_key', self.gf('django.db.models.fields.CharField')(max_length=64)),
            ('entry_owner', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['auth.User'])),
            ('entry_type', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['bibliography.EntryType'])),
            ('entry_cat', self.gf('django.db.models.fields.CharField')(default='', max_length=255)),
            ('fields', self.gf('django.db.models.fields.TextField')()),
        ))
        db.send_create_signal(u'bibliography', ['Entry'])

        # Adding unique constraint on 'Entry', fields ['entry_key', 'entry_owner']
        db.create_unique(u'bibliography_entry', ['entry_key', 'entry_owner_id'])


    def backwards(self, orm):
        # Removing unique constraint on 'Entry', fields ['entry_key', 'entry_owner']
        db.delete_unique(u'bibliography_entry', ['entry_key', 'entry_owner_id'])

        # Deleting model 'TexSpecialChar'
        db.delete_table(u'bibliography_texspecialchar')

        # Deleting model 'LocalizationKey'
        db.delete_table(u'bibliography_localizationkey')

        # Deleting model 'EntryCategory'
        db.delete_table(u'bibliography_entrycategory')

        # Deleting model 'EntryField'
        db.delete_table(u'bibliography_entryfield')

        # Deleting model 'EntryFieldAlias'
        db.delete_table(u'bibliography_entryfieldalias')

        # Deleting model 'EntryType'
        db.delete_table(u'bibliography_entrytype')

        # Removing M2M table for field required_fields on 'EntryType'
        db.delete_table('bibliography_entrytype_required_fields')

        # Removing M2M table for field eitheror_fields on 'EntryType'
        db.delete_table('bibliography_entrytype_eitheror_fields')

        # Removing M2M table for field optional_fields on 'EntryType'
        db.delete_table('bibliography_entrytype_optional_fields')

        # Deleting model 'EntryTypeAlias'
        db.delete_table(u'bibliography_entrytypealias')

        # Deleting model 'Entry'
        db.delete_table(u'bibliography_entry')


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
            'fields': ('django.db.models.fields.TextField', [], {}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'})
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
            'cls': ('django.db.models.fields.CharField', [], {'max_length': '30', 'blank': 'True'}),
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
            'cls': ('django.db.models.fields.CharField', [], {'max_length': '30'}),
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
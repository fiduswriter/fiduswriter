from django.conf.urls import url

from . import views

urlpatterns = [
    url('^$', views.index, name='index'),
    url('^new/$', views.editor, name='editor'),
    url(
        '^documentlist/$',
        views.get_documentlist_js,
        name='get_documentlist_js'
    ),
    url(
        '^documentlist/extra/$',
        views.get_documentlist_extra_js,
        name='get_documentlist_extra_js'
    ),
    url('^delete/$', views.delete_js, name='delete_js'),
    url('^import/$', views.import_js, name='import_js'),
    url('^upload/$', views.upload_js, name='upload_js'),
    url('^download/$', views.download_js, name='download_js'),
    url(
        '^delete_revision/$',
        views.delete_revision_js,
        name='delete_revision_js'
    ),
    url('^\d+/$', views.editor, name='editor'),
    url(
        '^accessright/save/$',
        views.access_right_save_js,
        name='access_right_save_js'
    ),
    url(
        '^upgrade_all/$',
        views.upgrade_all_documents_js,
        name='upgrade_all_documents_js'
    ),
    url(
        '^upgrade_all/get_all/$',
        views.get_all_docs_js,
        name='get_all_docs_js'
    ),
    url(
        '^upgrade_all/save/$',
        views.save_doc_js,
        name='save_doc_js'
    )
]

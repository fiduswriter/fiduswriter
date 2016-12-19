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
    url('^upload/$', views.upload_revision_js, name='upload_revision_js'),
    url('^profile/$', views.profile_js, name='profile_js'),
    url(
        '^get_revision/(?P<revision_id>[0-9]+)/$',
        views.get_revision,
        name='get_revision'
    ),
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
        '^submitright/$',
        views.submit_right_js,
        name='submit_right_js'
    ),
    url(
        '^submissionversion/$',
        views.submission_version_js,
        name='submission_version_js'
    ),
    url(
        '^reviewsubmit/$',
        views.review_submit_js,
        name='review_submit_js'
    ),
    url(
        '^reviewsubmitundo/$',
        views.review_submit_undo_js,
        name='review_submit_undo_js'
    ),
    url(
        '^reviewer/$',
        views.reviewer_js,
        name='reviewer_js'
    ),
    url(
        '^delReviewer/$',
        views.del_reviewer_js,
        name='del_reviewer_js'
    ),
    url(
        '^documentReview/$',
        views.document_review_js,
        name='document_review_js'
    ),
    url(
        '^newrevision/$',
        views.new_revision_js,
        name='new_revision_js'
    ),
    url(
        '^maintenance/get_all/$',
        views.get_all_docs_js,
        name='get_all_docs_js'
    ),
    url(
        '^maintenance/save_doc/$',
        views.save_doc_js,
        name='save_doc_js'
    ),
    url(
        '^maintenance/get_all_revision_ids/$',
        views.get_all_revision_ids_js,
        name='get_all_revision_ids_js'
    ),
    url(
        '^maintenance/update_revision/$',
        views.update_revision_js,
        name='update_revision_js'
    )
]

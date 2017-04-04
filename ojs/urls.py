from django.conf.urls import url

from . import views

urlpatterns = [
    url(
        '^add_reviewer/(?P<submission_id>[0-9]+)/(?P<version>[0-9\.]+)/$',
        views.add_reviewer_js,
        name='add_reviewer_js'
    ),
    url(
        '^remove_reviewer/(?P<submission_id>[0-9]+)/(?P<version>[0-9\.]+)/$',
        views.remove_reviewer_js,
        name='remove_reviewer_js'
    ),
    url(
        '^revision/(?P<submission_id>[0-9]+)/(?P<version>[0-9\.]+)/$',
        views.open_revision_doc,
        name='open_revision_doc'
    ),
    url(
        '^get_revision_file/(?P<revision_id>[0-9]+)/$',
        views.get_revision_file,
        name='get_revision_file'
    ),
    url(
        '^import_doc/(?P<submission_id>[0-9]+)/(?P<version>[0-9\.]+)/$',
        views.import_doc,
        name='import_doc'
    ),
    url(
        '^get_login_token/$',
        views.get_login_token_js,
        name='get_login_token_js'
    ),
    url(
        '^create_copy/(?P<submission_id>[0-9]+)/$',
        views.create_copy_js,
        name='create_copy_js'
    ),
    url(
        '^get_user/$',
        views.get_user_js,
        name='get_user_js'
    ),
    url(
        '^save_journal/$',
        views.save_journal_js,
        name='save_journal_js'
    ),
    url(
        '^get_doc_info/$',
        views.get_doc_info_js,
        name='get_doc_info_js'
    )
]

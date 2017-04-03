from django.conf.urls import url

from . import views

urlpatterns = [
    url(
        '^submitright/$',
        views.submit_right_js,
        name='submit_right_js'
    ),
    # url(
    #    '^submissionversion/$',
    #    views.submission_version_js,
    #    name='submission_version_js'
    # ),
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
        '^get_login_token/$',
        views.get_login_token_js,
        name='get_login_token_js'
    ),
    url(
        '^newsubmissionrevision/$',
        views.new_submission_revision_js,
        name='new_submission_revision_js'
    ),
    url(
        '^getUser/$',
        views.get_user_js,
        name='get_user_js'
    ),
    url(
        '^saveJournal/$',
        views.save_journal_js,
        name='save_journal_js'
    ),
    url(
        '^getJournals/$',
        views.get_journals_js,
        name='get_journals_js'
    )
]

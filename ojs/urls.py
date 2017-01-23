from django.conf.urls import url

from . import views

urlpatterns = [
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
        '^reviewer/$',  # not mentioned in JS
        views.reviewer_js,
        name='reviewer_js'
    ),
    url(
        '^delReviewer/$',  # not mentioned in JS
        views.del_reviewer_js,
        name='del_reviewer_js'
    ),
    url(
        '^documentReview/$',  # not mentioned in JS
        views.document_review_js,
        name='document_review_js'
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
    )
]

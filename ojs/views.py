from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.contrib.admin.views.decorators import staff_member_required
from django.http import JsonResponse, HttpResponse
from django.db import transaction
from django.shortcuts import redirect, render
from django.core.exceptions import ObjectDoesNotExist
from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.auth import login
from django.db import IntegrityError
from allauth.account.models import EmailAddress
from allauth.account import forms

from . import models
from . import token
from document.views import send_share_notification
from document.models import Document, AccessRight, CAN_UPDATE_DOCUMENT


# logs a user in
def login_user(request, user):
    # TODO: Is next line really needed?
    user.backend = settings.AUTHENTICATION_BACKENDS[0]
    login(request, user)


# Find a user -- First check if it is an author, then a reviewer.
# If it's none of the two, check if there is authorization to login as an
# editor and if this is the case, log the user in as the journal's owner.
# Under all other circumstances, return False.
def find_user(
    journal_id,
    submission_id,
    version,
    user_id,
    is_editor
):
    authors = models.Author.objects.filter(
        submission_id=submission_id,
        ojs_jid=user_id
    )
    if len(authors) > 0:
        # It's an author
        return authors[0].user
    revisions = models.SubmissionRevision.objects.filter(
        submission_id=submission_id,
        version=version
    )
    if len(revisions) > 0:
        revision_id = revisions[0].id
        reviewers = models.Reviewer.objects.filter(
            revision_id=revision_id,
            ojs_jid=user_id
        )
        if len(reviewers) > 0:
            return reviewers[0].user
    if is_editor:
        journal = models.Journal.objects.get(
            id=journal_id
        )
        return journal.editor
    else:
        return False


# To login from OJS, the OJS server first gets a temporary login token from the
# Django server for a specific user and journal using the api key on the server
# side. It then logs the user in using the login token on the client side. This
# way, the api key is not exposed to the client.
@csrf_exempt
def get_login_token_js(request):
    response = {}
    if request.method != 'GET':
        # Method not allowed
        response['error'] = 'Expected GET'
        return JsonResponse(response, status=405)
    api_key = request.GET.get('key')
    submission_id = request.GET.get('fidus_id')
    submission = models.Submission.objects.get(id=submission_id)
    journal_key = submission.journal.ojs_key
    journal_id = submission.journal_id
    if (journal_key != api_key):
        # Access forbidden
        response['error'] = 'Wrong key'
        return JsonResponse(response, status=403)

    user_id = request.GET.get('user_id')
    is_editor = request.GET.get('is_editor')
    version = request.GET.get('version')
    user = find_user(
        journal_id,
        submission_id,
        version,
        user_id,
        is_editor
    )
    if not user:
        response['error'] = 'User not accessible'
        return JsonResponse(response, status=403)
    response['token'] = token.create_token(user, journal_key)
    return JsonResponse(response, status=200)


# Open a revision doc. This is where the reviewers/editor arrive when trying to
# enter the submission doc on OJS.
@csrf_exempt
def open_revision_doc(request, submission_id, version):
    if request.method != 'POST':
        # Method not allowed
        return HttpResponse('Expected post', status=405)
    login_token = request.POST.get('token')
    user_id = int(login_token.split("-")[0])
    user = User.objects.get(id=user_id)
    if user is None:
        return HttpResponse('Invalid user', status=404)
    rev = models.SubmissionRevision.objects.get(
        submission_id=submission_id,
        version=version
    )
    key = rev.submission.journal.ojs_key

    if not token.check_token(user, key, login_token):
        return HttpResponse('No access', status=403)
    if (
        rev.document.owner != user and
        AccessRight.objects.filter(
                document=rev.document,
                user=user,
                rights__in=CAN_UPDATE_DOCUMENT
        ).count() == 0
    ):
        # The user to be logged in is neither the editor (owner of doc), a
        # reviewer or the author. We prohibit access.

        # Access forbidden
        return HttpResponse('Missing access rights', status=403)
    login_user(request, user)

    if rev.document.version == 0:
        # The document with version == 0 is still empty as it hasn't loaded the
        # zipped document yet. Send the user to first load the zip file into
        # the document. This will also import included images and citations.
        response = {}
        response['doc_id'] = rev.document.id
        response['rev_id'] = rev.id
        response['owner_id'] = rev.document.owner.id
        # Loading the document and saving it will increase the version number
        # of the doc from 0 to 1.
        return render(request, 'ojs/import_document.html',
                      response)
    return redirect(
        '/document/' + str(rev.document.id) + '/', permanent=True
    )


# Download the zipped file_object of a submission revision
# This is used when importing a submitted file.
@login_required
def get_revision_file(request, revision_id):
    rev = models.SubmissionRevision.objects.get(pk=int(revision_id))
    if (
        rev.document.owner != request.user and
        AccessRight.objects.filter(
                document=rev.document,
                user=request.user,
                rights__in=CAN_UPDATE_DOCUMENT
        ).count() == 0
    ):
        # Access forbidden
        return HttpResponse('Missing access rights', status=403)
    http_response = HttpResponse(
        rev.submission.file_object.file,
        content_type='application/zip; charset=x-user-defined',
        status=200
    )
    http_response[
        'Content-Disposition'] = 'attachment; filename=some_name.zip'
    return http_response


# A list of all registered journals -- to be used in the article submit dialog.
@login_required
def get_journals_js(request):
    status = 405
    response = {}
    if request.is_ajax() and request.method == 'POST':
        journals = []
        for journal in models.Journal.objects.all():
            journals.append({
                'id': journal.id,
                'name': journal.name,
                'editor_id': journal.editor_id,
                'ojs_jid': journal.ojs_jid
            })
        response['journals'] = journals
        status = 200
    return JsonResponse(
        response,
        status=status
    )


# Get a user based on an email address. Used for registration of journal.
@staff_member_required
def get_user_js(request):
    status = 405
    response = {}
    if request.is_ajax() and request.method == 'POST':
        email = request.POST.get('email')
        try:
            email_address = EmailAddress.objects.get(
                email=email
            )
            response['user_id'] = email_address.user.id
            response['user_name'] = email_address.user.username
            status = 200
        except EmailAddress.DoesNotExist:
            status = 204
    return JsonResponse(
        response,
        status=status
    )


# Save a journal. Used on custom admin page.
@staff_member_required
def save_journal_js(request):
    status = 405
    response = {}
    if request.is_ajax() and request.method == 'POST':
        try:
            models.Journal.objects.create(
                ojs_jid=request.POST.get('ojs_jid'),
                ojs_key=request.POST.get('ojs_key'),
                ojs_url=request.POST.get('ojs_url'),
                name=request.POST.get('name'),
                editor_id=request.POST.get('editor_id'),
            )
            status = 201
        except IntegrityError:
            status = 200
    return JsonResponse(
        response,
        status=status
    )


# Return an existing user or create a new one. The email/username come from
# OJS. We return an existing user if it has the same email as the OJS user
# as we expect OJS to have checked whether the user actually has access to the
# email. We do not automatically connect to a user with the same username,
# as this may be purely coincidental.
# TODO: Check if OJS actually verifies the email account of the reviewer.
def get_or_create_user(email, username):
    users_with_email = User.objects.filter(email=email)
    if len(users_with_email) > 0:
        return users_with_email[0]
    # try to find an unused username, starting with the username used in OJS
    counter = 0
    usernamebase = username
    while len(User.objects.filter(username=username)) > 0:
        username = usernamebase + str(counter)
        counter += 1
    return User.objects.create_user(username, email)


# Add a reviewer to the document connected to a SubmissionRevision as a
# reviewer.
# Also ensure that there is an Reviewer set up for the account to allow for
# password-less login from OJS.
@csrf_exempt
def add_reviewer_js(request, submission_id, version):
    response = {}
    status = 200
    if request.method != 'POST':
        # Method not allowed
        response['error'] = 'Expected post'
        status = 405
        return JsonResponse(response, status=status)
    api_key = request.POST.get('key')
    revision = models.SubmissionRevision.objects.get(
        submission_id=submission_id,
        version=version
    )
    journal_key = revision.submission.journal.ojs_key
    if (journal_key != api_key):
        # Access forbidden
        response['error'] = 'Wrong key'
        status = 403
        return JsonResponse(response, status=status)

    ojs_jid = int(request.POST.get('user_id'))

    # Make sure there is an Reviewer/user registered for the reviewer.
    reviewers = models.Reviewer.objects.filter(
        revision=revision,
        ojs_jid=ojs_jid
    )
    if len(reviewers) > 0:
        reviewer = reviewers[0]
    else:
        email = request.POST.get('email')
        username = request.POST.get('username')
        user = get_or_create_user(email, username)
        reviewer = models.Reviewer.objects.create(
            revision=revision,
            ojs_jid=ojs_jid,
            user=user
        )
        status = 201
    # Make sure the connect document has reviewer access rights set for the
    # user.
    access_rights = AccessRight.objects.filter(
        document=revision.document,
        user=reviewer.user
    )
    if (len(access_rights)) > 0:
        access_right = access_rights[0]
    else:
        access_right = AccessRight(
            document=revision.document,
            user=reviewer.user
        )
        status = 201
    access_right.rights = 'review'
    access_right.save()
    return JsonResponse(response, status=status)


@csrf_exempt
def remove_reviewer_js(request, submission_id, version):
    response = {}
    status = 200
    if request.method != 'POST':
        # Method not allowed
        response['error'] = 'Expected post'
        status = 405
        return JsonResponse(response, status=status)
    api_key = request.POST.get('key')
    revision = models.SubmissionRevision.objects.get(
        submission_id=submission_id,
        version=version
    )
    journal_key = revision.submission.journal.ojs_key
    if (journal_key != api_key):
        # Access forbidden
        response['error'] = 'Wrong key'
        status = 403
        return JsonResponse(response, status=status)

    ojs_jid = int(request.POST.get('user_id'))
    # Delete reviewer access rights set for the corresponding user,
    # if there are any. Thereafter delete the Reviewer.
    reviewers = models.Reviewer.objects.filter(
        revision=revision,
        ojs_jid=ojs_jid
    )
    if len(reviewers) > 0:
        reviewer = reviewers[0]
        AccessRight.objects.filter(
            document=revision.document,
            user=reviewer.user
        ).delete()
        reviewer.delete()

    return JsonResponse(response, status=status)


# TODO: CONVERT!
# The below functions have not yet been converted to the new OJS/FW
# collaboration structure
def create_user(request, user_data):
    signup_form = forms.SignupForm(user_data)
    try:
        signup_form.is_valid()
        user = signup_form.save(request)
        user.set_unusable_password()
        user.save()
        return user
    except:
        return False


# @login_required
# def submission_version_js(request):
#     status = 405
#     response = {}
#
#     if request.is_ajax() and request.method == 'POST':
#         data = {}
#         data['document_id'] = request.POST.get('document_id')
#         data['journal_id'] = request.POST.get('journal_id')
#         data['submission_id'] = request.POST.get('submission_id')
#         data['pre_document_id'] = request.POST.get('pre_document_id')
#         data['user_id'] = request.user.id
#         set_version(request, data)
#         status = 201
#     return JsonResponse(
#         response,
#         status=status
#     )


@csrf_exempt
def new_submission_revision_js(request):
    if request.method == 'POST':
        submission_id = int(request.POST.get('submission_id'))
        app_key = request.POST.get('key')
        # ojs_username = request.POST.get('ojs_user_name')
        email = request.POST.get('author_email')
        response = {}
        data = {}
        if app_key == settings.SERVER_INFO['OJS_KEY']:
            # TODO Afshin: get the username or email of the current ojs user to
            # login
            # user = User.objects.get(
            #     username=request.POST.get('username')
            #     is_active=True
            # )
            # editor = login_user(
            #    request,
            #    user)
            original_doc = models.Submission.objects.get(
                submission_id=submission_id, version_id=0)
            last_version = models.Submission.objects.filter(
                submission_id=submission_id).latest('version_id')
            user = User.objects.get(email=email)
            document = Document.objects.get(pk=last_version.document_id)
            document.pk = None
            document.save()
            data['document_id'] = document.pk
            data['pre_document_id'] = last_version.document_id
            data['user_id'] = user.id
            data['journal_id'] = original_doc.journal_id
            data['submission_id'] = submission_id
            data['user_id'] = request.user.id
            sub_access_rights = models.SubmittedAccessRight.objects.filter(
                submission_id=submission_id,
                document_id=original_doc.document_id)
            for submission_access_right in sub_access_rights:
                try:
                    access_right = AccessRight.objects.get(
                        document_id=data['document_id'],
                        user_id=submission_access_right.user_id)
                    access_right.rights = submission_access_right.rights
                except ObjectDoesNotExist:
                    access_right = AccessRight.objects.create(
                        document_id=data['document_id'],
                        user_id=submission_access_right.user_id,
                        rights=submission_access_right.rights,
                    )
                # TODO sending a relative email to authors and informing
                # them about the new revision
                # send_share_notification(request, data['document_id'],
                #    submission_access_right.user_id,
                #                        submission_access_right.rights)
                access_right.save()
            set_version(data)
            status = 200
            return JsonResponse(
                response,
                status=status
            )
        else:
            response['error'] = "The OJS_KEY is not valid"
            status = 404
            return JsonResponse(
                response,
                status=status
            )


# TODO Afshin should login for ojs user
# @login_required
def set_version(data):
    user_id = data['user_id']
    document_id = data['document_id']
    journal_id = data['journal_id']
    submission_id = data['submission_id']
    pre_document_id = data['pre_document_id']
    version = 1
    # TODO Afshin: Is the version number always 1?
    try:
        submissions = models.Submission.objects.filter(
            submission_id=submission_id)
        if len(submissions) > 0:
            version = len(submissions)
        else:
            # save the rights of authors in original document
            sub_access_right = models.SubmittedAccessRight.objects.create(
                document_id=pre_document_id,
                user_id=user_id,
                rights='write',
                submission_id=submission_id
            )
            access_rights = AccessRight.objects.filter(
                document_id=pre_document_id)
            for access_right in access_rights:
                sub_access_right = models.SubmittedAccessRight.objects.create(
                    document_id=pre_document_id,
                    user_id=access_right.user_id,
                    rights=access_right.rights,
                    submission_id=submission_id
                )
            sub_access_right.save()

            original_submission = models.Submission.objects.create(
                user_id=user_id,
                document_id=pre_document_id,
                journal_id=journal_id,
                submission_id=submission_id,
                version_id=0
            )
            original_submission.save()
        submission = models.Submission.objects.create(
            user_id=user_id,
            document_id=document_id,
            journal_id=journal_id,
            submission_id=submission_id,
            version_id=version
        )
        submission.save()
        return True
    except:
        return False


# TODO: Security review. Afshin, it seems like this allows any user with some
# type of access right to a doc to give themselves tgt_right
@login_required
def review_submit_js(request):
    status = 405
    response = {}
    if request.is_ajax() and request.method == 'POST':
        document_id = request.POST.get('document_id')
        tgt_right = 'read-without-comments'
        access_right = AccessRight.objects.get(
            document_id=document_id,
            user=request.user
        )
        if access_right.rights != tgt_right:
            access_right.rights = tgt_right
            access_right.save()
        submission = models.Submission.objects.get(
            document_id=document_id)
        response['submission'] = {}
        if submission:
            response["submission"]["submission_id"] = submission.submission_id
            response["submission"]["version_id"] = submission.version_id
            response["submission"]["journal_id"] = submission.journal_id
        status = 201
    return JsonResponse(
        response,
        status=status
    )


@login_required
def review_submit_undo_js(request):
    status = 405
    response = {}
    if request.is_ajax() and request.method == 'POST':
        document_id = request.POST.get('document_id')
        tgt_right = 'review'
        access_right = AccessRight.objects.get(
            document_id=document_id, user=request.user)
        if access_right.rights != tgt_right:
            access_right.rights = tgt_right
            access_right.save()
        submission = models.Submission.objects.get(
            document_id=document_id)
        response['submission'] = {}
        if submission:
            response["submission"]["submission_id"] = submission.submission_id
            response["submission"]["version_id"] = submission.version_id
            response["submission"]["journal_id"] = submission.journal_id
        status = 201
    return JsonResponse(
        response,
        status=status
    )


# OJS connected views
# TODO: This seems to give any user the ability to change the access rights of
# any document, with no checks whether that user actually was allowed to access
# the document before.
@login_required
@transaction.atomic
def submit_right_js(request):
    status = 405
    response = {}
    if (
        request.is_ajax() and
        request.method == 'POST' and
        settings.SERVER_INFO['EXPERIMENTAL'] is True
    ):
        tgt_doc = request.POST.get('documentId')
        tgt_users = request.POST.getlist('collaborators[]')
        doc_id = int(tgt_doc)
        document = Document.objects.get(id=doc_id)
        tgt_right = 'read-without-comments'
        try:
            the_user = User.objects.filter(is_superuser=1)
            if len(the_user) > 0:
                document.owner_id = the_user[0].id
                document.save()
        except ObjectDoesNotExist:
            pass
        for tgt_user in tgt_users:
            collaborator_id = int(tgt_user)
            try:
                access_right = AccessRight.objects.get(
                    document_id=doc_id, user_id=collaborator_id)
                if access_right.rights != tgt_right:
                    access_right.rights = tgt_right
            except ObjectDoesNotExist:
                access_right = AccessRight.objects.create(
                    document_id=doc_id,
                    user_id=collaborator_id,
                    rights=tgt_right,
                )
                send_share_notification(
                    request, doc_id, collaborator_id, tgt_right)
            access_right.save()
        status = 201
    return JsonResponse(
        response,
        status=status
    )


def get_reviewer_for_post(request):
    email = request.POST.get('email')
    u_name = request.POST.get('user_name')
    try:
        reviewers = User.objects.filter(email=email)
        if len(reviewers) > 0:
            reviewer = reviewers[0]
        else:
            # "reviewer with this email does not exist so create it"
            u_data = {
                'username': u_name,
                'email': email
            }
            reviewer = create_user(request, u_data)
            reviewers = User.objects.filter(email=email)
            reviewer = reviewers[0]
        return reviewer
    except ObjectDoesNotExist:
        print("could not create user for email: " + email)


def get_existing_reviewer(request):
    reviewer = User.objects.get(email=request.POST.get('email'))
    return reviewer

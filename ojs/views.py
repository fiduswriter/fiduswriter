from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.contrib.admin.views.decorators import staff_member_required
from django.http import JsonResponse
from django.db import transaction
from django.shortcuts import redirect
from django.core.exceptions import ObjectDoesNotExist
from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.auth import login
from django.apps import apps
from django.db import IntegrityError
from allauth.account.models import EmailAddress
from allauth.account import forms

from .models import Submission, SubmittedAccessRight, Journal
from document.views import send_share_notification
from document.models import Document, AccessRight


def login_user(request, u_name):
    try:
        user = User.objects.get(username=u_name)
        if (user and user.is_active and apps.is_installed(
              'django.contrib.sessions')):
            user.backend = settings.AUTHENTICATION_BACKENDS[0]
            login(request, user)
            return user
        else:
            return False

    except ObjectDoesNotExist:
        return False


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
            # editor = login_user(
            #    request,
            #    ojs_username)
            original_doc = Submission.objects.get(
                submission_id=submission_id, version_id=0)
            last_version = Submission.objects.filter(
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
            submission_access_rights = SubmittedAccessRight.objects.filter(
                submission_id=submission_id,
                document_id=original_doc.document_id)
            for submission_access_right in submission_access_rights:
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
                # them for the new resivion
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
        submissions = Submission.objects.filter(
            submission_id=submission_id)
        if len(submissions) > 0:
            version = len(submissions)
        else:
            # save the rights of authors in original document
            submitted_access_right = SubmittedAccessRight.objects.create(
                document_id=pre_document_id,
                user_id=user_id,
                rights='write',
                submission_id=submission_id
            )
            access_rights = AccessRight.objects.filter(
                document_id=pre_document_id)
            for access_right in access_rights:
                submitted_access_right = SubmittedAccessRight.objects.create(
                    document_id=pre_document_id,
                    user_id=access_right.user_id,
                    rights=access_right.rights,
                    submission_id=submission_id
                )
            submitted_access_right.save()

            original_submission = Submission.objects.create(
                user_id=user_id,
                document_id=pre_document_id,
                journal_id=journal_id,
                submission_id=submission_id,
                version_id=0
            )
            original_submission.save()
        submission = Submission.objects.create(
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
        submission = Submission.objects.get(
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
        submission = Submission.objects.get(
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
        print("could not create user for email " + email)


def get_existing_reviewer(request):
    reviewer = User.objects.get(email=request.POST.get('email'))
    return reviewer


@csrf_exempt
def reviewer_js(request):
    response = {}
    if request.method == 'POST':
        doc_id = int(request.POST.get('doc_id', "0"))
        if doc_id == 0:
            response['error'] = 'doc_id with value: ' + str(doc_id) \
              + ' does not exist'
            status = 404
            return JsonResponse(response, status=status)
        reviewer = get_reviewer_for_post(request)
        try:
            access_right = AccessRight.objects.get(
                document_id=doc_id, user_id=reviewer.id)
            if access_right.rights != 'review':
                access_right.rights = 'review'
                access_right.save()
                response['email'] = request.POST.get('email')
                response['msg'] = 'comment rights given to the user'
                response['reviewer_id'] = reviewer.id
            else:
                response['email'] = request.POST.get('email')
                response[
                    'msg'
                ] = 'User has already comment access right on the document'
                response['reviewer_id'] = reviewer.id
            response['document_id'] = str(doc_id)
            status = 200
            return JsonResponse(response, status=status)
        except ObjectDoesNotExist:
            access_right = AccessRight.objects.create(
                document_id=doc_id,
                user_id=reviewer.id, rights='review', )
            access_right.save()
            status = 200
            response['email'] = request.POST.get('email')
            response['msg'] = 'user created and comment rights given'
            response['reviewer_id'] = reviewer.id
            response['document_id'] = str(doc_id)
            return JsonResponse(response, status=status)


@csrf_exempt
def del_reviewer_js(request):
    response = {}
    if request.method == 'POST':
        # u_name = request.POST.get('user_name')
        try:
            doc_id = int(request.POST.get('doc_id', "0"))
            if doc_id == 0:
                response['msg'] = 'doc_id with value: ' \
                  + str(doc_id) + ' does not exist'
                status = 500
                return JsonResponse(response, status=status)
            reviewer = get_existing_reviewer(request)
            try:
                access_right = AccessRight.objects.get(
                    document_id=doc_id, user_id=reviewer.id)
                if access_right.rights == 'review':
                    access_right.delete()
                    status = 200
                    response['msg'] = 'user updated and comment rights removed'
                    response['document_id'] = str(doc_id)
                    return JsonResponse(response, status=status)
            except ObjectDoesNotExist:
                status = 404
                return JsonResponse(response, status=status)

        except ObjectDoesNotExist:
            status = 404
            response['error'] = "reviewer with this reviewer_id does not exist"
            return JsonResponse(response, status=status)


@csrf_exempt
def document_review_js(request):
    if request.method == 'POST':
        doc_id = int(request.POST.get('doc_id', "0"))
        app_key = request.POST.get('key')
        # email = request.POST.get('email')
        u_name = request.POST.get('user_name')
        response = {}
        if (app_key == settings.SERVER_INFO['OJS_KEY']):
            reviewer = login_user(
                request,
                u_name)
            if reviewer is not None:
                return redirect(
                    '/document/' + str(doc_id) + '/', permanent=True
                )
            else:
                response['error'] = "The reviewer is not valid"
                status = 404
                return JsonResponse(response, status=status)
        else:
            response['error'] = \
              "Reviewing the document is not defined for this reviewer"
            status = 404
            return JsonResponse(response, status=status)


@login_required
def submission_version_js(request):
    status = 405
    response = {}

    if request.is_ajax() and request.method == 'POST':
        data = {}
        data['document_id'] = request.POST.get('document_id')
        data['journal_id'] = request.POST.get('journal_id')
        data['submission_id'] = request.POST.get('submission_id')
        data['pre_document_id'] = request.POST.get('pre_document_id')
        data['user_id'] = request.user.id
        set_version(request, data)
        status = 201
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
            Journal.objects.create(
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

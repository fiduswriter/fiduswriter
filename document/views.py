import time
from django.shortcuts import render
from django.apps import apps
from django.shortcuts import redirect
from django.core import serializers
from django.http import HttpResponse, JsonResponse, HttpRequest
from django.contrib.auth.decorators import login_required
from django.contrib.auth import login
from allauth.account import forms
from django.template.context_processors import csrf
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction
from django.core.exceptions import ObjectDoesNotExist
from django.contrib.auth.models import User
from django.utils.translation import ugettext as _
from django.conf import settings
from django.core.mail import send_mail
from django.db.models import Q
from django.core.serializers.python import Serializer
from django.contrib.admin.views.decorators import staff_member_required
from django.core.paginator import Paginator, EmptyPage

from avatar.utils import get_primary_avatar, get_default_avatar_url
from avatar.templatetags.avatar_tags import avatar_url

from document.models import Document, AccessRight, DocumentRevision, \
    ExportTemplate, Submission, SubmittedAccessRight


class SimpleSerializer(Serializer):
    def end_object(self, obj):
        self._current['id'] = obj._get_pk_val()
        self.objects.append(self._current)


serializer = SimpleSerializer()


def get_accessrights(ars):
    ret = []
    for ar in ars:
        the_avatar = get_primary_avatar(ar.user, 80)
        if the_avatar:
            the_avatar = the_avatar.avatar_url(80)
        else:
            the_avatar = get_default_avatar_url()
        ret.append({
            'document_id': ar.document.id,
            'user_id': ar.user.id,
            'user_name': ar.user.readable_name,
            'rights': ar.rights,
            'avatar': the_avatar
        })
    return ret


def doc_mode(document_id):
    submissions = Submission.objects.filter(
        document_id=document_id)
    if len(submissions) > 0 and submissions[0].version_id != 0:
        return submissions[0]
    else:
        return 'unsubmitted'


@login_required
def index(request):
    response = {}
    response['export_templates'] = ExportTemplate.objects.all()
    response.update(csrf(request))
    return render(request, 'document/index.html',
                  response)


@login_required
def get_documentlist_extra_js(request):
    response = {}
    status = 405
    if request.is_ajax() and request.method == 'POST':
        status = 200
        ids = request.POST['ids'].split(',')
        documents = Document.objects.filter(Q(owner=request.user) | Q(
            accessright__user=request.user)).filter(id__in=ids)
        response['documents'] = serializer.serialize(
            documents, fields=(
                'contents',
                'comments',
                'id',
                'settings',
                'metadata'
            )
        )
    return JsonResponse(
        response,
        status=status
    )


def documents_list(request):
    documents = Document.objects.filter(Q(owner=request.user) | Q(
        accessright__user=request.user)).order_by('-updated')
    output_list = []
    for document in documents:
        if document.owner == request.user:
            access_right = 'write'
        else:
            access_right = AccessRight.objects.get(
                user=request.user,
                document=document
            ).rights
        revisions = DocumentRevision.objects.filter(document=document)
        revision_list = []
        for revision in revisions:
            revision_list.append({
                'date': time.mktime(revision.date.utctimetuple()),
                'note': revision.note,
                'file_name': revision.file_name,
                'pk': revision.pk
            })

        added = time.mktime(document.added.utctimetuple())
        updated = time.mktime(document.updated.utctimetuple())
        is_owner = False
        if document.owner == request.user:
            is_owner = True
        output_list.append({
            'id': document.id,
            'title': document.title,
            'is_owner': is_owner,
            'owner': {
                'id': document.owner.id,
                'name': document.owner.readable_name,
                'avatar': avatar_url(document.owner, 80)
            },
            'added': added,
            'updated': updated,
            'rights': access_right,
            'revisions': revision_list
        })
    return output_list


@login_required
def get_documentlist_js(request):
    response = {}
    status = 405
    if request.is_ajax() and request.method == 'POST':
        status = 200
        response['documents'] = documents_list(request)
        response['team_members'] = []
        for team_member in request.user.leader.all():
            tm_object = {}
            tm_object['id'] = team_member.member.id
            tm_object['name'] = team_member.member.readable_name
            tm_object['avatar'] = avatar_url(team_member.member, 80)
            response['team_members'].append(tm_object)
        response['user'] = {}
        response['user']['id'] = request.user.id
        response['user']['name'] = request.user.readable_name
        response['user']['avatar'] = avatar_url(request.user, 80)
        response['access_rights'] = get_accessrights(
            AccessRight.objects.filter(document__owner=request.user))
    return JsonResponse(
        response,
        status=status
    )


def make_user_data(u_name, u_email):
    u_data = {
        'username': u_name,
        'email': u_email
    }

    return u_data


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


def get_reviewer_for_post(request):
    email = request.POST.get('email')
    u_name = request.POST.get('user_name')
    try:
        reviewers = User.objects.filter(email=email)
        if len(reviewers) > 0:
            reviewer = reviewers[0]
        else:
            # "reviewer with this email does not exist so create it"
            u_data = make_user_data(
                u_name,
                email)
            reviewer = create_user(request, u_data)
            reviewers = User.objects.filter(email=email)
            reviewer = reviewers[0]
        return reviewer
    except ObjectDoesNotExist:
        print ("could not create user for email " + email)


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


@csrf_exempt
def new_submission_revision_js(request):
    if request.method == 'POST':
        submission_id = int(request.POST.get('submission_id'))
        app_key = request.POST.get('key')
        ojs_username = request.POST.get('user_name')
        email = request.POST.get('reviewer_email')
        response = {}
        data = {}
        if app_key == settings.SERVER_INFO['OJS_KEY']:
            editor = login_user(
                request,
                ojs_username)
            if editor is not None:
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
                    send_share_notification(
                        request, data['document_id'],
                        submission_access_right.user_id, submission_access_right.rights)
                    access_right.save()
                set_version(request, data)
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


@login_required
def editor(request):
    response = {}
    response['export_templates'] = ExportTemplate.objects.all()
    return render(request, 'document/editor.html',
                  response)


@login_required
def delete_js(request):
    response = {}
    status = 405
    if request.is_ajax() and request.method == 'POST':
        doc_id = int(request.POST['id'])
        document = Document.objects.get(pk=doc_id, owner=request.user)
        document.delete()
        status = 200
    return JsonResponse(
        response,
        status=status
    )


def send_share_notification(request, doc_id, collaborator_id, right):
    owner = request.user.readable_name
    document = Document.objects.get(id=doc_id)
    collaborator = User.objects.get(id=collaborator_id)
    collaborator_name = collaborator.readable_name
    collaborator_email = collaborator.email
    document_title = document.title
    if len(document_title) == 0:
        document_title = _('Untitled')
    link = HttpRequest.build_absolute_uri(request, document.get_absolute_url())
    message_body = _(
        ('Hey %(collaborator_name)s,\n%(owner)s has shared the document '
         '\'%(document)s\' with you and given you %(right)s access rights. '
         '\nAccess the document through this link: %(link)s')
    ) % {
                       'owner': owner,
                       'right': right,
                       'collaborator_name': collaborator_name,
                       'link': link,
                       'document': document_title
                   }
    send_mail(
        _('Document shared:') +
        ' ' +
        document_title,
        message_body,
        settings.DEFAULT_FROM_EMAIL,
        [collaborator_email],
        fail_silently=True)


def send_share_upgrade_notification(request, doc_id, collaborator_id):
    owner = request.user.readable_name
    document = Document.objects.get(id=doc_id)
    collaborator = User.objects.get(id=collaborator_id)
    collaborator_name = collaborator.readable_name
    collaborator_email = collaborator.email
    link = HttpRequest.build_absolute_uri(request, document.get_absolute_url())
    message_body = _(
        ('Hey %(collaborator_name)s,\n%(owner)s has given you write access '
         'rights to a Fidus Writer document.\nAccess the document through '
         'this link: %(link)s')
    ) % {
                       'owner': owner,
                       'collaborator_name': collaborator_name,
                       'link': link
                   }
    send_mail(
        _('Fidus Writer document write access'),
        message_body,
        settings.DEFAULT_FROM_EMAIL,
        [collaborator_email],
        fail_silently=True)


@login_required
@transaction.atomic
def access_right_save_js(request):
    status = 405
    response = {}
    if request.is_ajax() and request.method == 'POST':
        tgt_documents = request.POST.getlist('documents[]')
        tgt_users = request.POST.getlist('collaborators[]')
        tgt_rights = request.POST.getlist('rights[]')
        for tgt_doc in tgt_documents:
            doc_id = int(tgt_doc)
            try:
                Document.objects.get(pk=doc_id, owner=request.user)
            except ObjectDoesNotExist:
                continue
            x = 0
            for tgt_user in tgt_users:
                collaborator_id = int(tgt_user)
                try:
                    tgt_right = tgt_rights[x]
                except IndexError:
                    tgt_right = 'read'
                if tgt_right == 'delete':
                    # Status 'delete' means the access right is marked for
                    # deletion.
                    try:
                        access_right = AccessRight.objects.get(
                            document_id=doc_id, user_id=collaborator_id)
                        access_right.delete()
                    except:
                        pass
                else:
                    try:
                        access_right = AccessRight.objects.get(
                            document_id=doc_id, user_id=collaborator_id)
                        if access_right.rights != tgt_right:
                            access_right.rights = tgt_right
                            if tgt_right == 'write':
                                send_share_upgrade_notification(
                                    request, doc_id, collaborator_id)
                    except ObjectDoesNotExist:
                        access_right = AccessRight.objects.create(
                            document_id=doc_id,
                            user_id=collaborator_id,
                            rights=tgt_right,
                        )
                        send_share_notification(
                            request, doc_id, collaborator_id, tgt_right)
                    access_right.save()
                x += 1
        response['access_rights'] = get_accessrights(
            AccessRight.objects.filter(document__owner=request.user))
        status = 201
    return JsonResponse(
        response,
        status=status
    )


@login_required
def submission_version_js(request):
    status = 405
    response = {}

    if request.is_ajax() and request.method == 'POST':
        data = {}
        data['user_id'] = request.POST.get('user_id')
        data['document_id'] = request.POST.get('document_id')
        data['journal_id'] = request.POST.get('journal_id')
        data['submission_id'] = request.POST.get('submission_id')
        data['pre_document_id'] = request.POST.get('pre_document_id')
        set_version(request, data)
        status = 201
    return JsonResponse(
        response,
        status=status
    )


@login_required
def set_version(request, data):
    user_id = data['user_id']
    document_id = data['document_id']
    journal_id = data['journal_id']
    submission_id = data['submission_id']
    pre_document_id = data['pre_document_id']
    version = 1
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


@login_required
def review_submit_js(request):
    status = 405
    response = {}
    if request.is_ajax() and request.method == 'POST':
        document_id = request.POST.get('document_id')
        user_id = request.POST.get('user_id')
        tgt_right = 'read-without-comments'
        access_right = AccessRight.objects.get(
            document_id=document_id, user_id=user_id)
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
        the_user = User.objects.filter(id=user_id)
        if len(the_user) > 0:
            response['user'] = {}
            response['user']['email'] = the_user[0].email
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
        user_id = request.POST.get('user_id')
        tgt_right = 'review'
        access_right = AccessRight.objects.get(
            document_id=document_id, user_id=user_id)
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
        the_user = User.objects.filter(id=user_id)
        if len(the_user) > 0:
            response['user'] = {}
            response['user']['email'] = the_user[0].email
        status = 201
    return JsonResponse(
        response,
        status=status
    )


@login_required
def import_js(request):
    response = {}
    status = 405
    if request.is_ajax() and request.method == 'POST':
        document = Document.objects.create(owner_id=request.user.pk)
        document.title = request.POST['title']
        document.contents = request.POST['contents']
        document.comments = request.POST['comments']
        document.metadata = request.POST['metadata']
        document.settings = request.POST['settings']
        document.save()
        response['document_id'] = document.id
        response['added'] = time.mktime(document.added.utctimetuple())
        response['updated'] = time.mktime(document.updated.utctimetuple())
        status = 201
    return JsonResponse(
        response,
        status=status
    )


@login_required
def upload_revision_js(request):
    response = {}
    can_save = False
    status = 405
    if request.is_ajax() and request.method == 'POST':
        document_id = request.POST['document_id']
        document = Document.objects.filter(id=int(document_id))
        if len(document) > 0:
            document = document[0]
            if document.owner == request.user:
                can_save = True
            else:
                access_rights = AccessRight.objects.filter(
                    document=document, user=request.user)
                if len(access_rights) > 0 and access_rights[
                    0
                ].rights == 'write':
                    can_save = True
        if can_save:
            status = 201
            revision = DocumentRevision()
            revision.file_object = request.FILES['file']
            revision.file_name = request.FILES['file'].name
            revision.note = request.POST['note']
            revision.document_id = document_id
            revision.save()
    return JsonResponse(
        response,
        status=status
    )


@login_required
def get_user(request):
    id = request.POST["user_id"]
    the_user = User.objects.filter(id=id)
    return the_user


# Download a revision that was previously uploaded
@login_required
def get_revision(request, revision_id):
    if request.user.is_staff:
        revision = DocumentRevision.objects.get(pk=int(revision_id))
    else:
        revision = DocumentRevision.objects.get(
            pk=int(revision_id),
            document__owner=request.user
        )
    http_response = HttpResponse(
        revision.file_object.file,
        content_type='application/zip; charset=x-user-defined',
        status=200
    )
    http_response[
        'Content-Disposition'] = 'attachment; filename=some_name.zip'
    return http_response


@login_required
def delete_revision_js(request):
    response = {}
    status = 405
    if request.is_ajax() and request.method == 'POST':
        revision_id = request.POST['id']
        revision = DocumentRevision.objects.filter(pk=int(revision_id))
        if len(revision) > 0:
            revision = revision[0]
            document = revision.document
            if document.owner == request.user:
                status = 200
                revision.delete()
    return JsonResponse(
        response,
        status=status
    )


# maintenance views
@staff_member_required
def get_all_docs_js(request):
    response = {}
    status = 405
    if request.is_ajax() and request.method == 'POST':
        status = 200
        doc_list = Document.objects.all()
        paginator = Paginator(doc_list, 10)  # Get 10 docs per page

        batch = request.POST['batch']
        try:
            response['docs'] = serializers.serialize(
                'json',
                paginator.page(batch)
            )
        except EmptyPage:
            response['docs'] = "[]"
    return JsonResponse(
        response,
        status=status
    )


@staff_member_required
def save_doc_js(request):
    response = {}
    status = 405
    if request.is_ajax() and request.method == 'POST':
        status = 200
        doc_id = request.POST['id']
        doc = Document.objects.get(pk=int(doc_id))
        # Only looking at fields that may have changed.
        contents = request.POST.get('contents', False)
        metadata = request.POST.get('metadata', False)
        settings = request.POST.get('settings', False)
        last_diffs = request.POST.get('last_diffs', False)
        diff_version = request.POST.get('diff_version', False)
        version = request.POST.get('version', False)
        if contents:
            doc.contents = contents
        if metadata:
            doc.metadata = metadata
        if settings:
            doc.settings = settings
        if version:
            doc.version = version
        if last_diffs:
            doc.last_diffs = last_diffs
        if diff_version:
            doc.diff_version = diff_version
        doc.save()
    return JsonResponse(
        response,
        status=status
    )


@staff_member_required
def get_all_revision_ids_js(request):
    response = {}
    status = 405
    if request.is_ajax() and request.method == 'POST':
        status = 200
        revisions = DocumentRevision.objects.only('id')
        response["revision_ids"] = []
        for revision in revisions:
            response["revision_ids"].append(revision.id)
    return JsonResponse(
        response,
        status=status
    )


@staff_member_required
def update_revision_js(request):
    response = {}
    status = 405
    if request.is_ajax() and request.method == 'POST':
        status = 200
        revision_id = request.POST['id']
        revision = DocumentRevision.objects.get(pk=int(revision_id))
        # keep the filename
        file_name = revision.file_object.name
        revision.file_object = request.FILES['file']
        revision.file_object.name = file_name
        revision.save()
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


# TODO: This seems to give any user with a valid login access to all users
# email addresses. This will need to be secured in some way.
@login_required
def profile_js(request):
    response = {}
    status = 405
    if (
        request.is_ajax() and
        request.method == 'POST' and
        settings.SERVER_INFO['EXPERIMENTAL'] is True
    ):
        id = request.POST["user_id"]
        the_user = User.objects.filter(id=id)
        if len(the_user) > 0:
            response['user'] = {}
            response['user']['id'] = the_user[0].id
            response['user']['username'] = the_user[0].username
            response['user']['first_name'] = the_user[0].first_name
            response['user']['last_name'] = the_user[0].last_name
            response['user']['email'] = the_user[0].email
            status = 200
        else:
            status = 201
    return JsonResponse(
        response,
        status=status
    )

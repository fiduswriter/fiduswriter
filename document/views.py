import re
import json
import time
from django.shortcuts import render
from django.http import HttpResponse, JsonResponse, HttpRequest
from django.contrib.auth.decorators import login_required
from django.template.context_processors import csrf
from django.db import transaction
from django.core.exceptions import ObjectDoesNotExist
from django.contrib.auth.models import User
from django.utils.translation import ugettext as _
from django.conf import settings
from django.core.mail import send_mail
from django.core.exceptions import PermissionDenied
from django.db.models import Q
from django.core.serializers.python import Serializer

from avatar.util import get_primary_avatar, get_default_avatar_url
from avatar.templatetags.avatar_tags import avatar_url

from document.models import Document, AccessRight, DocumentRevision
from document.rdf import RDFBuilder
from document.helpers.filtering_comments import filter_comments_by_role
from document.helpers.session_user_info import SessionUserInfo


class SimpleSerializer(Serializer):

    def end_object(self, obj):
        self._current['id'] = obj._get_pk_val()
        self.objects.append(self._current)
serializer = SimpleSerializer()


def get_document__and_comments(document_id, user):
    """
    Function for getting document and filtered comments info
    :param document_id: Id of document
    :type document_id: int
    :param user: Information about user
    :type user: dict
    :return document and filtered comments:
    :rtype: tuple
    """
    user_info = SessionUserInfo()

    document, can_access = user_info.init_access(document_id, user)
    if not can_access:
        raise PermissionDenied('User does not have enough permissions')

    comments_content = json.loads(document.comments)
    access_rights = get_accessrights(
        AccessRight.objects.filter(
            document__owner=document.owner))
    filtered = filter_comments_by_role(
        comments_content, access_rights, 'editing', user_info)
    return (document, filtered)


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


@login_required
def index(request):
    response = {}
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
        # documents = Document.objects.filter(id__in=ids)
        response['documents'] = serializer.serialize(
            documents, fields=('contents', 'id', 'settings', 'metadata'))
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


def get_rdf_comments(request):
    """
    Getting rdf comments from RDF Builder
    :param request:
    :type request:
    :return:
    :rtype:
    """

    host_url = request.scheme + '://' + request.META['SERVER_NAME'] + '/'
    res_url_match = re.match('\/document\/(\d+)\/', request.get_full_path())
    document_id = int(res_url_match.group(1))

    document, comments_content = get_document__and_comments(
        document_id, request.user)
    rdf = RDFBuilder(host_url)
    return HttpResponse(
        rdf.get_comments_by_document(
            document, comments_content))


@login_required
def editor(request):
    response = {}

    if 'CONTENT_TYPE' in request.META.keys() and request.META[
            'CONTENT_TYPE'] == 'application/rdf+turtle':
        return get_rdf_comments(request)

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
def import_js(request):
    response = {}
    status = 405
    if request.is_ajax() and request.method == 'POST':
        document = Document.objects.create(owner_id=request.user.pk)
        document.title = request.POST['title']
        document.contents = request.POST['contents']
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
def upload_js(request):
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
                        0].rights == 'write':
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

# Download a revision that was previously uploaded


@login_required
def download_js(request):
    can_access = False
    response = {}
    if request.is_ajax() and request.method == 'POST':
        revision_id = request.POST['id']
        revision = DocumentRevision.objects.filter(pk=int(revision_id))
        if len(revision) > 0:
            revision = revision[0]
            document = revision.document
            if document.owner == request.user:
                can_access = True
            # else:
            #    access_rights = AccessRight.objects.filter(
            #        document=document, user=request.user)
                # if len(access_rights) > 0:
                #     can_save = True
        if can_access:
            response = {}
            http_response = HttpResponse(
                revision.file_object.file,
                content_type='application/zip; charset=x-user-defined',
                status=200
            )
            http_response[
                'Content-Disposition'] = 'attachment; filename=some_name.zip'
            return http_response
    return JsonResponse(
        response,
        status=405
    )


@login_required
def delete_revision_js(request):
    response = {}
    # can_save = False
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

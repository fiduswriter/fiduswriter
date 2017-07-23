import time
from django.shortcuts import render
from django.core import serializers
from django.http import HttpResponse, JsonResponse, HttpRequest
from django.contrib.auth.decorators import login_required
from django.template.context_processors import csrf
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
    ExportTemplate, CAN_UPDATE_DOCUMENT
from document.helpers.serializers import PythonWithURLSerializer

from style.models import CitationStyle, CitationLocale


class SimpleSerializer(Serializer):
    def end_object(self, obj):
        self._current['id'] = obj._get_pk_val()
        self.objects.append(self._current)


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
        serializer = SimpleSerializer()
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
        serializer = PythonWithURLSerializer()
        cit_styles = serializer.serialize(
            CitationStyle.objects.all()
        )
        response['citation_styles'] = [obj['fields'] for obj in cit_styles]
        cit_locales = serializer.serialize(CitationLocale.objects.all())
        response['citation_locales'] = [obj['fields'] for obj in cit_locales]
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


@login_required
def editor(request):
    response = {}
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
        if 'doc_id' in request.POST:
            doc_id = request.POST['doc_id']
            # There is a doc_id, so we overwrite an existing doc rather than
            # creating a new one.
            document = Document.objects.get(id=int(doc_id))
            if (
                document.owner != request.user and
                len(AccessRight.objects.filter(
                    document_id=doc_id,
                    user_id=request.user.id,
                    rights__in=CAN_UPDATE_DOCUMENT
                )) == 0
            ):
                response['error'] = 'No access to file'
                status = 403
                return JsonResponse(
                    response,
                    status=status
                )
            if document.version > 0:
                # The file has been initialized already. Do not do this again.
                # This could happen if two users click on the link almost at
                # the same time.
                response['document_id'] = document.id
                response['added'] = time.mktime(document.added.utctimetuple())
                response['updated'] = time.mktime(
                    document.updated.utctimetuple()
                )
                status = 200
                return JsonResponse(
                    response,
                    status=status
                )
            else:
                # We increase the version to 1 to mark that the file now
                # contains imported contents.
                document.version = 1
                document.diff_version = 1
        else:
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

import time
import os
import bleach
import json
from tornado.escape import json_decode, json_encode
from django.core import serializers
from django.http import HttpResponse, JsonResponse, HttpRequest
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
from django.db import transaction
from django.core.files import File
from django.contrib.auth.models import User
from django.utils.translation import ugettext as _
from django.conf import settings
from django.core.mail import send_mail
from django.db.models import F, Q
from django.contrib.admin.views.decorators import staff_member_required

from user.util import get_user_avatar_url
from document.models import Document, AccessRight, DocumentRevision, \
    DocumentTemplate, AccessRightInvite, CAN_UPDATE_DOCUMENT, \
    CAN_COMMUNICATE, FW_DOCUMENT_VERSION
from usermedia.models import DocumentImage, Image
from bibliography.models import Entry
from document.helpers.serializers import PythonWithURLSerializer
from bibliography.views import serializer
from style.models import DocumentStyle
from base.html_email import html_email
from base.decorators import ajax_required
from user.models import TeamMember


@login_required
@ajax_required
@require_POST
def get_documentlist_extra(request):
    response = {}
    status = 200
    ids = request.POST['ids'].split(',')
    docs = Document.objects.filter(Q(owner=request.user) | Q(
        accessright__user=request.user)).filter(id__in=ids)
    response['documents'] = []
    for doc in docs:
        images = {}
        for image in doc.documentimage_set.all():
            images[image.image.id] = {
                'added': image.image.added,
                'checksum': image.image.checksum,
                'file_type': image.image.file_type,
                'height': image.image.height,
                'id': image.image.id,
                'image': image.image.image.url,
                'thumbnail': image.image.thumbnail.url,
                'title': image.title,
                'copyright': json.loads(image.copyright),
                'width': image.image.width
            }
        response['documents'].append({
            'images': images,
            'contents': doc.contents,
            'comments': doc.comments,
            'bibliography': doc.bibliography,
            'id': doc.id
        })
    return JsonResponse(
        response,
        status=status
    )


@login_required
def documents_list(request):
    documents = Document.objects.filter(
        Q(owner=request.user) | Q(accessright__user=request.user),
        listed=True
    ).order_by('-updated')
    output_list = []
    for document in documents:
        if document.owner == request.user:
            access_right = 'write'
        else:
            access_right = AccessRight.objects.get(
                user=request.user,
                document=document
            ).rights
        if (
            request.user.is_staff or
            document.owner == request.user or
            AccessRight.objects.filter(
                document=document,
                user=request.user,
                rights__in=CAN_COMMUNICATE
            ).first()
        ):
            revisions = DocumentRevision.objects.filter(document=document)
            revision_list = []
            for revision in revisions:
                revision_list.append({
                    'date': time.mktime(revision.date.utctimetuple()),
                    'note': revision.note,
                    'file_name': revision.file_name,
                    'pk': revision.pk
                })
        else:
            revision_list = []
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
                'avatar': get_user_avatar_url(document.owner)
            },
            'added': added,
            'updated': updated,
            'rights': access_right,
            'revisions': revision_list
        })
    return output_list


@login_required
@ajax_required
@require_POST
def get_access_rights(request):
    response = {}
    status = 200
    ar_qs = AccessRight.objects.filter(document__owner=request.user)
    in_qs = AccessRightInvite.objects.filter(document__owner=request.user)
    doc_ids = request.POST.getlist('document_ids[]')
    if len(doc_ids) > 0:
        ar_qs = ar_qs.filter(document_id__in=doc_ids)
        in_qs = in_qs.filter(document_id__in=doc_ids)
    access_rights = []
    for ar in ar_qs:
        access_rights.append({
            'document_id': ar.document.id,
            'user_id': ar.user.id,
            'user_name': ar.user.readable_name,
            'rights': ar.rights,
            'avatar': get_user_avatar_url(ar.user)
        })
    response['access_rights'] = access_rights
    invites = []
    for inv in in_qs:
        invites.append({
            'document_id': inv.document.id,
            'email': inv.email,
            'rights': inv.rights
        })
    response['invites'] = invites
    return JsonResponse(
        response,
        status=status
    )


@login_required
@ajax_required
@require_POST
@transaction.atomic
def save_access_rights(request):
    response = {}
    doc_ids = json_decode(request.POST['document_ids'])
    rights = json_decode(request.POST['access_rights'])
    invites = json_decode(request.POST['invites'])
    for doc_id in doc_ids:
        doc = Document.objects.filter(
            pk=doc_id,
            owner=request.user
        ).first()
        if not doc:
            continue
        for right in rights:
            if right['rights'] == 'delete':
                # Status 'delete' means the access right is marked for
                # deletion.
                AccessRight.objects.filter(
                    document_id=doc_id,
                    user_id=right['user_id']
                ).delete()
            else:
                access_right = AccessRight.objects.filter(
                    document_id=doc_id,
                    user_id=right['user_id']
                ).first()
                if access_right:
                    if access_right.rights != right['rights']:
                        access_right.rights = right['rights']
                        send_share_notification(
                            request,
                            doc_id,
                            right['user_id'],
                            right['rights'],
                            True
                        )
                else:
                    access_right = AccessRight.objects.create(
                        document_id=doc_id,
                        user_id=right['user_id'],
                        rights=right['rights']
                    )
                    send_share_notification(
                        request,
                        doc_id,
                        right['user_id'],
                        right['rights'],
                        False
                    )
                access_right.save()
        for invite in invites:
            if invite['rights'] == 'delete':
                # Status 'delete' means the invite is marked for
                # deletion.
                AccessRightInvite.objects.filter(
                    document_id=doc_id,
                    email=invite['email']
                ).delete()
            else:
                old_invite = AccessRightInvite.objects.filter(
                    document_id=doc_id,
                    email=invite['email']
                ).first()
                if old_invite:
                    if old_invite.rights != invite['rights']:
                        old_invite.rights = invite['rights']
                        old_invite.save()
                        send_invite_notification(
                            request,
                            doc_id,
                            invite['email'],
                            invite['rights'],
                            old_invite,
                            True
                        )
                else:
                    new_invite = AccessRightInvite.objects.create(
                        document_id=doc_id,
                        email=invite['email'],
                        rights=invite['rights']
                    )
                    new_invite.save()
                    send_invite_notification(
                        request,
                        doc_id,
                        invite['email'],
                        invite['rights'],
                        new_invite,
                        False
                    )
    status = 201
    return JsonResponse(
        response,
        status=status
    )


def apply_invite(inv, user):
    old_ar = AccessRight.objects.filter(
        user=user,
        document=inv.document
    ).first()
    if old_ar:
        # If the user already has rights, we should only be upgrading
        # them, not downgrade. Unfortuantely it is not easy to
        # say how each right compares. So unless the invite gives read
        # access, or the user already has write access, we change to
        # the access right of the invite.
        if inv.rights == 'read':
            pass
        elif old_ar.rights == 'write':
            pass
        else:
            old_ar.rights = inv.rights
            old_ar.save()
    elif inv.document.owner == user:
        pass
    else:
        ar = AccessRight.objects.create(
            document=inv.document,
            user=user,
            rights=inv.rights
        )
        ar.save()
        if not TeamMember.objects.filter(
            leader=inv.document.owner,
            member=user
        ).first():
            tm1 = TeamMember.objects.create(
                leader=inv.document.owner,
                member=user
            )
            tm1.save()
        if not TeamMember.objects.filter(
            leader=user,
            member=inv.document.owner,
        ).first():
            tm2 = TeamMember.objects.create(
                leader=user,
                member=inv.document.owner
            )
            tm2.save()
    inv.delete()


@login_required
@ajax_required
@require_POST
def invite(request):
    response = {}
    status = 200
    id = int(request.POST['id'])
    inv = AccessRightInvite.objects.filter(id=id).first()
    if inv:
        response['redirect'] = inv.document.get_absolute_url()
        apply_invite(inv, request.user)
    else:
        response['redirect'] = ''
    return JsonResponse(
        response,
        status=status
    )


@login_required
@ajax_required
@require_POST
def get_documentlist(request):
    response = {}
    status = 200
    response['documents'] = documents_list(request)
    response['team_members'] = []
    for team_member in request.user.leader.all():
        tm_object = {}
        tm_object['id'] = team_member.member.id
        tm_object['name'] = team_member.member.readable_name
        tm_object['username'] = team_member.member.get_username()
        tm_object['avatar'] = get_user_avatar_url(team_member.member)
        response['team_members'].append(tm_object)
    serializer = PythonWithURLSerializer()
    doc_styles = serializer.serialize(
        DocumentStyle.objects.filter(
            Q(document_template__user=None) |
            Q(document_template__user=request.user)
        ),
        use_natural_foreign_keys=True,
        fields=['title', 'slug', 'contents', 'documentstylefile_set']
    )
    response['document_styles'] = [obj['fields'] for obj in doc_styles]
    doc_templates = DocumentTemplate.objects.filter(
        Q(user=request.user) | Q(user=None)
    ).order_by(F('user').desc(nulls_first=True))
    response['document_templates'] = {}
    for obj in doc_templates:
        response['document_templates'][obj.import_id] = {
            'title': obj.title,
            'id': obj.id
        }
    return JsonResponse(
        response,
        status=status
    )


@login_required
@ajax_required
@require_POST
def delete(request):
    response = {}
    status = 200
    doc_id = int(request.POST['id'])
    document = Document.objects.get(pk=doc_id, owner=request.user)
    if document.is_deletable():
        image_ids = list(
            DocumentImage.objects.filter(document_id=doc_id)
            .values_list('image_id', flat=True)
        )
        document.delete()
        for image in Image.objects.filter(id__in=image_ids):
            if image.is_deletable():
                image.delete()
        response['done'] = True
    else:
        response['done'] = False
    return JsonResponse(
        response,
        status=status
    )


def send_share_notification(request, doc_id, collaborator_id, rights, change):
    owner = request.user.readable_name
    document = Document.objects.get(id=doc_id)
    collaborator = User.objects.get(id=collaborator_id)
    collaborator_name = collaborator.readable_name
    collaborator_email = collaborator.email
    document_title = document.title
    if len(document_title) == 0:
        document_title = _('Untitled')
    link = HttpRequest.build_absolute_uri(request, document.get_absolute_url())
    if change:
        message_text = _(
            ('Hey %(collaborator_name)s,\n%(owner)s has changed your access '
             'rights to %(rights)s on the document \'%(document_title)s\'. '
             '\nAccess the document through this link: %(link)s')
        ) % {
            'owner': owner,
            'rights': rights,
            'collaborator_name': collaborator_name,
            'link': link,
            'document_title': document_title
        }
        body_html_intro = _(
            ('<p>Hey %(collaborator_name)s,<br>%(owner)s has changed your '
             'access rights to %(rights)s on the document '
             '\'%(document_title)s\'.</p>')
        ) % {
            'owner': owner,
            'rights': rights,
            'collaborator_name': collaborator_name,
            'document_title': document_title
        }
    else:
        message_text = _(
            ('Hey %(collaborator_name)s,\n%(owner)s has shared the document '
             '\'%(document_title)s\' with you and given you %(rights)s access '
             'rights. '
             '\nAccess the document through this link: %(link)s')
        ) % {
            'owner': owner,
            'rights': rights,
            'collaborator_name': collaborator_name,
            'link': link,
            'document_title': document_title
        }
        body_html_intro = _(
            ('<p>Hey %(collaborator_name)s,<br>%(owner)s has shared the '
             'document \'%(document_title)s\' with you and given you '
             '%(rights)s access rights.</p>')
        ) % {
            'owner': owner,
            'rights': rights,
            'collaborator_name': collaborator_name,
            'document_title': document_title
        }

    body_html = (
        '<h1>%(document_title)s %(shared)s</h1>'
        '%(body_html_intro)s'
        '<table>'
        '<tr><td>'
        '%(Document)s'
        '</td><td>'
        '<b>%(document_title)s</b>'
        '</td></tr>'
        '<tr><td>'
        '%(Author)s'
        '</td><td>'
        '%(owner)s'
        '</td></tr>'
        '<tr><td>'
        '%(AccessRights)s'
        '</td><td>'
        '%(rights)s'
        '</td></tr>'
        '</table>'
        '<div class="actions"><a class="button" href="%(link)s">'
        '%(AccessTheDocument)s'
        '</a></div>'
    ) % {
        'shared': _('shared'),
        'body_html_intro': body_html_intro,
        'Document': _('Document'),
        'document_title': document_title,
        'Author': _('Author'),
        'owner': owner,
        'AccessRights': _('Access Rights'),
        'rights': rights,
        'link': link,
        'AccessTheDocument': _('Access the document')
    }
    send_mail(
        _('Document shared:') +
        ' ' +
        document_title,
        message_text,
        settings.DEFAULT_FROM_EMAIL,
        [collaborator_email],
        fail_silently=True,
        html_message=html_email(body_html)
    )


def send_invite_notification(request, doc_id, email, rights, invite, change):
    owner = request.user.readable_name
    document = Document.objects.get(id=doc_id)
    document_title = document.title
    if len(document_title) == 0:
        document_title = _('Untitled')
    link = HttpRequest.build_absolute_uri(request, invite.get_absolute_url())
    if change:
        message_text = _(
            ('Hey %(email)s,\nas we told you previously, %(owner)s has '
             'invited you to join Fidus Writer and shared the document '
             '\'%(document_title)s\' with you. '
             '\n%(owner)s has now changed your access rights to %(rights)s.'
             '\nAccess the document through this link: %(link)s')
        ) % {
            'owner': owner,
            'rights': rights,
            'email': email,
            'link': link,
            'document_title': document_title
        }
        body_html_intro = _(
            ('<p>Hey %(email)s,<br>as we told you previously, '
             '%(owner)s has invited you to join Fidus Writer and shared the '
             '\'%(document_title)s\' with you.</p>'
             '<p>%(owner)s has now changed your access rights to %(rights)s. '
             '</p>')
        ) % {
            'owner': owner,
            'rights': rights,
            'email': email,
            'document_title': document_title
        }
    else:
        message_text = _(
            ('Hey %(email)s,\n%(owner)s has invited you to Fidus '
             ' Writer, shared the document \'%(document_title)s\' with you, '
             'and given you %(rights)s access rights. '
             '\nAccess the document through this link: %(link)s')
        ) % {
            'owner': owner,
            'rights': rights,
            'email': email,
            'link': link,
            'document_title': document_title
        }
        body_html_intro = _(
            ('<p>Hey %(email)s,<br>%(owner)s has invited you to '
             'Fidus Writer, shared the document \'%(document_title)s\' with '
             'you, and given you %(rights)s access rights.</p>')
        ) % {
            'owner': owner,
            'rights': rights,
            'email': email,
            'document_title': document_title
        }

    body_html = (
        '<h1>%(document_title)s %(shared)s</h1>'
        '%(body_html_intro)s'
        '<table>'
        '<tr><td>'
        '%(Document)s'
        '</td><td>'
        '<b>%(document_title)s</b>'
        '</td></tr>'
        '<tr><td>'
        '%(Author)s'
        '</td><td>'
        '%(owner)s'
        '</td></tr>'
        '<tr><td>'
        '%(AccessRights)s'
        '</td><td>'
        '%(rights)s'
        '</td></tr>'
        '</table>'
        '<div class="actions"><a class="button" href="%(link)s">'
        '%(AccessTheDocument)s'
        '</a></div>'
    ) % {
        'shared': _('shared'),
        'body_html_intro': body_html_intro,
        'Document': _('Document'),
        'document_title': document_title,
        'Author': _('Author'),
        'owner': owner,
        'AccessRights': _('Access Rights'),
        'rights': rights,
        'link': link,
        'AccessTheDocument': _('Sign up or log in and access the document')
    }
    send_mail(
        _('Document shared:') +
        ' ' +
        document_title,
        message_text,
        settings.DEFAULT_FROM_EMAIL,
        [email],
        fail_silently=True,
        html_message=html_email(body_html)
    )


@login_required
@ajax_required
@require_POST
def create_doc(request, template_id):
    response = {}
    document_template = DocumentTemplate.objects.filter(
        Q(user=request.user) | Q(user=None),
        id=template_id
    ).first()
    if not document_template:
        return JsonResponse(
            response,
            status=405
        )
    document = Document.objects.create(
        owner_id=request.user.pk,
        template_id=template_id
    )
    response['id'] = document.id
    return JsonResponse(
        response,
        status=201
    )


@login_required
@ajax_required
@require_POST
def import_create(request):
    # First step of import: Create a document and return the id of it
    response = {}
    status = 201
    import_id = request.POST['import_id']
    document_template = DocumentTemplate.objects.filter(
        Q(user=request.user) | Q(user=None),
        import_id=import_id
    ).order_by(F('user').desc(nulls_last=True)).first()
    if not document_template:
        # The user doesn't have this template.
        # We check whether the template exists with one of the documents
        # shared with the user. If so, we'll copy it so that we can avoid
        # having to create an entirely new template without styles or
        # exporter templates
        access_right = request.user.accessright_set.filter(
            document__template__import_id=import_id
        ).first()
        if access_right:
            document_template = access_right.document.template
            document_styles = list(
                document_template.documentstyle_set.all()
            )
            export_templates = list(
                document_template.exporttemplate_set.all()
            )
            document_template.pk = None
            document_template.user = request.user
            document_template.save()
            for ds in document_styles:
                style_files = list(ds.documentstylefile_set.all())
                ds.pk = None
                ds.document_template = document_template
                ds.save()
                for sf in style_files:
                    sf.pk = None
                    sf.style = ds
                    sf.save()
            for et in export_templates:
                et.pk = None
                et.document_template = document_template
                et.save()
    if not document_template:
        title = request.POST['template_title']
        definition = json_encode(json_decode(request.POST['template']))
        document_template = DocumentTemplate()
        document_template.title = title
        document_template.import_id = import_id
        document_template.user = request.user
        document_template.definition = definition
        document_template.save()
    document = Document.objects.create(
        owner=request.user,
        template=document_template
    )
    response['id'] = document.id
    return JsonResponse(
        response,
        status=status
    )


@login_required
@ajax_required
@require_POST
def import_image(request):
    # create an image for a document
    response = {}
    document = Document.objects.filter(
        owner_id=request.user.pk,
        id=int(request.POST['doc_id'])
    ).first()
    if document:
        status = 201
    else:
        status = 401
        return JsonResponse(
            response,
            status=status
        )
    checksum = request.POST['checksum']
    image = Image.objects.filter(checksum=checksum).first()
    if image is None:
        image = Image.objects.create(
            uploader=request.user,
            image=request.FILES['image'],
            checksum=checksum
        )
    doc_image = DocumentImage.objects.create(
        image=image,
        title=request.POST['title'],
        copyright=json.dumps(request.POST['copyright']),
        document=document
    )
    response['id'] = doc_image.image.id
    return JsonResponse(
        response,
        status=status
    )


@login_required
@ajax_required
@require_POST
def import_doc(request):
    response = {}
    doc_id = request.POST['id']
    # There is a doc_id, so we overwrite an existing doc rather than
    # creating a new one.
    document = Document.objects.get(id=int(doc_id))
    if (
        document.owner != request.user and not
        AccessRight.objects.filter(
            document_id=doc_id,
            user_id=request.user.id,
            rights__in=CAN_UPDATE_DOCUMENT
        ).first()
    ):
        response['error'] = 'No access to file'
        status = 403
        return JsonResponse(
            response,
            status=status
        )
    document.title = request.POST['title']
    # We need to decode/encode the following so that it has the same
    # character encoding as used the the save_document method in ws_views.
    document.contents = json_encode(json_decode(request.POST['contents']))
    document.comments = json_encode(json_decode(request.POST['comments']))
    document.bibliography = \
        json_encode(json_decode(request.POST['bibliography']))
    # document.doc_version should always be the current version, so don't
    # bother about it.
    document.save()
    response['document_id'] = document.id
    response['added'] = time.mktime(document.added.utctimetuple())
    response['updated'] = time.mktime(document.updated.utctimetuple())
    status = 200
    return JsonResponse(
        response,
        status=status
    )


@login_required
@ajax_required
@require_POST
def upload_revision(request):
    response = {}
    status = 405
    can_save = False
    document_id = request.POST['document_id']
    document = Document.objects.filter(id=int(document_id)).first()
    if document:
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
    revision = DocumentRevision.objects.filter(pk=int(revision_id)).first()
    if revision and (
        request.user.is_staff or
        revision.document.owner == request.user or
        AccessRight.objects.filter(
            document=revision.document,
            user=request.user,
            rights__in=CAN_COMMUNICATE
        ).first()
    ):
        http_response = HttpResponse(
            revision.file_object.file,
            content_type='application/zip; charset=x-user-defined',
            status=200
        )
        http_response[
            'Content-Disposition'] = 'attachment; filename=some_name.zip'
    else:
        http_response = HttpResponse(status=404)
    return http_response


@login_required
@ajax_required
@require_POST
def delete_revision(request):
    response = {}
    status = 405
    revision_id = request.POST['id']
    revision = DocumentRevision.objects.filter(pk=int(revision_id)).first()
    if revision:
        document = revision.document
        if document.owner == request.user:
            status = 200
            revision.delete()
    return JsonResponse(
        response,
        status=status
    )


# Check doc access rights.
def has_doc_access(doc, user):
    if doc.owner == user:
        return True
    access_rights = AccessRight.objects.filter(
        document=doc,
        user=user
    ).first()
    if access_rights:
        return True
    else:
        return False


@login_required
@ajax_required
@require_POST
def comment_notify(request):
    response = {}
    doc_id = request.POST['doc_id']
    collaborator_id = request.POST['collaborator_id']
    comment_text = request.POST['comment_text']
    comment_html = bleach.clean(
        request.POST['comment_html'],
        strip=True
    )
    notification_type = request.POST['type']
    collaborator = User.objects.filter(pk=collaborator_id).first()
    document = Document.objects.filter(pk=doc_id).first()
    if (
        not document or
        not collaborator or
        not comment_text or
        not comment_html or
        not has_doc_access(document, request.user) or
        not notification_type
    ):
        return JsonResponse(
            response,
            status=403
        )
    if (
        not has_doc_access(document, collaborator)
    ):
        # Tagged user has no access to document and will therefore not be
        # notified
        return JsonResponse(
            response,
            status=200
        )
    commentator = request.user.readable_name
    collaborator_name = collaborator.readable_name
    collaborator_email = collaborator.email
    document_title = document.title
    if len(document_title) == 0:
        document_title = _('Untitled')
    link = HttpRequest.build_absolute_uri(request, document.get_absolute_url())

    if notification_type == 'mention':

        message_text = _(
            ('Hey %(collaborator_name)s,\n%(commentator)s has mentioned you '
             'in a comment in the document \'%(document)s\':'
             '\n\n%(comment_text)s'
             '\n\nGo to the document here: %(link)s')
        ) % {
               'commentator': commentator,
               'collaborator_name': collaborator_name,
               'link': link,
               'document': document_title,
               'comment_text': comment_text
        }

        body_html_title = _(
            ('Hey %(collaborator_name)s,<br>%(commentator)s has mentioned '
             'you in a comment in the document \'%(document_title)s\'.')
        ) % {
            'commentator': commentator,
            'collaborator_name': collaborator_name,
            'document_title': document_title
        }
        message_title = _('Comment on :') + ' ' + document_title
    else:
        message_text = _(
            ('Hey %(collaborator_name)s,\n%(commentator)s has assigned you to '
             'a comment in the document \'%(document)s\':\n\n%(comment_text)s'
             '\n\nGo to the document here: %(link)s')
        ) % {
               'commentator': commentator,
               'collaborator_name': collaborator_name,
               'link': link,
               'document': document_title,
               'comment_text': comment_text
        }
        body_html_title = _(
            ('Hey %(collaborator_name)s,<br>%(commentator)s has assigned you '
             'to a comment in the document \'%(document_title)s\'.')
        ) % {
            'commentator': commentator,
            'collaborator_name': collaborator_name,
            'document_title': document_title
        }
        message_title = _('Comment assignment on :') + ' ' + document_title

    body_html = _(
        ('<p>Hey %(collaborator_name)s,<br>%(commentator)s has assigned '
         'you to a comment in the document \'%(document)s\':</p>'
         '%(comment_html)s'
         '<p>Go to the document <a href="%(link)s">here</a>.</p>')
    ) % {
        'commentator': commentator,
        'collaborator_name': collaborator_name,
        'link': link,
        'document': document_title,
        'comment_html': comment_html
    }

    body_html = (
        '<h1>%(body_html_title)s</h1>'
        '<table>'
        '<tr><td>'
        '%(Document)s'
        '</td><td>'
        '<b>%(document_title)s</b>'
        '</td></tr>'
        '<tr><td>'
        '%(Author)s'
        '</td><td>'
        '%(commentator)s'
        '</td></tr>'
        '<tr><td>'
        '%(Comment)s'
        '</td><td>'
        '%(comment_html)s'
        '</td></tr>'
        '</table>'
        '<div class="actions"><a class="button" href="%(link)s">'
        '%(AccessTheDocument)s'
        '</a></div>'
    ) % {
        'body_html_title': body_html_title,
        'Document': _('Document'),
        'document_title': document_title,
        'Author': _('Author'),
        'commentator': commentator,
        'Comment': _('Comment'),
        'comment_html': comment_html,
        'link': link,
        'AccessTheDocument': _('Access the document')
    }

    send_mail(
        message_title,
        message_text,
        settings.DEFAULT_FROM_EMAIL,
        [collaborator_email],
        fail_silently=True,
        html_message=html_email(body_html)
    )
    return JsonResponse(
        response,
        status=200
    )


# maintenance views
@staff_member_required
@ajax_required
@require_POST
def get_all_old_docs(request):
    response = {}
    status = 200
    doc_list = Document.objects.filter(
        doc_version__lt=str(FW_DOCUMENT_VERSION)
    )[:10]
    response['docs'] = serializers.serialize(
        'json',
        doc_list
    )
    return JsonResponse(
        response,
        status=status
    )


@staff_member_required
@ajax_required
@require_POST
def save_doc(request):
    response = {}
    status = 200
    doc_id = request.POST['id']
    doc = Document.objects.get(pk=int(doc_id))
    # Only looking at fields that may have changed.
    contents = request.POST.get('contents', False)
    bibliography = request.POST.get('bibliography', False)
    comments = request.POST.get('comments', False)
    last_diffs = request.POST.get('last_diffs', False)
    version = request.POST.get('version', False)
    if contents:
        doc.contents = contents
    if bibliography:
        doc.bibliography = bibliography
    if comments:
        doc.comments = comments
    if version:
        doc.version = version
    if last_diffs:
        doc.last_diffs = last_diffs
    doc.doc_version = FW_DOCUMENT_VERSION
    doc.save()
    return JsonResponse(
        response,
        status=status
    )


@staff_member_required
@ajax_required
@require_POST
def get_user_biblist(request):
    response = {}
    status = 200
    user_id = request.POST['user_id']
    response['bibList'] = serializer.serialize(
        Entry.objects.filter(
            entry_owner_id=user_id
        ), fields=(
                'entry_key',
                'entry_owner',
                'bib_type',
                'fields'
        )
    )
    return JsonResponse(
        response,
        status=status
    )


@staff_member_required
@ajax_required
@require_POST
def get_all_template_ids(request):
    response = {}
    status = 200
    templates = DocumentTemplate.objects.filter(
        doc_version__lt=str(FW_DOCUMENT_VERSION)
    ).only('id')
    response["template_ids"] = []
    for template in templates:
        response["template_ids"].append(template.id)
    return JsonResponse(
        response,
        status=status
    )


@staff_member_required
@ajax_required
@require_POST
def get_template(request):
    response = {}
    status = 405
    template_id = request.POST['id']
    template = DocumentTemplate.objects.filter(pk=int(template_id)).first()
    if template:
        status = 200
        response['definition'] = template.definition
        response['title'] = template.title
        response['doc_version'] = template.doc_version
    return JsonResponse(
        response,
        status=status
    )


@staff_member_required
@ajax_required
@require_POST
def get_template_extras(request):
    id = request.POST['id']
    doc_template = DocumentTemplate.objects.filter(
        id=id
    ).first()
    status = 200
    if doc_template is None:
        return JsonResponse({}, status=405)
    serializer = PythonWithURLSerializer()
    export_templates = serializer.serialize(
        doc_template.exporttemplate_set.all()
    )
    document_styles = serializer.serialize(
        doc_template.documentstyle_set.all(),
        use_natural_foreign_keys=True,
        fields=['title', 'slug', 'contents', 'documentstylefile_set']
    )
    response = {
        'export_templates': export_templates,
        'document_styles': document_styles,
    }
    return JsonResponse(
        response,
        status=status
    )


@staff_member_required
@ajax_required
@require_POST
def save_template(request):
    response = {}
    status = 405
    template_id = request.POST['id']
    template = DocumentTemplate.objects.filter(pk=int(template_id)).first()
    if template:
        status = 200
        # Only looking at fields that may have changed.
        definition = request.POST.get('definition', False)
        if definition:
            template.definition = definition
        template.doc_version = FW_DOCUMENT_VERSION
        template.save()
    return JsonResponse(
        response,
        status=status
    )


@staff_member_required
@ajax_required
@require_POST
def get_all_revision_ids(request):
    response = {}
    status = 200
    revisions = DocumentRevision.objects.filter(
        doc_version__lt=str(FW_DOCUMENT_VERSION)
    ).only('id')
    response["revision_ids"] = []
    for revision in revisions:
        response["revision_ids"].append(revision.id)
    return JsonResponse(
        response,
        status=status
    )


@staff_member_required
@ajax_required
@require_POST
def update_revision(request):
    response = {}
    status = 405
    revision_id = request.POST['id']
    revision = DocumentRevision.objects.filter(pk=int(revision_id)).first()
    if revision:
        status = 200
        # keep the filename
        file_name = revision.file_object.name.split('/')[-1]
        # Delete the FieldFile as otherwise the file remains.
        revision.file_object.delete()
        revision.file_object = request.FILES['file']
        revision.file_object.name = file_name
        revision.doc_version = FW_DOCUMENT_VERSION
        revision.save()
    return JsonResponse(
        response,
        status=status
    )


@staff_member_required
@ajax_required
@require_POST
def add_images_to_doc(request):
    response = {}
    status = 201
    doc_id = request.POST['doc_id']
    doc = Document.objects.get(id=doc_id)
    # Delete all existing image links
    DocumentImage.objects.filter(
        document_id=doc_id
    ).delete()
    ids = request.POST.getlist('ids[]')
    for id in ids:
        doc_image_data = {
            'document': doc,
            'title': 'Deleted'
        }
        image = Image.objects.filter(id=id).first()
        if image:
            user_image = image.userimage_set.all().first()
            if user_image:
                doc_image_data['title'] = user_image.title
                doc_image_data['copyright'] = user_image.copyright
        else:
            image = Image()
            image.pk = id
            image.uploader = doc.owner
            f = open(os.path.join(
                settings.PROJECT_PATH, "base/static/img/error.png"
            ))
            image.image.save('error.png', File(f))
            image.save()
        doc_image_data['image'] = image
        DocumentImage.objects.create(**doc_image_data)
    return JsonResponse(
        response,
        status=status
    )

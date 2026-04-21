import time
import os
import bleach
import json
import base64
from copy import deepcopy

from django.contrib.contenttypes.models import ContentType

from django.core import serializers
from django.http import HttpResponse, JsonResponse, HttpRequest
from django.contrib.auth.decorators import login_required
from django.views.decorators.cache import cache_control
from django.views.decorators.http import require_POST
from django.db import transaction
from django.core.files import File
from django.utils.translation import gettext as _
from django.conf import settings
from django.db.models import F, Q
from django.contrib.admin.views.decorators import staff_member_required
from django.contrib.auth import get_user_model

from document import prosemirror
from document.models import (
    Document,
    AccessRight,
    DocumentRevision,
    DocumentTemplate,
    ShareToken,
    CAN_UPDATE_DOCUMENT,
    CAN_COMMUNICATE,
    FW_DOCUMENT_VERSION,
)
from usermedia.models import DocumentImage, Image
from bibliography.models import Entry
from document.helpers.serializers import PythonWithURLSerializer
from bibliography.views import serializer
from style.models import DocumentStyle, DocumentStyleFile, ExportTemplate
from base.decorators import ajax_required
from base.helpers.ws import get_url_base
from user.models import UserInvite
from . import emails
from user.helpers import Avatars
from document.helpers.token_access import get_token_access


@login_required
@ajax_required
@require_POST
def get_documentlist_extra(request):
    response = {}
    status = 200
    ids = request.POST["ids"].split(",")
    docs = (
        Document.objects.filter(
            Q(owner=request.user) | Q(accessright__user=request.user)
        )
        .filter(id__in=ids)
        .prefetch_related("documentimage_set")
    )
    response["documents"] = []
    for doc in docs:
        images = {}
        for image in doc.documentimage_set.all():
            images[image.image.id] = {
                "added": image.image.added,
                "checksum": image.image.checksum,
                "file_type": image.image.file_type,
                "height": image.image.height,
                "id": image.image.id,
                "image": image.image.image.url,
                "title": image.title,
                "copyright": image.copyright,
                "width": image.image.width,
            }
            if image.image.thumbnail:
                images[image.image.id]["thumbnail"] = image.image.thumbnail.url
        # Initialize document content from template if empty.
        # We only do this when content is a dict — once an
        # e2ee_snapshot is saved, the content becomes a Base64
        # string and isinstance skips it.
        if isinstance(doc.content, dict) and "type" not in doc.content:
            doc.content = deepcopy(doc.template.content)
            if "type" not in doc.content:
                doc.content["type"] = "doc"
            if "content" not in doc.content:
                doc.content["content"] = [{"type": "title"}]
            doc.save()
        response["documents"].append(
            {
                "images": images,
                "content": doc.content,
                "comments": doc.comments,
                "bibliography": doc.bibliography,
                "id": doc.id,
                "e2ee": doc.e2ee,
                "e2ee_salt": (
                    base64.b64encode(doc.e2ee_salt).decode("ascii")
                    if doc.e2ee_salt
                    else None
                ),
                "e2ee_iterations": doc.e2ee_iterations,
            }
        )
    return JsonResponse(response, status=status)


def documents_list(request):
    avatars = Avatars()
    documents = (
        Document.objects.filter(
            Q(owner=request.user) | Q(accessright__user=request.user),
            listed=True,
        )
        .defer("content", "comments", "bibliography", "doc_version", "diffs")
        .select_related("owner")
        .prefetch_related(
            "accessright_set",
            "documentrevision_set",
        )
        .distinct()
        .order_by("-updated")
    )
    output_list = []
    for document in documents:
        if document.owner == request.user:
            access_right = "write"
            path = document.path
        else:
            access_object = document.accessright_set.filter(
                user=request.user
            ).first()
            access_right = access_object.rights
            path = access_object.path
        if (
            request.user.is_staff
            or document.owner == request.user
            or document.accessright_set.filter(
                user=request.user, rights__in=CAN_COMMUNICATE
            ).first()
        ):
            revisions = document.documentrevision_set.all()
            revision_list = []
            for revision in revisions:
                revision_list.append(
                    {
                        "date": time.mktime(revision.date.utctimetuple()),
                        "note": revision.note,
                        "file_name": revision.file_name,
                        "pk": revision.pk,
                    }
                )
        else:
            revision_list = []
        added = time.mktime(document.added.utctimetuple())
        updated = time.mktime(document.updated.utctimetuple())
        is_owner = False
        if document.owner == request.user:
            is_owner = True
        # For E2EE documents, the title is stored encrypted within the
        # content field and cannot be read server-side. Show a placeholder
        # instead. The client will replace this with the decrypted title
        # after the user enters the password.
        display_title = (
            f"Encrypted Document #{document.id}"
            if document.e2ee
            else document.title
        )
        output_list.append(
            {
                "id": document.id,
                "title": display_title,
                "path": path,
                "is_owner": is_owner,
                "e2ee": document.e2ee,
                "owner": {
                    "id": document.owner.id,
                    "name": document.owner.readable_name,
                    "avatar": avatars.get_url(document.owner),
                },
                "added": added,
                "updated": updated,
                "rights": access_right,
                "revisions": revision_list,
            }
        )
    return output_list


@login_required
@ajax_required
@require_POST
def get_access_rights(request):
    response = {}
    status = 200
    avatars = Avatars()
    ar_qs = AccessRight.objects.filter(document__owner=request.user)
    doc_ids = request.POST.getlist("document_ids[]")
    if len(doc_ids) > 0:
        ar_qs = ar_qs.filter(document_id__in=doc_ids)
    access_rights = []
    for ar in ar_qs:
        if ar.holder_type.model == "user":
            avatar = avatars.get_url(ar.holder_obj)
        else:
            avatar = None
        access_rights.append(
            {
                "document_id": ar.document.id,
                "rights": ar.rights,
                "holder": {
                    "id": ar.holder_id,
                    "type": ar.holder_type.model,
                    "name": ar.holder_obj.readable_name,
                    "avatar": avatar,
                },
            }
        )
    response["access_rights"] = access_rights
    return JsonResponse(response, status=status)


@login_required
@ajax_required
@require_POST
@transaction.atomic
def save_access_rights(request):
    User = get_user_model()
    response = {}
    doc_ids = json.loads(request.POST["document_ids"])
    rights = json.loads(request.POST["access_rights"])
    for doc_id in doc_ids:
        doc = Document.objects.filter(pk=doc_id, owner=request.user).first()
        if not doc:
            continue
        from document.models import E2EE_ALLOWED_RIGHTS

        for right in rights:
            holder_type = ContentType.objects.get(
                app_label="user", model=right["holder"]["type"]
            )
            if (
                doc.e2ee
                and right["rights"] not in E2EE_ALLOWED_RIGHTS
                and right["rights"] != "delete"
            ):
                continue
            if right["rights"] == "delete":
                # Status 'delete' means the access right is marked for
                # deletion.
                AccessRight.objects.filter(
                    document_id=doc_id,
                    holder_id=right["holder"]["id"],
                    holder_type=holder_type,
                ).delete()
            else:
                owner = request.user.readable_name
                link = HttpRequest.build_absolute_uri(
                    request, doc.get_absolute_url()
                )
                access_right = AccessRight.objects.filter(
                    document_id=doc_id,
                    holder_id=right["holder"]["id"],
                    holder_type=holder_type,
                ).first()
                document_title = doc.title
                if access_right:
                    if access_right.rights != right["rights"]:
                        access_right.rights = right["rights"]
                        if right["holder"]["type"] == "user":
                            collaborator = User.objects.get(
                                id=right["holder"]["id"]
                            )
                            collaborator_name = collaborator.readable_name
                            collaborator_email = collaborator.email
                            emails.send_share_notification(
                                document_title,
                                owner,
                                link,
                                collaborator_name,
                                collaborator_email,
                                right["rights"],
                                True,
                            )
                else:
                    # Make the shared path "/filename" or ""
                    path = "/{last_path_part}".format(
                        last_path_part=doc.path.split("/").pop()
                    )
                    if len(path) == 1:
                        path = ""
                    if right["holder"]["type"] == "userinvite":
                        holder = UserInvite.objects.filter(
                            id=right["holder"]["id"]
                        ).first()
                    else:
                        holder = User.objects.filter(
                            id=right["holder"]["id"]
                        ).first()
                    if not holder:
                        continue
                    access_right = AccessRight.objects.create(
                        document_id=doc_id,
                        holder_obj=holder,
                        rights=right["rights"],
                        path=path,
                    )
                    if right["holder"]["id"] == "user":
                        collaborator_name = holder.readable_name
                        collaborator_email = holder.email
                        emails.send_share_notification(
                            document_title,
                            owner,
                            link,
                            collaborator_name,
                            collaborator_email,
                            right["rights"],
                            False,
                        )
                access_right.save()
    status = 201
    return JsonResponse(response, status=status)


@login_required
@ajax_required
@require_POST
def get_documentlist(request):
    response = {}
    status = 200
    response["documents"] = documents_list(request)
    response["contacts"] = []
    avatars = Avatars()
    for contact in request.user.contacts.all():
        contact_object = {
            "id": contact.id,
            "name": contact.readable_name,
            "username": contact.get_username(),
            "avatar": avatars.get_url(contact),
            "type": "user",
        }
        response["contacts"].append(contact_object)
    for contact in request.user.invites_by.all():
        contact_object = {
            "id": contact.id,
            "name": contact.username,
            "username": contact.username,
            "avatar": None,
            "type": "userinvite",
        }
        response["contacts"].append(contact_object)
    serializer = PythonWithURLSerializer()
    doc_styles = serializer.serialize(
        DocumentStyle.objects.filter(
            Q(document_template__user=None)
            | Q(document_template__user=request.user)
        ),
        use_natural_foreign_keys=True,
        fields=["title", "slug", "contents", "documentstylefile_set"],
    )
    response["document_styles"] = [obj["fields"] for obj in doc_styles]
    doc_templates = DocumentTemplate.objects.filter(
        Q(user=request.user) | Q(user=None)
    ).order_by(F("user").desc(nulls_first=True))
    response["document_templates"] = {}
    for obj in doc_templates:
        response["document_templates"][obj.import_id] = {
            "title": obj.title,
            "id": obj.id,
        }
    return JsonResponse(response, status=status)


@login_required
@ajax_required
@require_POST
def delete(request):
    response = {}
    status = 200
    doc_id = int(request.POST["id"])
    document = Document.objects.get(pk=doc_id, owner=request.user)
    if document.is_deletable():
        image_ids = list(
            DocumentImage.objects.filter(document_id=doc_id).values_list(
                "image_id", flat=True
            )
        )
        document.delete()
        for image in Image.objects.filter(id__in=image_ids):
            if image.is_deletable():
                image.delete()
        response["done"] = True
    else:
        response["done"] = False
    return JsonResponse(response, status=status)


@login_required
@ajax_required
@require_POST
def move(request):
    response = {}
    status = 200
    doc_id = int(request.POST["id"])
    path = request.POST["path"]
    document = Document.objects.filter(pk=doc_id).first()
    if not document:
        response["done"] = False
    elif document.owner == request.user:
        document.path = path
        document.save(
            update_fields=[
                "path",
            ]
        )
        response["done"] = True
    else:
        access_right = AccessRight.objects.filter(
            document=document, user=request.user
        ).first()
        if not access_right:
            response["done"] = False
        else:
            access_right.path = path
            access_right.save()
            response["done"] = True
    return JsonResponse(response, status=status)


@login_required
@ajax_required
@require_POST
def create_doc(request):
    response = {}
    template_id = request.POST["template_id"]
    path = request.POST["path"]
    e2ee = request.POST.get("e2ee", "") == "true"

    # Check E2EE mode
    e2ee_mode = getattr(settings, "E2EE_MODE", "disabled")
    if e2ee and e2ee_mode == "disabled":
        return JsonResponse(
            {"error": "E2EE is not enabled on this server"}, status=403
        )
    if not e2ee and e2ee_mode == "required":
        return JsonResponse(
            {"error": "Only E2EE documents are allowed on this server"},
            status=403,
        )

    document_template = DocumentTemplate.objects.filter(
        Q(user=request.user) | Q(user=None), id=template_id
    ).first()
    if not document_template:
        return JsonResponse(response, status=405)

    # For E2EE documents, the client generates a random salt and sends it
    # to the server. The salt is not a secret — it is stored in plaintext
    # alongside the encrypted content.
    e2ee_salt = None
    e2ee_iterations = 600000
    if e2ee:
        salt_b64 = request.POST.get("e2ee_salt")
        if salt_b64:
            e2ee_salt = base64.b64decode(salt_b64)
        e2ee_iterations = int(request.POST.get("e2ee_iterations", 600000))

    document = Document.objects.create(
        owner_id=request.user.pk,
        template_id=template_id,
        path=path,
        e2ee=e2ee,
        e2ee_salt=e2ee_salt,
        e2ee_iterations=e2ee_iterations,
    )
    response["id"] = document.id
    return JsonResponse(response, status=201)


@login_required
@ajax_required
@require_POST
def import_create(request):
    # First step of import: Create a document and return the id of it
    response = {}
    status = 201

    # Check E2EE mode
    e2ee = request.POST.get("e2ee", "") == "true"
    e2ee_mode = getattr(settings, "E2EE_MODE", "disabled")
    if e2ee and e2ee_mode == "disabled":
        return JsonResponse(
            {"error": "E2EE is not enabled on this server"}, status=403
        )
    if not e2ee and e2ee_mode == "required":
        return JsonResponse(
            {"error": "Only E2EE documents are allowed on this server"},
            status=403,
        )

    import_id = request.POST["import_id"]
    document_template = (
        DocumentTemplate.objects.filter(
            Q(user=request.user) | Q(user=None), import_id=import_id
        )
        .order_by(F("user").desc(nulls_last=True))
        .first()
    )
    if not document_template:
        # The user doesn't have this template.
        # We check whether the template exists with one of the documents
        # shared with the user. If so, we'll copy it so that we can avoid
        # having to create an entirely new template without styles or
        # exporter templates
        access_right = AccessRight.objects.filter(
            user=request.user, document__template__import_id=import_id
        ).first()
        if access_right:
            document_template = access_right.document.template
            document_styles = list(document_template.documentstyle_set.all())
            export_templates = list(document_template.exporttemplate_set.all())
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
        template_title = request.POST["template_title"]
        counter = 0
        base_template_title = template_title
        while DocumentTemplate.objects.filter(
            Q(title=template_title), Q(user=request.user) | Q(user=None)
        ).first():
            counter += 1
            template_title = f"{base_template_title} {counter}"
        content = json.loads(request.POST["template"])
        document_template = DocumentTemplate()
        document_template.title = template_title
        document_template.import_id = import_id
        document_template.user = request.user
        document_template.content = content
        document_template.save()
        files = request.FILES.getlist("files[]")
        document_styles = json.loads(request.POST.get("document_styles"))
        export_templates = json.loads(request.POST.get("export_templates"))
        for style in document_styles:
            doc_style = DocumentStyle.objects.create(
                title=style["title"],
                slug=style["slug"],
                contents=style["contents"],
                document_template=document_template,
            )
            for filepath in style["files"]:
                filename = filepath.split("/").pop()
                file = next((x for x in files if x.name == filename), None)
                if file:
                    DocumentStyleFile.objects.create(
                        file=file, style=doc_style
                    )
        for e_template in export_templates:
            filename = e_template["file"].split("/").pop()
            file = next((x for x in files if x.name == filename), None)
            if file:
                ExportTemplate.objects.create(
                    document_template=document_template,
                    template_file=file,
                    file_type=e_template["file_type"],
                )
    path = request.POST["path"]
    if len(path):
        counter = 0
        base_path = path
        while (
            Document.objects.filter(owner=request.user, path=path).first()
            or AccessRight.objects.filter(user=request.user, path=path).first()
        ):
            counter += 1
            path = f"{base_path} {counter}"

    e2ee_salt = None
    e2ee_iterations = 600000
    if e2ee:
        salt_b64 = request.POST.get("e2ee_salt")
        if salt_b64:
            e2ee_salt = base64.b64decode(salt_b64)
        e2ee_iterations = int(request.POST.get("e2ee_iterations", 600000))

    document = Document.objects.create(
        owner=request.user,
        template=document_template,
        path=path,
        e2ee=e2ee,
        e2ee_salt=e2ee_salt,
        e2ee_iterations=e2ee_iterations,
    )
    response["id"] = document.id
    response["path"] = document.path
    response["e2ee"] = document.e2ee
    return JsonResponse(response, status=status)


@login_required
@ajax_required
@require_POST
def import_image(request):
    # create an image for a document
    response = {}
    document = Document.objects.filter(
        owner_id=request.user.pk, id=int(request.POST["doc_id"])
    ).first()
    if document:
        status = 201
    else:
        status = 401
        return JsonResponse(response, status=status)
    checksum = int(request.POST.get("checksum", 0))
    if checksum > 0:
        image = Image.objects.filter(checksum=checksum).first()
    else:
        image = None
    if image is None:
        if document.e2ee:
            # For E2EE documents, the image is already encrypted client-side.
            # Store as-is and skip thumbnail generation.
            image = Image(
                uploader=request.user,
                image=request.FILES["image"],
                checksum=checksum,
                file_type="application/octet-stream",
            )
        else:
            image = Image(
                uploader=request.user,
                image=request.FILES["image"],
                checksum=checksum,
            )
        image.save()
    doc_image = DocumentImage.objects.create(
        image=image,
        title=request.POST["title"],
        copyright=json.loads(request.POST["copyright"]),
        document=document,
    )
    response["id"] = doc_image.image.id
    return JsonResponse(response, status=status)


@login_required
@ajax_required
@require_POST
def import_doc(request):
    response = {}
    doc_id = request.POST["id"]
    # There is a doc_id, so we overwrite an existing doc rather than
    # creating a new one.
    document = Document.objects.get(id=int(doc_id))
    if (
        document.owner != request.user
        and not AccessRight.objects.filter(
            document_id=doc_id,
            user=request.user,
            rights__in=CAN_UPDATE_DOCUMENT,
        ).first()
    ):
        response["error"] = "No access to file"
        status = 403
        return JsonResponse(response, status=status)
    document.title = request.POST["title"]
    if document.e2ee:
        # For E2EE documents, content/comments/bibliography are
        # encrypted strings (opaque Base64 ciphertext). Store as-is
        # and record that a snapshot exists at version 0.
        document.content = request.POST["content"]
        document.comments = request.POST["comments"]
        document.bibliography = request.POST["bibliography"]
        document.e2ee_snapshot_version = 0
    else:
        document.content = json.loads(request.POST["content"])
        document.comments = json.loads(request.POST["comments"])
        document.bibliography = json.loads(request.POST["bibliography"])
    # document.doc_version should always be the current version, so don't
    # bother about it.
    document.save()
    response["document_id"] = document.id
    response["added"] = time.mktime(document.added.utctimetuple())
    response["updated"] = time.mktime(document.updated.utctimetuple())
    status = 200
    return JsonResponse(response, status=status)


@login_required
@ajax_required
@require_POST
def upload_revision(request):
    response = {}
    status = 405
    can_save = False
    document_id = request.POST["document_id"]
    document = Document.objects.filter(id=int(document_id)).first()
    if document:
        if document.owner == request.user:
            can_save = True
        else:
            access_rights = AccessRight.objects.filter(
                document=document, user=request.user
            )
            if len(access_rights) > 0 and access_rights[0].rights == "write":
                can_save = True
    if can_save:
        status = 201
        revision = DocumentRevision()
        revision.file_object = request.FILES["file"]
        revision.file_name = request.FILES["file"].name
        revision.note = request.POST["note"]
        revision.document_id = document_id
        revision.save()
    return JsonResponse(response, status=status)


# Download a revision that was previously uploaded
@login_required
def get_revision(request, revision_id):
    revision = DocumentRevision.objects.filter(pk=int(revision_id)).first()
    if revision and (
        request.user.is_staff
        or revision.document.owner == request.user
        or AccessRight.objects.filter(
            document=revision.document,
            user=request.user,
            rights__in=CAN_COMMUNICATE,
        ).first()
    ):
        http_response = HttpResponse(
            revision.file_object.file,
            content_type="application/zip; charset=x-user-defined",
            status=200,
        )
        http_response["Content-Disposition"] = (
            "attachment; filename=some_name.zip"
        )
    else:
        http_response = HttpResponse(status=404)
    return http_response


@login_required
@ajax_required
@require_POST
def delete_revision(request):
    response = {}
    status = 405
    revision_id = request.POST["id"]
    revision = DocumentRevision.objects.filter(pk=int(revision_id)).first()
    if revision:
        document = revision.document
        if document.owner == request.user:
            status = 200
            revision.delete()
    return JsonResponse(response, status=status)


# Check doc access rights.
def has_doc_access(doc, user):
    if doc.owner == user:
        return True
    access_rights = AccessRight.objects.filter(document=doc, user=user).first()
    if access_rights:
        return True
    else:
        return False


@login_required
@ajax_required
@require_POST
def comment_notify(request):
    response = {}
    doc_id = request.POST["doc_id"]
    collaborator_id = request.POST["collaborator_id"]
    comment_text = request.POST["comment_text"]
    comment_html = bleach.clean(request.POST["comment_html"], strip=True)
    notification_type = request.POST["type"]
    User = get_user_model()
    collaborator = User.objects.filter(pk=collaborator_id).first()
    document = Document.objects.filter(pk=doc_id).first()
    if (
        not document
        or not collaborator
        or not comment_text
        or not comment_html
        or not has_doc_access(document, request.user)
        or not notification_type
    ):
        return JsonResponse(response, status=403)
    if not has_doc_access(document, collaborator):
        # Tagged user has no access to document and will therefore not be
        # notified
        return JsonResponse(response, status=200)
    commentator = request.user.readable_name
    collaborator_name = collaborator.readable_name
    collaborator_email = collaborator.email
    document_title = document.title
    if len(document_title) == 0:
        document_title = _("Untitled")
    link = HttpRequest.build_absolute_uri(request, document.get_absolute_url())
    emails.send_comment_notification(
        notification_type,
        commentator,
        collaborator_name,
        collaborator_email,
        link,
        document_title,
        comment_text,
        comment_html,
    )
    return JsonResponse(response, status=200)


@ajax_required
@require_POST
def get_template_for_doc(request):
    doc_id = request.POST.get("id")
    if request.user.is_authenticated:
        doc = (
            Document.objects.filter(id=doc_id)
            .filter(Q(owner=request.user) | Q(accessright__user=request.user))
            .select_related("template")
            .prefetch_related(
                "template__exporttemplate_set",
                "template__documentstyle_set",
                "template__documentstyle_set__documentstylefile_set",
            )
            .first()
        )
    else:
        token_str = request.POST.get("token", "")
        token_doc, _rights = get_token_access(token_str)
        if token_doc and str(token_doc.id) == str(doc_id):
            doc = (
                Document.objects.filter(id=doc_id)
                .select_related("template")
                .prefetch_related(
                    "template__exporttemplate_set",
                    "template__documentstyle_set",
                    "template__documentstyle_set__documentstylefile_set",
                )
                .first()
            )
        else:
            doc = None
    if doc is None:
        return JsonResponse({}, status=401)
    doc_template = doc.template
    serializer = PythonWithURLSerializer()
    export_templates = serializer.serialize(
        doc_template.exporttemplate_set.all()
    )
    document_styles = serializer.serialize(
        doc_template.documentstyle_set.all(),
        use_natural_foreign_keys=True,
        fields=["title", "slug", "contents", "documentstylefile_set"],
    )
    response = {
        "id": doc_template.id,
        "title": doc_template.title,
        "content": doc_template.content,
        "doc_version": doc_template.doc_version,
        "export_templates": export_templates,
        "document_styles": document_styles,
    }
    return JsonResponse(response, status=200)


@login_required
@ajax_required
@require_POST
def get_template(request):
    response = {}
    import_id = request.POST["import_id"]
    doc_template = DocumentTemplate.objects.filter(
        Q(user=request.user) | Q(user=None), import_id=import_id
    ).first()
    if not doc_template:
        return JsonResponse(response, status=405)
    response["template"] = {
        "id": doc_template.id,
        "title": doc_template.title,
        "content": doc_template.content,
    }
    return JsonResponse(response, status=201)


@login_required
@ajax_required
@require_POST
def get_ws_base(request):
    response = {}
    doc_id = int(request.POST.get("id"))
    if len(settings.PORTS) < 2:
        ws_url_base = "/ws"
    else:
        conn = settings.PORTS[doc_id % len(settings.PORTS)]
        ws_url_base = get_url_base(request.headers["Origin"], conn)
    response["ws_base"] = ws_url_base
    return JsonResponse(response, status=200)


@ajax_required
@require_POST
@cache_control(max_age=3600)
def get_doc_styles(request):
    """Return styles data for a document (export templates, document styles,
    document templates). This was previously sent via WebSocket on subscribe.
    """
    doc_id = request.POST.get("id")
    token_str = request.POST.get("token", "")

    # Resolve the document and access rights
    if request.user.is_authenticated:
        doc = (
            Document.objects.filter(id=doc_id)
            .filter(Q(owner=request.user) | Q(accessright__user=request.user))
            .select_related("template")
            .first()
        )
        # is_owner = doc and doc.owner_id == request.user.id
        if not doc:
            # Check token access for authenticated users
            token_doc, rights = get_token_access(token_str)
            if token_doc and str(token_doc.id) == str(doc_id):
                doc = token_doc
            else:
                return JsonResponse({}, status=401)
    else:
        # Unauthenticated user — must use token
        token_doc, rights = get_token_access(token_str)
        if token_doc and str(token_doc.id) == str(doc_id):
            doc = token_doc
        else:
            return JsonResponse({}, status=401)

    doc_template = doc.template
    serializer = PythonWithURLSerializer()

    export_templates = serializer.serialize(
        doc_template.exporttemplate_set.all(),
        fields=["file_type", "template_file", "title"],
    )
    document_styles = serializer.serialize(
        doc_template.documentstyle_set.all(),
        use_natural_foreign_keys=True,
        fields=["title", "slug", "contents", "documentstylefile_set"],
    )

    # Document templates (for "copy with template" menu)
    # Skip for unauthenticated/guest users — they cannot create copies
    document_templates = {}
    if request.user.is_authenticated:
        query = DocumentTemplate.objects.filter(
            Q(user=request.user) | Q(user=None)
        ).order_by(F("user").desc(nulls_first=True))
        for obj in query:
            document_templates[obj.import_id] = {
                "title": obj.title,
                "id": obj.id,
            }

    response = {
        "export_templates": [obj["fields"] for obj in export_templates],
        "document_styles": [obj["fields"] for obj in document_styles],
        "document_templates": document_templates,
    }
    return JsonResponse(response, status=200)


@ajax_required
@require_POST
def get_doc_data(request):
    """Return document data for the editor. This was previously sent via
    WebSocket as the 'doc_data' message. The client will reconcile any
    version drift via the WebSocket after connecting."""
    doc_id = request.POST.get("id")
    token_str = request.POST.get("token", "")
    v_str = request.POST.get("v")

    # Resolve document and access rights (same logic as get_doc_styles)
    doc = None
    access_rights = "read"
    is_owner = False
    path = ""
    # user_id is used for comment filtering (review/review-tracked rights).
    # For authenticated users it's their numeric ID. For guest users
    # accessing via a share token, it's the token UUID string (matching
    # how the WebSocket consumer identifies GuestUser).
    user_id = None

    if request.user.is_authenticated:
        user_id = request.user.id
        doc = (
            Document.objects.filter(id=doc_id)
            .filter(Q(owner=request.user) | Q(accessright__user=request.user))
            .select_related("owner", "template")
            .first()
        )
        if doc:
            if doc.owner_id == request.user.id:
                is_owner = True
                access_rights = "write"
                path = doc.path
            else:
                ar = AccessRight.objects.filter(
                    document_id=doc.id, user=request.user
                ).first()
                if ar:
                    access_rights = ar.rights
                    path = ar.path
        if not doc and token_str:
            token_doc, rights = get_token_access(token_str)
            if token_doc and str(token_doc.id) == str(doc_id):
                doc = token_doc
                access_rights = rights
                is_owner = False
                path = ""
    else:
        if token_str:
            token_doc, rights = get_token_access(token_str)
            if token_doc and str(token_doc.id) == str(doc_id):
                doc = token_doc
                access_rights = rights
                is_owner = False
                path = ""
                user_id = (
                    token_str  # Guest users are identified by their token
                )

    if not doc:
        return JsonResponse({}, status=401)

    doc_owner = doc.owner
    avatars = Avatars()
    owner_avatar = avatars.get_url(doc_owner)

    # Build doc_info
    doc_info = {
        "id": doc.id,
        "is_owner": is_owner,
        "access_rights": access_rights,
        "path": path,
        "owner": {
            "id": doc_owner.id,
            "name": doc_owner.readable_name,
            "username": doc_owner.username,
            "avatar": owner_avatar,
            "contacts": [],
        },
        "accessed_via_token": bool(token_str),
    }

    if doc.e2ee:
        doc_info["e2ee"] = True
        doc_info["e2ee_salt"] = (
            base64.b64encode(doc.e2ee_salt).decode("ascii")
            if doc.e2ee_salt
            else None
        )
        doc_info["e2ee_iterations"] = doc.e2ee_iterations
    else:
        doc_info["e2ee"] = False

    # Initialize document content from template if empty (same logic as
    # WebSocket consumer's subscribe handler). We only do this when
    # content is a dict — once an e2ee_snapshot is saved, the content
    # becomes a Base64 string and isinstance skips it.
    if isinstance(doc.content, dict) and "type" not in doc.content:
        doc.content = deepcopy(doc.template.content)
        if "type" not in doc.content:
            doc.content["type"] = "doc"
        if "content" not in doc.content:
            doc.content["content"] = [{"type": "title"}]
        doc.save()

    # Build doc data
    if doc.e2ee:
        # For E2EE documents, the client should reconstruct from the last
        # encrypted snapshot, then catch up via WebSocket diffs. Return
        # e2ee_snapshot_version as "v" so the client subscribes at the right
        # version and the server sends the covering diffs automatically.
        doc_v = (
            doc.e2ee_snapshot_version
            if doc.e2ee_snapshot_version is not None
            else 0
        )
        doc_data = {
            "v": doc_v,
            "content": doc.content,
            "bibliography": doc.bibliography,
            "images": {},
        }
    else:
        doc_data = {
            "v": doc.version,
            "content": prosemirror.to_mini_json(
                prosemirror.from_json(doc.content)
            ),
            "bibliography": doc.bibliography,
            "images": {},
        }

    # Include template for write-access users.
    #
    # The consumer currently sends the template only for the first
    # write-access user in a new session (when no other participants are
    # present). The REST view cannot know whether a WebSocket session
    # already exists, so we always include the template for write-access
    # users. This is safe because:
    #
    # - If this is the first user, the template is needed for the
    #   adjust-doc-to-template logic in loadDocument().
    # - If the document has already been initialized, loadDocument() will
    #   find no differences between the document and template, so the
    #   adjustment is a no-op.
    # - The template content is static (set by admins) and does not change
    #   during editing, so the DB value is always current.
    # For E2EE documents, the template is still needed — the client
    # decrypts the content first, then template adjustment works normally.
    if access_rights == "write":
        doc_data["template"] = {
            "id": doc.template.id,
            "content": doc.template.content,
        }

    # Get document images
    for dimage in (
        DocumentImage.objects.filter(document_id=doc.id)
        .select_related("image")
        .only(
            "id",
            "title",
            "copyright",
            "image__id",
            "image__image",
            "image__file_type",
            "image__added",
            "image__checksum",
            "image__thumbnail",
            "image__height",
            "image__width",
        )
    ):
        image = dimage.image
        field_obj = {
            "id": image.id,
            "title": dimage.title,
            "copyright": dimage.copyright,
            "image": image.image.url,
            "file_type": image.file_type,
            "added": int(image.added.timestamp()) * 1000,
            "checksum": image.checksum,
            "cats": [],
        }
        if image.thumbnail:
            field_obj["thumbnail"] = image.thumbnail.url
            field_obj["height"] = image.height
            field_obj["width"] = image.width
        doc_data["images"][image.id] = field_obj

    # Filter comments based on access rights
    if doc.e2ee:
        # For E2EE documents, comments are encrypted - send as-is
        doc_data["comments"] = doc.comments
    elif access_rights == "read-without-comments":
        doc_data["comments"] = []
    elif access_rights in ["review", "review-tracked"]:
        filtered_comments = {}
        for key, value in doc.comments.items():
            if value["user"] == user_id:
                filtered_comments[key] = value
        doc_data["comments"] = filtered_comments
    else:
        doc_data["comments"] = doc.comments

    # Get owner contacts
    for contact in doc_owner.contacts.all().only(
        "id", "username", "first_name", "last_name"
    ):
        contact_object = {
            "id": contact.id,
            "name": contact.readable_name,
            "username": contact.get_username(),
            "avatar": avatars.get_url(contact),
            "type": "user",
        }
        doc_info["owner"]["contacts"].append(contact_object)

    # Get invites (only for owner)
    if is_owner:
        for invite in doc_owner.invites_by.all():
            contact_object = {
                "id": invite.id,
                "name": invite.username,
                "username": invite.username,
                "avatar": None,
                "type": "userinvite",
            }
            doc_info["owner"]["contacts"].append(contact_object)

    response = {
        "doc_info": doc_info,
        "doc": doc_data,
        "time": int(time.time()) * 1000,
    }
    # If the client sent its current version and the DB is ahead, include the
    # covering diffs so adjustDocument can do a precise merge instead of
    # falling back to recreateTransform.
    if v_str is not None:
        try:
            client_version = int(v_str)
            if doc.version > client_version:
                diffs_needed = doc.version - client_version
                if client_version + len(doc.diffs) >= doc.version:
                    response["m"] = doc.diffs[-diffs_needed:]
        except (ValueError, TypeError):
            pass
    return JsonResponse(response, status=200)


@login_required
@ajax_required
@require_POST
def create_share_token(request):
    response = {}
    document_id = int(request.POST.get("document_id"))
    rights = request.POST.get("rights")
    expires_at = request.POST.get("expires_at") or None
    note = request.POST.get("note", "")

    # Check if user owns the document
    document = Document.objects.filter(
        id=document_id, owner=request.user
    ).first()
    if not document:
        return JsonResponse(
            {"error": "Document not found or access denied"}, status=403
        )

    share_token = ShareToken.objects.create(
        document_id=document_id,
        rights=rights,
        expires_at=expires_at,
        note=note,
        created_by=request.user,
    )
    share_url = request.build_absolute_uri(f"/share/{share_token.token}/")
    response["token"] = str(share_token.token)
    response["share_url"] = share_url
    response["rights"] = share_token.rights
    response["expires_at"] = share_token.expires_at
    response["note"] = share_token.note
    return JsonResponse(response, status=201)


@login_required
@ajax_required
@require_POST
def list_share_tokens(request):
    response = {}
    document_id = int(request.POST.get("document_id"))

    # Check if user owns the document
    document = Document.objects.filter(
        id=document_id, owner=request.user
    ).first()
    if not document:
        return JsonResponse(
            {"error": "Document not found or access denied"}, status=403
        )

    tokens = ShareToken.objects.filter(
        document_id=document_id,
        is_active=True,
    )
    response["tokens"] = [
        {
            "id": token.id,
            "token": str(token.token),
            "rights": token.rights,
            "expires_at": token.expires_at,
            "note": token.note,
            "created_at": token.created_at,
            "share_url": request.build_absolute_uri(f"/share/{token.token}/"),
        }
        for token in tokens
    ]
    return JsonResponse(response, status=200)


@login_required
@ajax_required
@require_POST
def revoke_share_token(request):
    response = {}
    token_id = int(request.POST.get("token_id"))
    token = ShareToken.objects.filter(
        id=token_id,
        document__owner=request.user,
    ).first()
    if token:
        token.is_active = False
        token.save()
        response["success"] = True
    else:
        response["success"] = False
    return JsonResponse(response, status=200)


def validate_share_token(request, token):
    """Public endpoint to validate a share token without authentication."""
    response = {}
    document, rights = get_token_access(token)
    if document:
        response["document_id"] = document.id
        response["rights"] = rights
        response["title"] = document.title
        # Include the WebSocket base so guests don't need a second
        # authenticated request to get_ws_base.
        if len(settings.PORTS) < 2:
            ws_base = "/ws"
        else:
            from base.helpers.ws import get_url_base

            conn = settings.PORTS[document.id % len(settings.PORTS)]
            ws_base = get_url_base(request.headers.get("Origin", ""), conn)
        response["ws_base"] = ws_base
        status = 200
    else:
        status = 404
    return JsonResponse(response, status=status)


@login_required
@ajax_required
@require_POST
def request_access(request):
    """
    Allow a logged-in user to request access to a document.
    This is called when a user accesses a document via a share link and
    wants to be added as a collaborator.
    """

    response = {}
    document_id = int(request.POST.get("document_id"))
    requested_rights = request.POST.get("rights", "read")

    # Only allow upgrade requests (only 'write' makes sense as upgrade from read/comment)
    valid_rights = ["write", "write-tracked", "comment", "review", "read"]
    if requested_rights not in valid_rights:
        return JsonResponse({"error": "Invalid access rights"}, status=400)

    document = (
        Document.objects.select_related("owner").filter(id=document_id).first()
    )
    if not document:
        return JsonResponse({"error": "Document not found"}, status=404)

    # Check if user already has access
    user_access = AccessRight.objects.filter(
        document=document, user=request.user
    ).first()

    if user_access:
        # User already has access, no need to request
        return JsonResponse(
            {"success": True, "message": "You already have access"}
        )

    # Check if user is the owner
    if document.owner == request.user:
        return JsonResponse({"error": "You are the owner of this document"})

    # Send notification to the document owner
    owner = document.owner
    link = request.build_absolute_uri(document.get_absolute_url())

    emails.send_access_request_notification(
        document_title=document.title,
        requester_name=request.user.readable_name,
        requester_email=request.user.email,
        owner_name=owner.readable_name,
        owner_email=owner.email,
        link=link,
        requested_rights=requested_rights,
    )

    response["success"] = True
    return JsonResponse(response, status=201)


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
    response["docs"] = serializers.serialize("json", doc_list)
    return JsonResponse(response, status=status)


@staff_member_required
@ajax_required
@require_POST
def save_doc(request):
    response = {}
    status = 200
    doc_id = request.POST["id"]
    doc = Document.objects.get(pk=int(doc_id))
    # Only looking at fields that may have changed.
    content = request.POST.get("content", False)
    bibliography = request.POST.get("bibliography", False)
    comments = request.POST.get("comments", False)
    diffs = request.POST.get("diffs", False)
    version = request.POST.get("version", False)
    if content:
        doc.content = json.loads(content)
    if bibliography:
        doc.bibliography = json.loads(bibliography)
    if comments:
        doc.comments = json.loads(comments)
    if version:
        doc.version = version
    if diffs:
        doc.diffs = json.loads(diffs)
    doc.doc_version = FW_DOCUMENT_VERSION
    doc.save()
    return JsonResponse(response, status=status)


@staff_member_required
@ajax_required
@require_POST
def get_user_biblist(request):
    response = {}
    status = 200
    user_id = request.POST["user_id"]
    response["bibList"] = serializer.serialize(
        Entry.objects.filter(entry_owner_id=user_id),
        fields=("entry_key", "entry_owner", "bib_type", "fields"),
    )
    return JsonResponse(response, status=status)


@staff_member_required
@ajax_required
@require_POST
def get_all_template_ids(request):
    response = {}
    status = 200
    templates = DocumentTemplate.objects.filter(
        doc_version__lt=str(FW_DOCUMENT_VERSION)
    ).only("id")
    response["template_ids"] = []
    for template in templates:
        response["template_ids"].append(template.id)
    return JsonResponse(response, status=status)


@staff_member_required
@ajax_required
@require_POST
def get_template_admin(request, type="all"):
    template_id = request.POST.get("id")
    doc_template = DocumentTemplate.objects.filter(pk=int(template_id)).first()
    if doc_template is None:
        return JsonResponse({}, status=405)
    response = {}
    if type in ["all", "base"]:
        response["id"] = doc_template.id
        response["title"] = doc_template.title
        response["content"] = doc_template.content
        response["doc_version"] = doc_template.doc_version
    if type in ["all", "extras"]:
        serializer = PythonWithURLSerializer()
        export_templates = serializer.serialize(
            doc_template.exporttemplate_set.all()
        )
        document_styles = serializer.serialize(
            doc_template.documentstyle_set.all(),
            use_natural_foreign_keys=True,
            fields=["title", "slug", "contents", "documentstylefile_set"],
        )
        response["export_templates"] = export_templates
        response["document_styles"] = document_styles
    return JsonResponse(response, status=200)


@staff_member_required
@ajax_required
@require_POST
def save_template(request):
    response = {}
    status = 405
    template_id = request.POST["id"]
    template = DocumentTemplate.objects.filter(pk=int(template_id)).first()
    if template:
        status = 200
        # Only looking at fields that may have changed.
        content = request.POST.get("content", False)
        if content:
            template.content = json.loads(content)
        template.doc_version = FW_DOCUMENT_VERSION
        template.save()
    return JsonResponse(response, status=status)


@staff_member_required
@ajax_required
@require_POST
def create_template_admin(request):
    response = {}
    title = request.POST.get("title")
    content = json.loads(request.POST.get("content"))
    import_id = request.POST.get("import_id")
    document_styles = json.loads(request.POST.get("document_styles"))
    export_templates = json.loads(request.POST.get("export_templates"))
    template = DocumentTemplate.objects.create(
        title=title,
        content=content,
        doc_version=FW_DOCUMENT_VERSION,
        import_id=import_id,
    )
    response["id"] = template.id
    response["title"] = template.title
    date_format = "%Y-%m-%d"
    response["added"] = template.added.strftime(date_format)
    response["updated"] = template.updated.strftime(date_format)
    files = request.FILES.getlist("files[]")
    for style in document_styles:
        doc_style = DocumentStyle.objects.create(
            title=style["title"],
            slug=style["slug"],
            contents=style["contents"],
            document_template=template,
        )
        for filepath in style["files"]:
            filename = filepath.split("/").pop()
            file = next((x for x in files if x.name == filename), None)
            if file:
                DocumentStyleFile.objects.create(file=file, style=doc_style)
    for e_template in export_templates:
        filename = e_template["file"].split("/").pop()
        file = next((x for x in files if x.name == filename), None)
        if file:
            ExportTemplate.objects.create(
                document_template=template,
                template_file=file,
                file_type=e_template["file_type"],
            )
    return JsonResponse(response, status=201)


@staff_member_required
@ajax_required
@require_POST
def get_all_revision_ids(request):
    response = {}
    status = 200
    revisions = DocumentRevision.objects.filter(
        doc_version__lt=str(FW_DOCUMENT_VERSION)
    ).only("id")
    response["revision_ids"] = []
    for revision in revisions:
        response["revision_ids"].append(revision.id)
    return JsonResponse(response, status=status)


@staff_member_required
@ajax_required
@require_POST
def update_revision(request):
    response = {}
    status = 405
    revision_id = request.POST["id"]
    revision = DocumentRevision.objects.filter(pk=int(revision_id)).first()
    if revision:
        status = 200
        # keep the filename
        file_name = revision.file_object.name.split("/")[-1]
        # Delete the FieldFile as otherwise the file remains.
        revision.file_object.delete()
        revision.file_object = request.FILES["file"]
        revision.file_object.name = file_name
        revision.doc_version = FW_DOCUMENT_VERSION
        revision.save()
    return JsonResponse(response, status=status)


@staff_member_required
@ajax_required
@require_POST
def add_images_to_doc(request):
    response = {}
    status = 201
    doc_id = request.POST["doc_id"]
    doc = Document.objects.get(id=doc_id)
    # Delete all existing image links
    DocumentImage.objects.filter(document_id=doc_id).delete()
    ids = request.POST.getlist("ids[]")
    for id in ids:
        doc_image_data = {"document": doc, "title": "Deleted"}
        image = Image.objects.filter(id=id).first()
        if image:
            user_image = image.userimage_set.all().first()
            if user_image:
                doc_image_data["title"] = user_image.title
                doc_image_data["copyright"] = user_image.copyright
        else:
            image = Image()
            image.pk = id
            image.uploader = doc.owner
            f = open(
                os.path.join(
                    settings.PROJECT_PATH, "base/static/img/error.avif"
                )
            )
            image.image.save("error.avif", File(f))
            image.save()
        doc_image_data["image"] = image
        DocumentImage.objects.create(**doc_image_data)
    return JsonResponse(response, status=status)

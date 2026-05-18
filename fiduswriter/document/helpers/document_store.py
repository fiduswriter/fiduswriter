import logging
from copy import deepcopy

from asgiref.sync import sync_to_async
from django.db.utils import DatabaseError, IntegrityError

from document import prosemirror
from usermedia.models import Image, DocumentImage, UserImage

logger = logging.getLogger(__name__)


async def initialize_document_content(doc):
    """Initialize document content from template if empty.

    We only do this when content is a dict — once an e2ee snapshot is saved,
    the content becomes a Base64 string and isinstance skips it.

    Returns True if the document was modified and saved.
    """
    if isinstance(doc.content, dict) and "type" not in doc.content:
        doc.content = deepcopy(doc.template.content)
        if "type" not in doc.content:
            doc.content["type"] = "doc"
        if "content" not in doc.content:
            doc.content["content"] = [{"type": "title"}]
        await doc.asave()
        return True
    return False


async def save_document_title(doc, title):
    """Persist a new document title immediately.

    This is used when the title changes via a diff so the overview page
    always sees the correct value, even before the full periodic save.
    """
    doc.title = title[-255:]
    await doc.asave(update_fields=["title"])


async def save_document_async(
    doc, node=None, force=False, last_saved_version=None
):
    """Save a document to the database asynchronously.

    If *node* is provided and the document is not E2EE, the ProseMirror node
    is serialized to JSON and stored in ``doc.content``.

    Returns ``True`` if the document was actually saved, ``False`` if it was
    skipped because the version already matches *last_saved_version* and
    *force* is not set.
    """
    if (
        not force
        and last_saved_version is not None
        and doc.version == last_saved_version
    ):
        return False

    logger.debug(
        f"Action:Saving document to DB. DocumentID:{doc.id} "
        f"Doc version:{doc.version}"
    )

    if node is not None and not doc.e2ee:
        doc.content = prosemirror.to_mini_json(node)

    update_fields = [
        "title",
        "version",
        "content",
        "diffs",
        "comments",
        "bibliography",
        "updated",
    ]
    # Include E2EE fields when saving an encrypted document
    # (e.g., after a password change updates the salt/iterations)
    if doc.e2ee:
        update_fields.extend(
            [
                "e2ee",
                "e2ee_salt",
                "e2ee_iterations",
                "e2ee_snapshot_version",
            ]
        )
    try:
        # this try block is to avoid a db exception
        # in case the doc has been deleted from the db
        # in fiduswriter the owner of a doc could delete a doc
        # while an invited writer is editing the same doc
        await doc.asave(update_fields=update_fields)
    except DatabaseError as e:
        expected_msg = "Save with update_fields did not affect any rows."
        if str(e) == expected_msg:
            try:
                await doc.asave()
            except IntegrityError:
                pass
        else:
            raise e
    return True


def save_document(doc, node=None, force=False, last_saved_version=None):
    """Synchronous variant of :func:`save_document_async`.

    Returns ``True`` if the document was actually saved, ``False`` if it was
    skipped.
    """
    if (
        not force
        and last_saved_version is not None
        and doc.version == last_saved_version
    ):
        return False

    logger.debug(
        f"Action:Saving document to DB. DocumentID:{doc.id} "
        f"Doc version:{doc.version}"
    )

    if node is not None and not doc.e2ee:
        doc.content = prosemirror.to_mini_json(node)

    update_fields = [
        "title",
        "version",
        "content",
        "diffs",
        "comments",
        "bibliography",
        "updated",
    ]
    if doc.e2ee:
        update_fields.extend(
            [
                "e2ee",
                "e2ee_salt",
                "e2ee_iterations",
                "e2ee_snapshot_version",
            ]
        )
    try:
        doc.save(update_fields=update_fields)
    except DatabaseError as e:
        expected_msg = "Save with update_fields did not affect any rows."
        if str(e) == expected_msg:
            try:
                doc.save()
            except IntegrityError:
                pass
        else:
            raise e
    return True


async def update_document_images(doc_id, image_updates, user, doc_e2ee=False):
    """Process image updates (create/update/delete DocumentImage records).

    For E2EE documents this is a no-op because image metadata is inside
    encrypted diffs and handled client-side.
    """
    if doc_e2ee:
        return

    for iu in image_updates:
        if "id" not in iu:
            continue
        image_id = iu["id"]
        if iu["type"] == "update":
            # Ensure that access rights exist
            has_access = await UserImage.objects.filter(
                image__id=image_id, owner=user
            ).aexists()

            if not has_access:
                continue

            doc_image = await DocumentImage.objects.filter(
                document_id=doc_id, image_id=image_id
            ).afirst()

            if doc_image:
                doc_image.title = iu["image"]["title"]
                doc_image.copyright = iu["image"]["copyright"]
                await doc_image.asave()
            else:
                await DocumentImage.objects.acreate(
                    document_id=doc_id,
                    image_id=image_id,
                    title=iu["image"]["title"],
                    copyright=iu["image"]["copyright"],
                )
        elif iu["type"] == "delete":
            await DocumentImage.objects.filter(
                document_id=doc_id, image_id=image_id
            ).adelete()

            async for image in Image.objects.filter(id=image_id).aiterator():
                can_delete = await sync_to_async(image.is_deletable)()
                if can_delete:
                    await image.adelete()


def update_document_images_sync(doc_id, image_updates, user, doc_e2ee=False):
    """Synchronous variant of :func:`update_document_images`."""
    if doc_e2ee:
        return

    for iu in image_updates:
        if "id" not in iu:
            continue
        image_id = iu["id"]
        if iu["type"] == "update":
            has_access = UserImage.objects.filter(
                image__id=image_id, owner=user
            ).exists()

            if not has_access:
                continue

            doc_image = DocumentImage.objects.filter(
                document_id=doc_id, image_id=image_id
            ).first()

            if doc_image:
                doc_image.title = iu["image"]["title"]
                doc_image.copyright = iu["image"]["copyright"]
                doc_image.save()
            else:
                DocumentImage.objects.create(
                    document_id=doc_id,
                    image_id=image_id,
                    title=iu["image"]["title"],
                    copyright=iu["image"]["copyright"],
                )
        elif iu["type"] == "delete":
            DocumentImage.objects.filter(
                document_id=doc_id, image_id=image_id
            ).delete()

            for image in Image.objects.filter(id=image_id).iterator():
                if image.is_deletable():
                    image.delete()


async def save_path_object(path_object, new_path):
    """Persist a new path on an AccessRight or Document instance."""
    path_object.path = new_path
    await path_object.asave(update_fields=["path"])

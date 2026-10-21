"""list pre-existing "read-without-comments" grants on E2EE
documents so owners can review them after the right was removed from
the offerable set for encrypted documents."""

from django.core.management.base import BaseCommand

from document.models import AccessRight, Document


class Command(BaseCommand):
    help = (
        "List access rights of type read-without-comments that were "
        "granted to end-to-end encrypted documents before the "
        "change. Such grants still see comments because comments are "
        "part of the encrypted document state."
    )

    def handle(self, *args, **options):
        rights = (
            AccessRight.objects.filter(
                rights="read-without-comments",
                document__in=Document.objects.filter(e2ee=True),
            )
            .select_related("document", "holder_type")
            .order_by("document_id")
        )
        count = 0
        for access_right in rights:
            holder = access_right.holder_obj
            self.stdout.write(
                f"document {access_right.document_id} "
                f"({access_right.document.title}): "
                f"{access_right.holder_type.model} "
                f"{getattr(holder, 'username', access_right.holder_id)}"
            )
            count += 1
        self.stdout.write(
            self.style.SUCCESS(
                f"{count} read-without-comments grant(s) on encrypted "
                "documents found."
            )
        )

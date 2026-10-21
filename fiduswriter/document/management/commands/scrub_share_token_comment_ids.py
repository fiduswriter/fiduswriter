"""Data repair.

Historically, guest users sharing a document via a share token were
identified by the secret share token UUID. That value was then stored in
comment data (``user``/``assignedUser``/answer ``user`` fields) and
relayed to everybody with document access.

This command scans all stored ``Document.comments`` for values equal to
the token of any (active) ShareToken and replaces them with the display
placeholder "shared guest".

Run with --dry-run to report without writing.
"""

from django.core.management.base import BaseCommand
from django.db.models import Q

from document.models import Document, ShareToken

PLACEHOLDER = "shared guest"


class Command(BaseCommand):
    help = (
        "Replace stored share token UUIDs in document comments with the "
        '"shared guest" placeholder.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report what would be changed without writing.",
        )
        parser.add_argument(
            "--include-inactive",
            action="store_true",
            help="Also scrub token values of revoked/inactive share tokens.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        token_filter = Q()
        tokens = ShareToken.objects.all()
        if not options["include_inactive"]:
            tokens = tokens.filter(is_active=True)
        token_values = [
            str(token) for token in tokens.values_list("token", flat=True)
        ]
        if not token_values:
            self.stdout.write("No share tokens found; nothing to do.")
            return
        for value in token_values:
            token_filter |= Q(comments__contains=value)

        changed_documents = 0
        changed_fields = 0
        for document in Document.objects.filter(token_filter):
            comments = document.comments
            if not isinstance(comments, dict):
                continue
            changed = self.scrub(comments, token_values)
            if changed:
                changed_documents += 1
                changed_fields += changed
                if not dry_run:
                    document.comments = comments
                    document.save(update_fields=["comments", "updated"])
        action = "Would replace" if dry_run else "Replaced"
        self.stdout.write(
            f"{action} {changed_fields} value(s) in {changed_documents} "
            f"document(s) with the placeholder '{PLACEHOLDER}'."
        )

    def scrub(self, comments, token_values):
        changed = 0
        for comment in comments.values():
            if not isinstance(comment, dict):
                continue
            for field in ("user", "assignedUser"):
                if comment.get(field) in token_values:
                    if field == "user":
                        comment[field] = PLACEHOLDER
                    else:
                        comment[field] = None
                    changed += 1
            if comment.get("username") and comment.get("user") == PLACEHOLDER:
                comment["username"] = PLACEHOLDER
                changed += 1
            answers = comment.get("answers")
            if isinstance(answers, list):
                for answer in answers:
                    if not isinstance(answer, dict):
                        continue
                    if answer.get("user") in token_values:
                        answer["user"] = PLACEHOLDER
                        if "username" in answer:
                            answer["username"] = PLACEHOLDER
                        changed += 1
        return changed

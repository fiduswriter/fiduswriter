import os
import shutil

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from document.models import DocumentRevision

ORPHAN_DIR_NAME = "orphaned-revisions"


class Command(BaseCommand):
    help = (
        "Without options: find document revision files that are no longer "
        "referenced by any revision in the database (leftovers from "
        "deleted documents and revisions) and move them into an "
        "'orphaned-revisions' folder inside the app storage directory. "
        "With --delete: only consider the files already in that folder - "
        "a warning is shown and confirmation is asked for interactively "
        "(or given non-interactively via --confirm)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--delete",
            action="store_true",
            help="Delete the files in the orphaned-revisions folder. A "
            "warning with the number of affected files is shown and "
            "confirmation is asked for interactively; add --confirm to "
            "delete without prompting. No scanning or moving is performed "
            "in this mode.",
        )
        parser.add_argument(
            "--confirm",
            action="store_true",
            help="Skip the interactive confirmation of --delete. Only "
            "valid together with --delete.",
        )

    def _orphan_dir(self):
        return os.path.join(settings.APP_STORAGE_ROOT, ORPHAN_DIR_NAME)

    def _referenced_names(self):
        referenced = set()
        for name in DocumentRevision.objects.exclude(
            file_object=""
        ).values_list("file_object", flat=True):
            referenced.add(name)
            referenced.add(name.split("/")[-1])
        return referenced

    def _scan(self, referenced):
        """Find unreferenced revision files outside the orphan folder."""
        candidates = []
        legacy_dir = os.path.join(settings.MEDIA_ROOT, "document-revisions")
        if os.path.isdir(legacy_dir):
            for file_name in os.listdir(legacy_dir):
                candidates.append(os.path.join(legacy_dir, file_name))
        if os.path.isdir(settings.MEDIA_ROOT):
            # Revisions with a bare file name were stored directly in
            # MEDIA_ROOT.
            for file_name in os.listdir(settings.MEDIA_ROOT):
                if file_name.endswith(".fidus"):
                    candidates.append(
                        os.path.join(settings.MEDIA_ROOT, file_name)
                    )
        for dir_path, dir_names, file_names in os.walk(
            settings.APP_STORAGE_ROOT
        ):
            if ORPHAN_DIR_NAME in dir_names:
                dir_names.remove(ORPHAN_DIR_NAME)
            for file_name in file_names:
                if file_name.endswith(".fidus"):
                    candidates.append(os.path.join(dir_path, file_name))
        return [
            path
            for path in candidates
            if os.path.isfile(path)
            and os.path.basename(path) not in referenced
        ]

    def _quarantined(self, referenced):
        orphan_dir = self._orphan_dir()
        if not os.path.isdir(orphan_dir):
            return []
        return [
            os.path.join(orphan_dir, file_name)
            for file_name in os.listdir(orphan_dir)
            if os.path.isfile(os.path.join(orphan_dir, file_name))
            and file_name not in referenced
        ]

    @staticmethod
    def _mb(paths):
        return sum(os.path.getsize(path) for path in paths) / (1024 * 1024)

    def _delete(self, referenced, confirmed):
        quarantined = self._quarantined(referenced)
        orphan_dir = self._orphan_dir()
        if not quarantined:
            self.stdout.write(
                f"Nothing to delete: no unreferenced files in {orphan_dir}."
            )
            return
        if not confirmed:
            self.stdout.write(
                self.style.WARNING(
                    f"WARNING: this will permanently delete "
                    f"{len(quarantined)} file(s) "
                    f"({self._mb(quarantined):.1f} MB) from "
                    f"{orphan_dir}."
                )
            )
            try:
                answer = input(
                    "Type 'yes' to permanently delete these files: "
                )
            except EOFError:
                answer = ""
            if answer.strip().lower() not in ("y", "yes"):
                self.stdout.write(
                    "Aborted. Re-run with --delete --confirm to delete "
                    "without prompting."
                )
                return
        count = len(quarantined)
        freed = self._mb(quarantined)
        for path in quarantined:
            os.remove(path)
        self.stdout.write(
            self.style.SUCCESS(
                f"Deleted {count} orphaned revision file(s) "
                f"({freed:.1f} MB freed)."
            )
        )

    def handle(self, *args, **options):
        if options["confirm"] and not options["delete"]:
            raise CommandError("--confirm requires --delete")
        referenced = self._referenced_names()
        if options["delete"]:
            self._delete(referenced, options["confirm"])
            return
        orphans = self._scan(referenced)
        orphan_dir = self._orphan_dir()
        moved = 0
        moved_size = 0
        for path in orphans:
            moved_size += os.path.getsize(path)
            os.makedirs(orphan_dir, exist_ok=True)
            target_path = os.path.join(orphan_dir, os.path.basename(path))
            counter = 0
            while os.path.exists(target_path):
                counter += 1
                target_path = os.path.join(
                    orphan_dir, f"{counter}-{os.path.basename(path)}"
                )
            try:
                os.rename(path, target_path)
            except OSError:
                shutil.copyfile(path, target_path)
                os.remove(path)
            moved += 1
        if moved:
            self.stdout.write(
                f"Moved {moved} orphaned revision file(s) "
                f"({moved_size / (1024 * 1024):.1f} MB) into {orphan_dir}."
            )
        else:
            self.stdout.write("No orphaned revision files found.")
        quarantined = self._quarantined(referenced)
        if quarantined:
            self.stdout.write(
                f"{len(quarantined)} orphaned file(s) "
                f"({self._mb(quarantined):.1f} MB) are quarantined in "
                f"{orphan_dir}. Re-run with --delete to see a deletion "
                "warning."
            )

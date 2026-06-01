import json
import os

from django.conf import settings
from django.core.management import call_command
from npm_mjs.management.commands.collectstatic import (
    Command as CollectStaticCommand,
)

from base.management import BaseCommand


class Command(CollectStaticCommand, BaseCommand):
    def handle(self, *args, **options):
        call_command("transpile")
        self._remove_stale_manifest()
        return super().handle(*args, **options)

    def _remove_stale_manifest(self):
        static_root = settings.STATIC_ROOT
        if not static_root:
            return

        manifest_path = os.path.join(static_root, "staticfiles.json")
        if not os.path.exists(manifest_path):
            return

        try:
            with open(manifest_path, encoding="utf-8") as f:
                content = f.read()
            manifest = json.loads(content)
            version = manifest.get("version")
            if version == "1.1":
                return
        except (json.JSONDecodeError, OSError, KeyError):
            pass

        os.remove(manifest_path)

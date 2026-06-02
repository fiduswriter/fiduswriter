from django.apps import AppConfig
from django.core.management import call_command

from npm_mjs.signals import post_npm_install


def bundle_mathlive(sender, **kwargs):
    call_command("bundle_mathlive")


# Monkeypatch servestatic to avoid corrupting the manifest during dry-run
# collectstatic. servestatic unconditionally calls add_stats_to_manifest() at
# the end of post_process(), even when collectstatic is run with dry_run=True.
# This writes {"stats": {...}} to staticfiles.json without Django's required
# "version" and "paths" keys, causing a ValueError on the next manifest load.
# TODO: Remove this once https://github.com/Archmonger/ServeStatic/issues/104
# is fixed upstream.
try:
    from servestatic.storage import CompressedManifestStaticFilesStorage
except ImportError:
    pass
else:
    _servestatic_original_post_process = (
        CompressedManifestStaticFilesStorage.post_process
    )

    def _servestatic_patched_post_process(self, *args, **kwargs):
        if kwargs.get("dry_run"):
            # Skip servestatic's add_stats_to_manifest during dry runs.
            # Replicate the original generator logic without the final
            # add_stats_to_manifest() call.
            files = super(
                CompressedManifestStaticFilesStorage, self
            ).post_process(*args, **kwargs)
            for name, hashed_name, processed in files:
                if isinstance(processed, Exception):
                    processed = self.make_helpful_exception(processed, name)
                yield name, hashed_name, processed
            return
        yield from _servestatic_original_post_process(self, *args, **kwargs)

    CompressedManifestStaticFilesStorage.post_process = (
        _servestatic_patched_post_process
    )


class BaseConfig(AppConfig):
    name = "base"
    default_auto_field = "django.db.models.AutoField"

    def ready(self):
        post_npm_install.connect(bundle_mathlive)

from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
import os
import re
import time
from collections import Counter


# Bug 4 fix: module-level constant for Google Translate's 5 000-character limit.
# Using 4 900 rather than 5 000 leaves a safety margin for the XML placeholders
# that protect_format_specs injects.
MAX_CHARS = 4900

# Bug 2 fix: expand from "%(name)s only" to a combined alternation that covers
# all common Python/Django format-specifier styles so they are all hidden from
# the translator and faithfully round-tripped.
FORMAT_SPEC_RE = re.compile(
    r"%\([^)]+\)[sdifFgGeExXroc%]"  # %(name)s  named Django-style  (original)
    r"|\{\w+(?::[^}]*)?\}"  # {name} / {name:fmt}  brace-style
    r"|\{\d+(?::[^}]*)?\}"  # {0} / {0:fmt}  positional brace-style
    r"|(?<!\()%[sdirf]"  # bare %s %d %i %f %r (negative lookbehind
    #   avoids re-matching the ( of %(name)s)
)


def _discover_languages(locale_dir):
    """Return all subdirectory names inside *locale_dir* that look like language
    codes (i.e. are directories and not hidden)."""
    if not os.path.isdir(locale_dir):
        return []
    return [
        d
        for d in os.listdir(locale_dir)
        if os.path.isdir(os.path.join(locale_dir, d))
    ]


# Known TypeScript package directories (checked out next to the monorepo).
# Maps directory name → human-readable label.
_KNOWN_TS_PACKAGES = {
    "fwtoolkit": "fwtoolkit",
    "fiduswriter-frontend-js": "@fiduswriter/frontend",
    "fiduswriter-editor-js": "@fiduswriter/editor",
    "fiduswriter-document-js": "@fiduswriter/document",
    "fiduswriter-bibliography-manager-js": "@fiduswriter/bibliography-manager",
    "fiduswriter-image-manager-js": "@fiduswriter/image-manager",
    "fiduswriter-document-template-editor-js": (
        "@fiduswriter/document-template-editor"
    ),
    "fiduswriter-books-document-js": "@fiduswriter/books-document",
    "fiduswriter-cli-js": "@fiduswriter/cli",
}


def _is_ts_package(label):
    """Return True if *label* identifies a TypeScript (npm) package rather than
    a Django plugin."""
    return label.startswith("@") or label == "fwtoolkit"


def _discover_typescript_package_locales():
    """Find TypeScript package locale directories next to the main repo.

    SRC_PATH is <parent>/fiduswriter/fiduswriter/ (the Django project root).
    os.path.dirname(os.path.dirname(SRC_PATH)) is <parent>/ — the directory
    that contains the main fiduswriter repo and all TypeScript package repos.
    """
    parent = os.path.dirname(os.path.dirname(settings.SRC_PATH))
    ts_package_locales = []

    for dirname, label in _KNOWN_TS_PACKAGES.items():
        locale_dir = os.path.join(parent, dirname, "locale")
        if os.path.isdir(locale_dir):
            ts_package_locales.append((locale_dir, label))
    return ts_package_locales


class Command(BaseCommand):
    help = "Translate all PO files for all languages"

    def add_arguments(self, parser):
        parser.add_argument(
            "--locale",
            nargs="*",
            help="Specify locales to translate (default: all)",
        )
        parser.add_argument(
            "--domain",
            nargs="*",
            default=["django", "djangojs"],
            help="Specify domains to translate (default: django, djangojs)",
        )
        parser.add_argument(
            "--no-fuzzy", action="store_true", help="Skip fuzzy translations"
        )
        parser.add_argument(
            "--delay",
            type=float,
            default=0.5,
            help="Delay between translations in seconds (default: 0.5)",
        )
        parser.add_argument(
            "--plugin",
            nargs="*",
            default=None,
            help=(
                "Names of plugin directories symlinked into SRC_PATH whose "
                "locale files should also be translated (e.g. --plugin book). "
                "If not specified, all symlinked directories with a locale/ "
                "subdirectory under SRC_PATH are auto-discovered."
            ),
        )
        parser.add_argument(
            "--no-makemessages",
            action="store_true",
            help="Skip running makemessages before and after translation.",
        )
        parser.add_argument(
            "--no-symlinks",
            action="store_true",
            help="Do not follow symlinks when running makemessages.",
        )
        parser.add_argument(
            "--ts-packages",
            nargs="*",
            default=None,
            help=(
                "Names of TypeScript package directories in the parent of "
                "SRC_PATH whose locale files should also be translated. "
                "Use directory names (e.g. fwtoolkit, fiduswriter-editor-js). "
                "If not specified and --no-ts-packages is not set, all known "
                "TypeScript packages with a locale/ subdirectory are "
                "auto-discovered."
            ),
        )
        parser.add_argument(
            "--no-ts-packages",
            action="store_true",
            help="Skip translation of TypeScript package locales entirely.",
        )

    def handle(self, *args, **options):
        locale_dir = os.path.join(settings.SRC_PATH, "locale")

        if not os.path.exists(locale_dir):
            raise CommandError(f"Locale directory not found: {locale_dir}")

        # ---- gather language codes ------------------------------------------------
        if options["locale"]:
            languages = options["locale"]
        else:
            languages = _discover_languages(locale_dir)

        # ---- gather plugin locale directories -------------------------------------
        plugin_locale_dirs = []
        if options["plugin"] is not None:
            # Explicit plugin list given — use only those.
            for plugin in options["plugin"]:
                plugin_locale = os.path.join(
                    settings.SRC_PATH, plugin, "locale"
                )
                if os.path.isdir(plugin_locale):
                    plugin_locale_dirs.append(plugin_locale)
                    self.stdout.write(
                        self.style.NOTICE(
                            f"Plugin locale directory found: {plugin_locale}"
                        )
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING(
                            f"Plugin '{plugin}' has no locale directory "
                            f"({plugin_locale}) – skipping."
                        )
                    )
        else:
            # Auto-discover symlinked directories with a locale/ subdirectory.
            for entry in os.scandir(settings.SRC_PATH):
                if entry.is_symlink() and entry.is_dir():
                    plugin_locale = os.path.join(entry.path, "locale")
                    if os.path.isdir(plugin_locale):
                        plugin_locale_dirs.append(plugin_locale)
                        self.stdout.write(
                            self.style.NOTICE(
                                f"Auto-discovered plugin locale: {plugin_locale}"
                            )
                        )
            if not plugin_locale_dirs:
                self.stdout.write(
                    "No symlinked plugin directories with locale/ found."
                )

        # ---- gather TypeScript package locale directories --------------------------
        ts_package_locales = []
        if not options["no_ts_packages"]:
            if options["ts_packages"] is not None:
                # Explicit list given — look up by directory name.
                for ts_dirname in options["ts_packages"]:
                    label = _KNOWN_TS_PACKAGES.get(ts_dirname, ts_dirname)
                    parent = os.path.dirname(
                        os.path.dirname(settings.SRC_PATH)
                    )
                    locale = os.path.join(parent, ts_dirname, "locale")
                    if os.path.isdir(locale):
                        ts_package_locales.append((locale, label))
                        self.stdout.write(
                            self.style.NOTICE(
                                f"TS package locale found: {locale} ({label})"
                            )
                        )
                    else:
                        self.stdout.write(
                            self.style.WARNING(
                                f"TS package '{ts_dirname}' has no locale "
                                f"directory ({locale}) – skipping."
                            )
                        )
            else:
                # Auto-discover.
                ts_package_locales = _discover_typescript_package_locales()
                for locale_dir, label in ts_package_locales:
                    self.stdout.write(
                        self.style.NOTICE(
                            f"Auto-discovered TS package locale: "
                            f"{locale_dir} ({label})"
                        )
                    )
                if not ts_package_locales:
                    self.stdout.write(
                        "No TypeScript package locale/ directories found."
                    )
        else:
            self.stdout.write(
                "Skipping TypeScript packages (--no-ts-packages)."
            )

        # ---- warn about stale TS package POT files ---------------------------------
        if ts_package_locales:
            self._warn_stale_ts_templates(ts_package_locales, languages)

        domains = options["domain"]
        skip_fuzzy = options["no_fuzzy"]
        delay = options["delay"]

        self.stdout.write(
            self.style.SUCCESS(
                f"Translating {len(languages)} languages: {', '.join(languages)}"
            )
        )
        self.stdout.write(f"Domains: {', '.join(domains)}")
        self.stdout.write(f"Delay: {delay}s between translations")
        self.stdout.write(f"Skip fuzzy: {skip_fuzzy}")
        if options["plugin"] is not None:
            plugin_label = ", ".join(options["plugin"])
        else:
            plugin_label = (
                ", ".join(
                    os.path.basename(os.path.dirname(d))
                    for d in plugin_locale_dirs
                )
                or "(none)"
            )
        self.stdout.write(f"Plugins: {plugin_label}")
        self.stdout.write("=" * 60)

        # ---- run makemessages before translation to extract fresh strings ----
        if not options["no_makemessages"]:
            makemessages_kwargs = {}
            if not options["no_symlinks"]:
                makemessages_kwargs["symlinks"] = True
            self.stdout.write(
                self.style.NOTICE(
                    "\n--- Running makemessages (pre-translation) ---"
                )
            )
            call_command("makemessages", **makemessages_kwargs)
            self.stdout.write(
                self.style.SUCCESS("--- makemessages completed ---")
            )
        else:
            self.stdout.write("Skipping makemessages (--no-makemessages)")

        total_translated = 0

        # Process the main app's locale directory + all plugin locale directories
        # + all TypeScript package locale directories.
        django_locale_dirs = [(locale_dir, "main app")] + [
            (d, f"plugin ({os.path.relpath(d, settings.SRC_PATH)})")
            for d in plugin_locale_dirs
        ]
        all_locale_dirs = django_locale_dirs + ts_package_locales

        for locale_root, label in all_locale_dirs:

            self.stdout.write(
                self.style.NOTICE(
                    f"\n--- Processing {label} locale: {locale_root} ---"
                )
            )

            for lang in languages:
                lang_dir = os.path.join(locale_root, lang, "LC_MESSAGES")
                if not os.path.exists(lang_dir):
                    continue

                target_lang = self.get_target_lang(lang)

                # TypeScript packages use a single "messages" domain instead
                # of Django's "django"/"djangojs" split.
                if _is_ts_package(label):
                    effective_domains = ["messages"]
                else:
                    effective_domains = domains

                for domain in effective_domains:
                    po_file = os.path.join(lang_dir, f"{domain}.po")
                    if not os.path.exists(po_file):
                        continue

                    self.stdout.write(
                        self.style.NOTICE(
                            f"\nTranslating {lang}/{domain}.po ({label}) "
                            f"to {target_lang}..."
                        )
                    )

                    count = self.translate_file(
                        po_file, target_lang, skip_fuzzy, delay
                    )
                    total_translated += count

                    self.stdout.write(
                        self.style.SUCCESS(
                            f"  Translated {count} strings in "
                            f"{lang}/{domain}.po ({label})"
                        )
                    )

        self.stdout.write(
            self.style.SUCCESS(
                f"\n{'=' * 60}\n"
                f"Total translated: {total_translated} strings\n"
                f"{'=' * 60}"
            )
        )

        # ---- run makemessages after translation to fix formatting ----
        if not options["no_makemessages"]:
            makemessages_kwargs = {}
            if not options["no_symlinks"]:
                makemessages_kwargs["symlinks"] = True
            self.stdout.write(
                self.style.NOTICE(
                    "\n--- Running makemessages (post-translation) ---"
                )
            )
            call_command("makemessages", **makemessages_kwargs)
            self.stdout.write(
                self.style.SUCCESS("--- makemessages completed ---")
            )

    def get_target_lang(self, lang):
        """Map locale code to translator language code."""
        mapping = {
            "en_US": "en",
            "pt_BR": "pt",
            # Bug: "pt" resolves to Brazilian Portuguese on Google
            # Translate; "pt_PT" explicitly requests European Portuguese (not available).
            "pt_PT": "pt",
            "zh_Hans": "zh-CN",
            "nb": "no",
        }
        return mapping.get(lang, lang)

    def protect_format_specs(self, text):
        """Replace format specifiers with XML-style placeholder tokens.

        Bug 1 fix: use <ph id="N"/> instead of __VAR_N__.  Google Translate
        treats XML/HTML tags as opaque markup and preserves them faithfully,
        whereas it may partially translate the word "VAR" inside __VAR_N__.
        """
        specs = []

        def replacer(match):
            specs.append(match.group(0))
            # XML self-closing tags are kept intact by Google Translate.
            return f'<ph id="{len(specs) - 1}"/>'

        protected = FORMAT_SPEC_RE.sub(replacer, text)
        return protected, specs

    def restore_format_specs(self, text, specs):
        """Replace XML-style placeholder tokens back with original format specifiers.

        Bug 1 fix: use a regex instead of a plain string replace so we can
        tolerate the minor variations in attribute quoting and whitespace that
        Google Translate sometimes introduces (e.g. <ph id='0'> or <ph id=0 />).
        Using a lambda as the replacement prevents re.sub from interpreting
        backslash sequences that might appear in the original spec string.
        """
        for i, spec in enumerate(specs):
            text = re.sub(
                rf'<\s*ph\s+id\s*=\s*["\']?{i}["\']?\s*/?\s*>',
                lambda m, s=spec: s,  # lambda avoids re.sub backslash expansion
                text,
                flags=re.IGNORECASE,
            )
        return text

    def translate_file(self, po_file, target_lang, skip_fuzzy, delay):
        """Translate a single PO file using polib."""
        from deep_translator import GoogleTranslator
        from deep_translator.exceptions import TooManyRequests
        import polib

        translator = GoogleTranslator(source="en", target=target_lang)
        po = polib.pofile(po_file)

        translated = 0
        errors = 0
        skipped_format = 0
        rate_limit_pauses = 0

        for entry in po:
            is_fuzzy = "fuzzy" in entry.flags

            needs_translation = False
            if entry.msgid and not entry.msgstr:
                needs_translation = True
            elif is_fuzzy and not skip_fuzzy:
                needs_translation = True

            if not needs_translation:
                continue

            msgid_text = entry.msgid
            if not msgid_text:
                continue

            # Protect format specifiers before translation
            protected_text, specs = self.protect_format_specs(msgid_text)

            # Bug 3 fix: preserve the *full* leading and trailing whitespace
            # sequence, not just a single '\n'.  Google Translate silently
            # strips leading/trailing whitespace, so we peel it off before
            # sending and reattach it afterwards.
            leading = protected_text[
                : len(protected_text) - len(protected_text.lstrip("\n "))
            ]
            trailing_stripped = protected_text.rstrip("\n ")
            trailing = protected_text[len(trailing_stripped) :]
            protected_text = trailing_stripped[len(leading) :]

            # Bug 4 fix: skip strings that exceed Google Translate's ~5 000-
            # character limit; sending them would cause an API error and waste
            # retry budget.
            if len(protected_text) > MAX_CHARS:
                self.stdout.write(
                    self.style.WARNING(
                        f"  Skipping (too long, {len(protected_text)} chars): "
                        f"{entry.msgid[:50]!r}..."
                    )
                )
                continue

            max_retries = 5
            for attempt in range(max_retries):
                try:
                    result = translator.translate(protected_text)
                    if result:
                        # Restore whitespace first, then format specifiers
                        result = leading + result + trailing
                        result = self.restore_format_specs(result, specs)

                        # Verify format specifiers were preserved
                        result_specs = FORMAT_SPEC_RE.findall(result)
                        if Counter(result_specs) != Counter(specs):
                            skipped_format += 1
                            break

                        entry.msgstr = result
                        if is_fuzzy:
                            entry.flags.remove("fuzzy")
                            self.stdout.write(
                                f"  Fixed fuzzy: {entry.msgid[:30]}..."
                            )
                        translated += 1
                        if translated % 10 == 0:
                            self.stdout.write(
                                f"  Progress: {translated} translated..."
                            )
                        time.sleep(delay)
                        break
                    else:
                        errors += 1
                        break
                except TooManyRequests:
                    rate_limit_pauses += 1
                    self.stdout.write(
                        f"  Rate limit hit, waiting 10s... "
                        f"(pause #{rate_limit_pauses})"
                    )
                    time.sleep(10)
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"  Error: {e}"))
                    errors += 1
                    break

        po.save(po_file)

        self.stdout.write(f"  Saved {po_file}")
        self.stdout.write(f"  Translated: {translated}")
        self.stdout.write(
            f"  Skipped (format specs corrupted): {skipped_format}"
        )
        self.stdout.write(f"  Errors: {errors}")
        self.stdout.write(f"  Rate limit pauses: {rate_limit_pauses}")

        return translated

    def _warn_stale_ts_templates(self, ts_package_locales, languages):
        """Warn if a TypeScript package's messages.pot template is newer than
        its messages.po files, suggesting the developer needs to run
        ``npm run extract-i18n`` before translation."""

        for locale_root, label in ts_package_locales:
            # Check for messages.pot in the locale root (some tools place it
            # there) or in a template/ subdirectory.
            pot_candidates = [
                os.path.join(locale_root, "messages.pot"),
                os.path.join(locale_root, "templates", "messages.pot"),
            ]
            pot_file = None
            for candidate in pot_candidates:
                if os.path.isfile(candidate):
                    pot_file = candidate
                    break

            if not pot_file:
                continue

            pot_mtime = os.path.getmtime(pot_file)

            for lang in languages:
                po_file = os.path.join(
                    locale_root, lang, "LC_MESSAGES", "messages.po"
                )
                if os.path.isfile(po_file):
                    po_mtime = os.path.getmtime(po_file)
                    if pot_mtime > po_mtime:
                        self.stdout.write(
                            self.style.WARNING(
                                f"Stale: {label} {lang} messages.po is older "
                                f"than messages.pot. Run "
                                f"'cd $(dirname $(dirname {locale_root})) && "
                                f"npm run extract-i18n' to refresh."
                            )
                        )

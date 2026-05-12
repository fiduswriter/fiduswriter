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

    def handle(self, *args, **options):
        locale_dir = os.path.join(settings.SRC_PATH, "locale")

        if not os.path.exists(locale_dir):
            raise CommandError(f"Locale directory not found: {locale_dir}")

        if options["locale"]:
            languages = options["locale"]
        else:
            languages = [
                d
                for d in os.listdir(locale_dir)
                if os.path.isdir(os.path.join(locale_dir, d))
            ]

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
        self.stdout.write("=" * 60)

        total_translated = 0

        for lang in languages:
            lang_dir = os.path.join(locale_dir, lang, "LC_MESSAGES")
            if not os.path.exists(lang_dir):
                self.stdout.write(
                    self.style.WARNING(
                        f"Skipping {lang} - LC_MESSAGES not found"
                    )
                )
                continue

            target_lang = self.get_target_lang(lang)

            for domain in domains:
                po_file = os.path.join(lang_dir, f"{domain}.po")
                if not os.path.exists(po_file):
                    self.stdout.write(
                        self.style.WARNING(
                            f"Skipping {lang}/{domain}.po - file not found"
                        )
                    )
                    continue

                self.stdout.write(
                    self.style.NOTICE(
                        f"\nTranslating {lang}/{domain}.po to {target_lang}..."
                    )
                )

                count = self.translate_file(
                    po_file, target_lang, skip_fuzzy, delay
                )
                total_translated += count

                self.stdout.write(
                    self.style.SUCCESS(
                        f"  Translated {count} strings in {lang}/{domain}.po"
                    )
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"\n{'=' * 60}\n"
                f"Total translated: {total_translated} strings\n"
                f"{'=' * 60}"
            )
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

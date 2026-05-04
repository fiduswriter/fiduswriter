from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
import os
import re
import time
from collections import Counter


# Regex for Django/Python format specifiers like %(name)s
FORMAT_SPEC_RE = re.compile(r"%\([^)]+\)[sdifFgGeExXroc%]")


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
            "pt_PT": "pt",
            "zh_Hans": "zh-CN",
            "nb": "no",
        }
        return mapping.get(lang, lang)

    def protect_format_specs(self, text):
        """Replace %(name)s format specifiers with numbered placeholders."""
        specs = []

        def replacer(match):
            specs.append(match.group(0))
            return f"__VAR_{len(specs) - 1}__"

        protected = FORMAT_SPEC_RE.sub(replacer, text)
        return protected, specs

    def restore_format_specs(self, text, specs):
        """Replace numbered placeholders back with original format specifiers."""
        for i, spec in enumerate(specs):
            text = text.replace(f"__VAR_{i}__", spec)
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

            # Preserve leading/trailing newlines that Google Translate strips
            leading_newline = ""
            trailing_newline = ""
            if protected_text.startswith("\n"):
                leading_newline = "\n"
                protected_text = protected_text[1:]
            if protected_text.endswith("\n"):
                trailing_newline = "\n"
                protected_text = protected_text[:-1]

            max_retries = 5
            for attempt in range(max_retries):
                try:
                    result = translator.translate(protected_text)
                    if result:
                        # Restore newlines first, then format specifiers
                        result = leading_newline + result + trailing_newline
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

"""
Custom createsuperuser command that creates a verified EmailAddress
for the user, ensuring proper email verification status in allauth.

This is a drop-in replacement for Django's createsuperuser command.
"""

import getpass
import sys

from django.contrib.auth import get_user_model
from django.contrib.auth.management import get_default_username
from django.contrib.auth.password_validation import validate_password
from django.core.management.base import CommandError
from django.db import DEFAULT_DB_ALIAS
from django.utils.text import capfirst

from allauth.account.models import EmailAddress

from base.management import BaseCommand


class Command(BaseCommand):
    help = "Create a superuser with a verified EmailAddress for allauth"
    stealth_options = ("stdin",)
    requires_model_validation = False

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.UserModel = get_user_model()

    def add_arguments(self, parser):
        parser.add_argument(
            "--username",
            dest="username",
            help="Specifies the username for the superuser.",
        )
        parser.add_argument(
            "--email",
            dest="email",
            help="Specifies the email address for the superuser.",
        )
        parser.add_argument(
            "--password",
            dest="password",
            help="Specifies the password for the superuser.",
        )
        parser.add_argument(
            "--noinput",
            "--no-input",
            action="store_false",
            dest="interactive",
            default=True,
            help=(
                "Do NOT prompt the user for input of any kind. "
                "Values for username, email, and password must be provided "
                "via command line arguments or environment variables."
            ),
        )
        parser.add_argument(
            "--database",
            dest="database",
            default=DEFAULT_DB_ALIAS,
            help='Specifies the database to use. Default is "default".',
        )

    def execute(self, *args, **options):
        # Handle interactive mode
        if not options["interactive"]:
            if (
                not options.get("username")
                or not options.get("email")
                or not options.get("password")
            ):
                raise CommandError(
                    "In non-interactive mode, --username, --email, and --password are required."
                )
        return super().execute(*args, **options)

    def handle(self, *args, **options):
        self.stdin = options.get("stdin", sys.stdin)
        self.database = options.get("database")
        self.verbosity = options.get("verbosity", 1)

        # Get credentials from options or prompt
        username = options.get("username")
        email = options.get("email")
        password = options.get("password")
        interactive = options.get("interactive", True)

        if interactive:
            # Prompt for username
            default_username = get_default_username()
            while not username:
                username = self.get_input_data("username", default_username)
                if not username:
                    self.stderr.write("Error: This field is required.")
                elif self.UserModel.objects.filter(username=username).exists():
                    self.stderr.write(
                        f"Error: Username '{username}' is already taken."
                    )
                    username = None

            # Prompt for email
            while not email:
                email = self.get_input_data("email", "")
                if not email:
                    self.stderr.write("Error: This field is required.")
                elif self.UserModel.objects.filter(email=email).exists():
                    self.stderr.write(
                        f"Error: A user with email '{email}' already exists."
                    )
                    email = None

            # Prompt for password
            while not password:
                password = getpass.getpass("Password: ")
                if not password:
                    self.stderr.write("Error: Password cannot be empty.")
                    continue
                # Validate password strength
                try:
                    validate_password(
                        password,
                        self.UserModel(username=username, email=email),
                    )
                except Exception as e:
                    self.stderr.write(f"Error: {e}")
                    password = None
                    continue

                # Confirm password
                password2 = getpass.getpass("Password (again): ")
                if password != password2:
                    self.stderr.write("Error: Passwords don't match.")
                    password = None
                    continue

        # Final validation
        if not username:
            raise CommandError("Username is required.")
        if not email:
            raise CommandError("Email is required.")
        if not password:
            raise CommandError("Password is required.")

        # Check for existing user with same username
        if self.UserModel.objects.filter(username=username).exists():
            raise CommandError(
                f"User with username '{username}' already exists."
            )

        # Check for existing user with same email
        if self.UserModel.objects.filter(email=email).exists():
            raise CommandError(f"User with email '{email}' already exists.")

        # Create the user
        user = self.UserModel.objects.create_superuser(
            username=username,
            email=email,
            password=password,
        )

        # Create verified EmailAddress for allauth
        EmailAddress.objects.create(
            user=user,
            email=email,
            verified=True,
            primary=True,
        )

        if self.verbosity >= 1:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Superuser with verified email created successfully.\n"
                    f"Username: {username}\n"
                    f"Email: {email}"
                )
            )

    def get_input_data(self, field, default=None):
        """Prompt for input with optional default."""
        raw_value = input(f"{capfirst(field)}: ") or default
        return raw_value

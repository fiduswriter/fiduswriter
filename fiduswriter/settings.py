import os

# If you want to show debug messages, set DEBUG to True.

DEBUG = True
AUTO_TRANSPILE = True

SERVER_INFO = {
    # This determines whether the server is used for testing and will let the
    # users know upon signup know that their documents may disappear.
    'TEST_SERVER': True,
    # This is the contact email that will be shown in various places all over
    # the site.
    'CONTACT_EMAIL': 'mail@email.com',
    # If websockets is running on a non-standard port, add it here:
    'WS_PORT': False,
}

ADMINS = (
    ('Your Name', 'your_email@example.com'),
)

MANAGERS = ADMINS

# The top path of the project. The default is for it to point to the directory
# above this file.
PROJECT_PATH = os.path.realpath(os.path.join(os.path.dirname(__file__), '..'))

# Paths to settings files
SETTINGS_PATHS = [os.path.dirname(__file__), ]

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.path.join(PROJECT_PATH, 'fiduswriter.sql'),
        'CONN_MAX_AGE': 15
    }

}

# Will let any user not delete more than 5000 bibliography entries
# simultaneously
DATA_UPLOAD_MAX_NUMBER_FIELDS = 5000

# Whether anyone surfing to the site can open an account.
REGISTRATION_OPEN = True

# Send emails to console.
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Or send emails using an SMTP server
# EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
# EMAIL_HOST = 'localhost'
# EMAIL_HOST_USER = ''
# EMAIL_HOST_PASSWORD = ''
# EMAIL_PORT = 25
# EMAIL_SUBJECT_PREFIX = '[Fidus Writer]'


# Local time zone for this installation. Keep UTC here, the frontend will
# translate this to the correct local time.
TIME_ZONE = 'UTC'

# Language code for this installation. All choices can be found here:
# http://www.i18nguy.com/unicode/language-identifiers.html
LANGUAGE_CODE = 'en-us'

SITE_ID = 1

# If you set this to False, the server will make some optimizations so as not
# to load the internationalization machinery. Fidus Writer makes use of
# internationalization, so you should probably keep this on.

USE_I18N = True

LOCALE_PATHS = (
    os.path.join(PROJECT_PATH, 'locale'),
)

# A list of allowed hostnames of this Fidus Writer installation
ALLOWED_HOSTS = [
    'localhost',
]

# If you set this to False, the server will not format dates, numbers and
# calendars according to the current locale.
USE_L10N = True

# If you set this to False, the server will not use timezone-aware datetimes.
USE_TZ = True

# Absolute filesystem path to the directory that will hold user-uploaded files.
# The default is the media folder in the directory above this file.
MEDIA_ROOT = os.path.join(PROJECT_PATH, 'media')

# URL that handles the media served from MEDIA_ROOT. Make sure to use a
# trailing slash.
MEDIA_URL = '/media/'

# Absolute path to the directory static files should be collected to.
# Don't put anything in this directory yourself; store your static files
# in apps' "static/" subdirectories and in STATICFILES_DIRS.
# Example: "/home/media/media.lawrence.com/static/"
STATIC_ROOT = '/tmp/django-static/'
# URL prefix for static files.
# Example: "http://media.lawrence.com/static/"
STATIC_URL = '/static/'

# Additional locations of static files
STATICFILES_DIRS = (
    os.path.join(PROJECT_PATH, 'static-transpile'),
    os.path.join(PROJECT_PATH, 'static-libs'),
)

LOGIN_URL = '/account/login/'

# List of finder classes that know how to find static files in
# various locations.
STATICFILES_FINDERS = (
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
    # 'django.contrib.staticfiles.finders.DefaultStorageFinder',
    'compressor.finders.CompressorFinder',
)

COMPRESS_OUTPUT_DIR = '.'

# Make this unique, and don't share it with anybody. Change the default string.
SECRET_KEY = '2ouq2zgw5y-@w+t6!#zf#-z1inigg7$lg3p%8e3kkob1bf$#p4'


# These middleware classes is what Fidus Writer needs in its standard setup.
# You only need to change this in very advanced setups.
MIDDLEWARE = (
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.locale.LocaleMiddleware',
)

# The location of the top urls.py file inside the fiduswriter folder.
# You only need to change this in very advanced setups.
ROOT_URLCONF = 'fiduswriter.urls'

# Python dotted path to the WSGI application used by Django's runserver.
WSGI_APPLICATION = 'fiduswriter.wsgi.application'


TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [
            os.path.join(PROJECT_PATH, 'templates'),
            # Put strings here, like "/home/html/django_templates".
            # You only need to change this in very advanced setups.
        ],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'base.context_processors.server_info',
                'django.contrib.auth.context_processors.auth',
                'django.template.context_processors.debug',
                'django.template.context_processors.i18n',
                'django.template.context_processors.media',
                'django.template.context_processors.static',
                'django.template.context_processors.request',
                'django.template.context_processors.tz',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]


# The following are the apps needed by Fidus Writer. The lower part of the list
# are modules to allow different login options.

INSTALLED_APPS = [
    'base',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.sites',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.admin',
    'django.contrib.admindocs',
    'django.contrib.flatpages',
    'django_js_error_hook',
    'npm_mjs',
    'fixturemedia',
    'browser_check',
    'menu',
    'document',
    'bibliography',
    'usermedia',
    'user',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'avatar',
    'compressor',
    'feedback',
    'style'
]

AUTHENTICATION_BACKENDS = (
    # Needed to login by username in Django admin, regardless of `allauth`
    "django.contrib.auth.backends.ModelBackend",

    # `allauth` specific authentication methods, such as login by e-mail
    "allauth.account.auth_backends.AuthenticationBackend",
)

TEST_RUNNER = 'django.test.runner.DiscoverRunner'


# Define available languages
# You only need to change this in very advanced setups.
def gettext(s): return s


LANGUAGES = (
    ('en', gettext('English')),
    ('bg', gettext('Bulgarian')),
    ('de', gettext('German')),
    ('fr', gettext('French')),
    ('it', gettext('Italian')),
    ('es', gettext('Spanish')),
    ('pt-br', gettext('Portuguese (Brazil)')),
)


LOGIN_REDIRECT_URL = '/'

ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_EMAIL_VERIFICATION = "mandatory"

# allow login either with email or username
ACCOUNT_AUTHENTICATION_METHOD = "username_email"

AUTH_PROFILE_MODULE = "account.UserProfile"

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse'
        }
    },
    'formatters': {
        'verbose': {
            'format': (
                '%(levelname)s %(asctime)s %(module)s %(process)d %(thread)d '
                '%(message)s'
            )
        },
        'simple': {
            'format': '\033[22;32m%(levelname)s\033[0;0m %(message)s'
        },
    },
    'handlers': {
        'mail_admins': {
            'level': 'ERROR',
            'class': 'django.utils.log.AdminEmailHandler'
        },
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'simple'
        },
        'null': {
            'class': 'logging.NullHandler',
        },
    },
    'loggers': {
        'django.request': {
            'handlers': ['mail_admins'],
            'level': 'ERROR',
            'propagate': True,
        },
        'django.security.DisallowedHost': {
            'handlers': ['null'],
            'propagate': False,
        },
        'javascript_error': {
            'handlers': ['mail_admins'],
            'level': 'ERROR',
            'propagate': True,
        },
    }
}

# Global variables for avatar
# You only need to change this in very advanced setups.
AVATAR_GRAVATAR_BACKUP = False
AVATAR_DEFAULT_URL = 'img/default_avatar.png'
AVATAR_MAX_AVATARS_PER_USER = 1

DOC_TEMPLATE = open(
    os.path.join(
        os.path.dirname(
            os.path.realpath(__file__)
        ),
        'doc_template.json'
    ),
    'r'
).read()

DOC_TEMPLATE_HASH = open(
    os.path.join(
        os.path.dirname(
            os.path.realpath(__file__)
        ),
        'doc_template.hash'
    ),
    'r'
).read()[:22]


local_config_path = os.path.join(PROJECT_PATH, 'configuration.py')
try:
    local_config = open(local_config_path)
except IOError:
    pass
else:
    exec(local_config.read(), globals())
    # Paths to settings files
    SETTINGS_PATHS += [local_config_path]

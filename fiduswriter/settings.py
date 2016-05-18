import os

# If you want to show debug messages, set DEBUG to True.

DEBUG = True

SERVER_INFO = {
    # This determines whether the server is used for testing and will let the
    # users upon signup know that their documents may disappear.
    'TEST_SERVER': True,
    # This is the contact email that will be shown in various places all over
    # the site. It will also be used to forward feedback messages.
    'CONTACT_EMAIL': 'mail@email.com',
    'WS_PORT': False
}

ADMINS = (
    ('Your Name', 'your_email@example.com'),
)

MANAGERS = ADMINS

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': './fiduswriter.sql',
        'CONN_MAX_AGE': 15
    }

}

# Send emails to console.
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Or send emails using an SMTP server
# EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
# EMAIL_HOST = 'localhost'
# EMAIL_HOST_USER = ''
# EMAIL_HOST_PASSWORD = ''
# EMAIL_PORT = 25
# EMAIL_SUBJECT_PREFIX = '[Fidus Writer]'


# Local time zone for this installation. Choices can be found here:
# http://en.wikipedia.org/wiki/List_of_tz_zones_by_name
# although not all choices may be available on all operating systems.
# In a Windows environment this must be set to your system time zone.
TIME_ZONE = 'America/Chicago'

# Language code for this installation. All choices can be found here:
# http://www.i18nguy.com/unicode/language-identifiers.html
LANGUAGE_CODE = 'en-us'

SITE_ID = 1

# If you set this to False, the server will make some optimizations so as not
# to load the internationalization machinery. Fidus Writer makes use of
# internationalization, so you should probably keep this on.

USE_I18N = True

LOCALE_PATHS = (
    './locale',
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

# The top path of the project. The default is for it to point to the directory
# above this file.
PROJECT_PATH = os.path.realpath(os.path.join(os.path.dirname(__file__), '..'))

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
    # Put strings here, like "/home/html/static" or "C:/www/django/static".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
    os.path.join(PROJECT_PATH, 'static-es5'),
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
MIDDLEWARE_CLASSES = (
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
            './templates',
            # Put strings here, like "/home/html/django_templates".
            # You only need to change this in very advanced setups.
        ],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'base.context_processors.js_locations',
                'base.context_processors.css_locations',
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

INSTALLED_APPS = (
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
    'fixturemedia',
    'menu',
    'document',
    'book',
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
    # If you want to enable one or several of the social network login options
    # below, make sure you add the authorization keys at:
    # http://SERVER.COM/admin/socialaccount/socialapp/
    # 'allauth.socialaccount.providers.facebook',
    # 'allauth.socialaccount.providers.google',
    # 'allauth.socialaccount.providers.twitter',
    # 'allauth.socialaccount.providers.github',
    # 'allauth.socialaccount.providers.linkedin',
    # 'allauth.socialaccount.providers.openid',
    # 'allauth.socialaccount.providers.persona',
    # 'allauth.socialaccount.providers.soundcloud',
    # 'allauth.socialaccount.providers.stackexchange',
)


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
    ('it', gettext('Italian')),
    ('es', gettext('Spanish')),
)


LOGIN_REDIRECT_URL = '/'

ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_EMAIL_VERIFICATION = "mandatory"

# allow login either with email or username
ACCOUNT_AUTHENTICATION_METHOD = "username_email"

AUTH_PROFILE_MODULE = "account.UserProfile"

# locking
LOCK_TIMEOUT = 600

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
            'filters': ['require_debug_false'],
            'class': 'django.utils.log.AdminEmailHandler'
        },
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'simple'
        },
    },
    'loggers': {
        'django.request': {
            'handlers': ['mail_admins'],
            'level': 'ERROR',
            'propagate': True,
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

# Location of commonly used Js libraries. Here the local version is given.
# For deployment a version on the net is better.
JS_LOCATIONS = {
    'JQUERY_URL': STATIC_URL + 'js/libs/jquery-2.2.0.js',
    'JQUERYUI_URL': STATIC_URL + 'js/libs/jquery-ui-1.11.4.js',
    'UNDERSCOREJS_URL': STATIC_URL + 'js/libs/underscore-1.8.3.js',
}

CSS_LOCATIONS = {
}

try:
    exec open(os.path.join(PROJECT_PATH, 'configuration.py')) in globals()
except:
    pass

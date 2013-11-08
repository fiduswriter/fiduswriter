#
# This file is part of Fidus Writer <http://www.fiduswriter.org>
#
# Copyright (C) 2013 Takuto Kojima, Johannes Wilm
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as
# published by the Free Software Foundation, either version 3 of the
# License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.

#############################################
# Django settings for Fidus Writer project. #
#############################################


import os

# If you want to show debug messages, set DEBUG to True.

DEBUG = True
TEMPLATE_DEBUG = DEBUG

SERVER_INFO = {
    # This determines whether the server is used for testing and will let the users 
    # upon signup know that their documents may disappear.  
    'TEST_SERVER': True,
    # This is the contact email that will be shown in various places all over the site.
    'CONTACT_EMAIL': 'mail@email.com',
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
#EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
#EMAIL_HOST = 'localhost'
#EMAIL_HOST_USER = ''
#EMAIL_HOST_PASSWORD = ''
#EMAIL_PORT = 25
#EMAIL_SUBJECT_PREFIX = '[Fidus Writer]'

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
)

LOGIN_URL = '/account/login/'

# List of finder classes that know how to find static files in
# various locations.
STATICFILES_FINDERS = (
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
    #'django.contrib.staticfiles.finders.DefaultStorageFinder',
    'compressor.finders.CompressorFinder',
)

COMPRESS_OUTPUT_DIR = '.'

# Make this unique, and don't share it with anybody. Change the default string.
SECRET_KEY = '2ouq2zgw5y-@w+t6!#zf#-z1inigg7$lg3p%8e3kkob1bf$#p4'

# List of callables that know how to import templates from various sources.
TEMPLATE_LOADERS = (
    'django.template.loaders.filesystem.Loader',
    'django.template.loaders.app_directories.Loader',
#     'django.template.loaders.eggs.Loader',
)


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

TEMPLATE_DIRS = (
    './templates',
    # Put strings here, like "/home/html/django_templates".
    # You only need to change this in very advanced setups.
)

# The context processors used by Fidus Writer.
# You only need to change this in very advanced setups.
TEMPLATE_CONTEXT_PROCESSORS = (
    "base.context_processors.js_locations",
    "base.context_processors.css_locations",    
    "base.context_processors.server_info",
    "django.core.context_processors.static",
    "django.core.context_processors.request",
    "django.contrib.auth.context_processors.auth",
    "allauth.account.context_processors.account",
    "allauth.socialaccount.context_processors.socialaccount",
)


FIXTURE_DIRS = (
     './bibliography/fixture',
)

# The following are the apps needed by Fidus Writer. The lower part of the list
# are modules to allow different login options.

INSTALLED_APPS = (
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.sites',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.admin',
    'django.contrib.admindocs',
    'django.contrib.flatpages',
    'south',
    'base',
    'menu',
    'text',
    'book',
    'bibliography',
    'usermedia',
    'account',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'avatar',
    'compressor',
    'beta'
    # If you want to enable one or several of the social network login options 
    # below, make sure you add the authorization keys at:
    # http://SERVER.COM/admin/socialaccount/socialapp/
    #'allauth.socialaccount.providers.facebook',
    #'allauth.socialaccount.providers.google',
    #'allauth.socialaccount.providers.twitter',
    #'allauth.socialaccount.providers.github',
    #'allauth.socialaccount.providers.linkedin',
    #'allauth.socialaccount.providers.openid',
    #'allauth.socialaccount.providers.persona',
    #'allauth.socialaccount.providers.soundcloud',
    #'allauth.socialaccount.providers.stackexchange',
)


AUTHENTICATION_BACKENDS = (
    # Needed to login by username in Django admin, regardless of `allauth`
    "django.contrib.auth.backends.ModelBackend",

    # `allauth` specific authentication methods, such as login by e-mail
    "allauth.account.auth_backends.AuthenticationBackend",
)


# Define available languages
# You only need to change this in very advanced setups.
gettext = lambda s: s
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

# The following adds a filter to remove 500 error in case of SuspiciousOperation. This is needed in Django 1.5 due to https://code.djangoproject.com/ticket/19866
from fiduswriter.logging_filter import skip_suspicious_operations
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse'
        },
        # Filter due to https://code.djangoproject.com/ticket/19866
        'skip_suspicious_operations': {
            '()': 'django.utils.log.CallbackFilter',
            'callback': skip_suspicious_operations,
        },
    },
    'handlers': {
        'mail_admins': {
            'level': 'ERROR',
            'filters': ['require_debug_false','skip_suspicious_operations'],
            'class': 'django.utils.log.AdminEmailHandler'
        }
    },
    'loggers': {
        'django.request': {
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

# Location of commonly used Js libraries. Here the local version is given. For deployment a version on the net is better.
JS_LOCATIONS = {
    'JQUERY_URL': STATIC_URL + 'js/libs/jquery-1.9.1.js',
    'JQUERYMIGRATE_URL': STATIC_URL + 'js/libs/jquery-migrate-1.1.1.js',
    'JQUERYUI_URL': STATIC_URL + 'js/libs/jquery-ui-1.10.1.custom.js',
    'UNDERSCOREJS_URL': STATIC_URL + 'js/libs/underscore-1.4.4-min.js',
    'MODERNIZR_URL': STATIC_URL + 'js/libs/modernizr.js',
    'MATHJAX_URL': STATIC_URL + 'js/libs/mathjax/MathJax.js',
    }

CSS_LOCATIONS = {
    }

try:
    exec open(os.path.join(PROJECT_PATH, 'configuration.py')) in globals()
except:
    pass

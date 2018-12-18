#############################################
# Django settings for Fidus Writer project. #
#############################################

# After copying this file to configuration.py, adjust the below settings to
# work with your setup.

# If you don't want to show debug messages, set DEBUG to False.

DEBUG = True

# Transpile JavaScript automatically when running the server. You might want to
# turn this off on a production server

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

# Whether anyone surfing to the site can open an account.
REGISTRATION_OPEN = True

MANAGERS = ADMINS

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'typewiser',
        'USER': 'jo',
        'PASSWORD': 'roccosiffredi',
        'HOST': 'localhost',
        'PORT': '',
    }
}


# DATABASES = {
#    'default': {
# Add 'postgresql_psycopg2', 'mysql', 'sqlite3' or 'oracle'.
#        'ENGINE': 'django.db.backends.',
# Or path to database file if using sqlite3.
#        'NAME': '',
# Not used with sqlite3.
#        'USER': '',
# Not used with sqlite3.
#        'PASSWORD': '',
# Set to empty string for localhost. Not used with sqlite3.
#        'HOST': '',
# Set to empty string for default. Not used with sqlite3.
#        'PORT': '',
# The max time in seconds a database connection should wait for a subsequent
# request.
#        'CONN_MAX_AGE': 15
#    }
# }

# Send emails using an SMTP server
# EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
# EMAIL_HOST = 'localhost'
# EMAIL_HOST_USER = ''
# EMAIL_HOST_PASSWORD = ''
# EMAIL_PORT = 25
# EMAIL_SUBJECT_PREFIX = '[Fidus Writer]'
# EMAIL_USE_TLS = False
# DEFAULT_FROM_EMAIL = 'mail@email.com' # For messages to end users
# SERVER_EMAIL = 'mail@email.com' # For messages to server administrators


# Make this unique, and don't share it with anybody. Change the default string.
SECRET_KEY = '2ouq2zgw5y-@w+t6!#zf#-z1inigg7$lg3p%8e3kkob1bf$#p4'


try:
    INSTALLED_APPS
except NameError:
    INSTALLED_APPS = ()

INSTALLED_APPS += (
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
    "fiduswriter_plugins.skin",
    # "fiduswriter_plugins.textAnalysis",
    "fiduswriter_plugins.client_info",
    "fiduswriter_plugins.session_data",
    "fiduswriter_plugins.review",
    #"fiduswriter_plugins.imagePos"
)

# A list of allowed hostnames of this Fidus Writer installation
ALLOWED_HOSTS = [
    'localhost',
]

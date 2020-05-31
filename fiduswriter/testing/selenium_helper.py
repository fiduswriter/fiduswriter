from builtins import range
from builtins import object
import re
import os

from django.test import Client
from selenium import webdriver
from allauth.account.models import EmailAddress
from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import User


class SeleniumHelper(object):
    """
    Methods for manipulating django and the browser for testing purposes.
    """

    @classmethod
    def get_drivers(cls, number, download_dir=False, user_agent=False):
        # django native clients, to be used for faster login.
        clients = []
        for i in range(number):
            clients.append(Client())
        drivers = []
        wait_time = 0
        options = webdriver.ChromeOptions()
        if download_dir:
            prefs = {
                "download.default_directory": download_dir,
                "download.prompt_for_download": False,
                "download.directory_upgrade": True
            }
            options.add_experimental_option("prefs", prefs)
        if user_agent:
            options.add_argument("user-agent={}".format(user_agent))
        if os.getenv("CI"):
            options.binary_location = '/usr/bin/google-chrome-stable'
            options.add_argument('--headless')
            options.add_argument('--disable-gpu')
            chromedriver_filename = '/home/travis/bin/chromedriver'
            os.environ["PATH"] += os.pathsep + '/home/travis/bin'
            wait_time = 10
        else:
            from chromedriver_binary import chromedriver_filename
            wait_time = 6
        for i in range(number):
            drivers.append(
                webdriver.Chrome(
                    chromedriver_filename,
                    options=options
                )
            )
        for driver in drivers:
            # Set sizes of browsers so that all buttons are visible.
            driver.set_window_position(0, 0)
            driver.set_window_size(1920, 1080)
        return {
            "clients": clients,
            "drivers": drivers,
            "wait_time": wait_time
        }

    def find_urls(self, string):
        return re.findall(
            (
                'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*(),]|'
                '(?:%[0-9a-fA-F][0-9a-fA-F]))+'
            ),
            string
        )

    # create django data
    def create_user(
        self,
        username='User',
        email='test@example.com',
        passtext='p4ssw0rd'
    ):
        user = User.objects.create(
            username=username,
            email=email,
            password=make_password(passtext),
            is_active=True
        )
        user.save()

        # avoid the unverified-email login trap
        EmailAddress.objects.create(
            user=user,
            email=email,
            verified=True,
            primary=True
        ).save()

        return user

    # drive browser
    def login_user(self, user, driver, client):
        client.force_login(user=user)
        cookie = client.cookies['sessionid']
        if driver.current_url == 'data:,':
            # To set the cookie at the right domain we load the front page.
            driver.get('%s%s' % (self.live_server_url, '/'))
        driver.add_cookie({
            'name': 'sessionid',
            'value': cookie.value,
            'secure': False,
            'path': '/'
        })

    def leave_site(self, driver):
        driver.get('data:,')

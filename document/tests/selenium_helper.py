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
    user = None
    username = 'User'
    email = 'test@example.com'
    passtext = 'p4ssw0rd'

    @classmethod
    def getDrivers(cls, number):
        # django native clients, to be used for faster login.
        clients = []
        for i in range(number):
            clients.append(Client())
        drivers = []
        wait_time = 0
        if os.getenv("SAUCE_USERNAME"):
            username = os.environ["SAUCE_USERNAME"]
            access_key = os.environ["SAUCE_ACCESS_KEY"]
            capabilities = {}
            if os.getenv("TRAVIS_BUILD_NUMBER"):
                capabilities["build"] = os.environ["TRAVIS_BUILD_NUMBER"]
                capabilities["tags"] = [
                    os.environ["TRAVIS_PYTHON_VERSION"],
                    "CI"
                ]
                capabilities["tunnel-identifier"] = os.environ[
                    "TRAVIS_JOB_NUMBER"
                ]

            capabilities["browserName"] = "chrome"
            hub_url = "%s:%s@localhost:4445" % (username, access_key)
            for i in range(number):
                drivers.append(
                    webdriver.Remote(
                        desired_capabilities=capabilities,
                        command_executor="http://%s/wd/hub" % hub_url
                    )
                )
            wait_time = 25
        else:
            for i in range(number):
                drivers.append(
                    webdriver.Chrome()
                )
            wait_time = 3
        for driver in drivers:
            # Set sizes of browsers so that all buttons are visible.
            driver.set_window_position(0, 0)
            driver.set_window_size(1024, 768)
        return {
            "clients": clients,
            "drivers": drivers,
            "wait_time": wait_time
        }

    # create django data
    def createUser(self):
        user = User.objects.create(
            username=self.username,
            password=make_password(self.passtext),
            is_active=True
        )
        user.save()

        # avoid the unverified-email login trap
        EmailAddress.objects.create(
            user=user,
            email=self.email,
            verified=True,
        ).save()

        return user

    # drive browser
    def loginUser(self, driver, client):
        client.force_login(user=self.user)
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

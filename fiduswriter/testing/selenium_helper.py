from builtins import object
import re
import os
import time


from allauth.account.models import EmailAddress
from django.contrib.auth.hashers import make_password
from django.contrib.auth import get_user_model


class SeleniumHelper(object):
    """
    Methods for manipulating django and the browser for testing purposes.
    """

    def find_urls(self, string):
        return re.findall(
            (
                "http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*(),]|"
                "(?:%[0-9a-fA-F][0-9a-fA-F]))+"
            ),
            string,
        )

    # create django data
    def create_user(
        self, username="User", email="test@example.com", passtext="p4ssw0rd"
    ):
        User = get_user_model()
        user = User.objects.create(
            username=username,
            email=email,
            password=make_password(passtext),
            is_active=True,
        )
        user.save()

        # avoid the unverified-email login trap
        EmailAddress.objects.create(
            user=user, email=email, verified=True, primary=True
        ).save()

        return user

    # drive browser
    def login_user(self, user, driver, client):
        client.force_login(user=user)
        cookie = client.cookies["sessionid"]
        if driver.current_url == "data:,":
            # To set the cookie at the right domain we load the front page.
            driver.get("%s%s" % (self.live_server_url, "/"))
        driver.add_cookie(
            {
                "name": "sessionid",
                "value": cookie.value,
                "secure": False,
                "path": "/",
            }
        )

    def wait_until_file_exists(self, path, wait_time):
        count = 0
        while not os.path.exists(path):
            time.sleep(1)
            count += 1
            if count > wait_time:
                break

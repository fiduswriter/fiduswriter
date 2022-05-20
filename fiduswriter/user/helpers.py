from django.conf import settings
from avatar.utils import get_username
from avatar.providers import PrimaryAvatarProvider


class Avatars:
    def __init__(self):
        self.AVATARS = {}

    def get_url(self, user):
        if user.id not in self.AVATARS:
            username = get_username(user)
            self.AVATARS[user.id] = PrimaryAvatarProvider.get_avatar_url(
                username, settings.AVATAR_DEFAULT_SIZE
            )
        return self.AVATARS[user.id]

from django.conf import settings
from asgiref.sync import sync_to_async
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

    async def get_url_async(self, user):
        """Asynchronous method to get avatar URL"""
        if user.id not in self.AVATARS:
            # Get username might involve DB access, so make it async
            username = await sync_to_async(get_username)(user)

            # Avatar URL generation might also involve DB or external calls
            avatar_url = await sync_to_async(
                PrimaryAvatarProvider.get_avatar_url
            )(username, settings.AVATAR_DEFAULT_SIZE)

            self.AVATARS[user.id] = avatar_url

        return self.AVATARS[user.id]

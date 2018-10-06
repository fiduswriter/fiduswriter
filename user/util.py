from avatar.utils import get_primary_avatar, get_default_avatar_url


def get_user_avatar_url(user):
    avatar = get_primary_avatar(user, 80)
    if avatar:
        return {
            'url': avatar.avatar_url(80),
            'uploaded': True
        }
    else:
        return {
            'url': get_default_avatar_url(),
            'uploaded': False
        }

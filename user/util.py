

from avatar.utils import get_primary_avatar, get_default_avatar_url


def get_user_avatar_url(user):
    the_avatar = get_primary_avatar(user, 80)
    if the_avatar:
        the_avatar = the_avatar.avatar_url(80)
    else:
        the_avatar = get_default_avatar_url()
    return the_avatar

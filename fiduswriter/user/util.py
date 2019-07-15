from avatar.utils import get_primary_avatar, get_default_avatar_url


def string_to_color(username):
    hash = 0
    for ch in username:
        hash = ord(ch) + ((hash << 5) - hash)

    r = str((hash >> (0 * 8)) & 255)
    g = str((hash >> (1 * 8)) & 255)
    b = str((hash >> (2 * 8)) & 255)

    return 'rgb(' + r + ',' + g + ',' + b + ')'


def get_user_avatar_url(user):
    avatar = get_primary_avatar(user, 80)
    if avatar:
        url = avatar.avatar_url(80)
        return {
            'url': url,
            'uploaded': True,
            'html': (
                '<img class="fw-avatar" src="' +
                url +
                '" alt="' + user.username + '">'
            )
        }
    else:
        cl = string_to_color(user.username)
        return {
            'url': get_default_avatar_url(),
            'uploaded': False,
            'html': (
                '<span class="fw-string-avatar" style="background-color: ' +
                cl +
                ';"><span>' +
                user.username[0] +
                '</span></span>'
            )
        }

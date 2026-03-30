from django.utils import timezone
from document.models import ShareToken


def get_token_access(token_str):
    """
    Look up a share token and return (document, rights) if valid,
    or (None, None) if the token is unknown, inactive, or expired.
    """
    share_token = (
        ShareToken.objects.select_related("document")
        .filter(
            token=token_str,
            is_active=True,
        )
        .first()
    )
    if not share_token:
        return None, None

    if share_token.expires_at and share_token.expires_at < timezone.now():
        return None, None

    return share_token.document, share_token.rights

import uuid

from django.utils import timezone
from document.models import ShareToken

# Namespace for deriving the non-secret guest participant id.
GUEST_ID_NAMESPACE = uuid.uuid5(
    uuid.NAMESPACE_URL, "https://fiduswriter.org/guest-id"
)


def guest_participant_id(token_str, document_id):
    """A non-secret participant identifier for share token guests.

    Guests are identified by this value in participant lists, chat and
    stored comments — never by the secret share token UUID. It is derived
    one-way from the token and the document id: it cannot be turned back
    into the token, and replaying it (e.g. as a token value) can never
    authenticate anything, because authentication always requires the
    token itself.
    """
    return str(uuid.uuid5(GUEST_ID_NAMESPACE, f"{token_str}:{document_id}"))


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

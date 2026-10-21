"""per-recipient filtering of comment data.

Comment updates travel inside the ``cu`` field of diff messages, which
the live broadcast and catch-up paths used to relay verbatim. Comment
content must be filtered for recipients whose access rights restrict
them (``read-without-comments`` never sees comments; ``review`` and
``review-tracked`` only see their own).
"""

from copy import deepcopy

OWN_COMMENTS_ONLY_RIGHTS = ("review", "review-tracked")


def _entry_visible(entry, user_id, doc_comments):
    if not isinstance(entry, dict):
        return False
    if str(entry.get("user")) == str(user_id):
        return True
    if entry.get("assignedUser") is not None and str(
        entry.get("assignedUser")
    ) == str(user_id):
        return True
    if entry.get("type") == "delete":
        stored = None
        if isinstance(doc_comments, dict):
            stored = doc_comments.get(entry.get("id"))
        if stored is None:
            return True
        return str(stored.get("user")) == str(user_id)
    return False


def filter_comments_dict(comments, rights, user_id, e2ee=False):
    if e2ee or not isinstance(comments, dict):
        return comments
    if rights == "read-without-comments":
        return []
    if rights in OWN_COMMENTS_ONLY_RIGHTS:
        return {
            key: value
            for key, value in comments.items()
            if _entry_visible(value, user_id, comments)
        }
    return comments


def filter_cu_list(cu, rights, user_id, doc_comments):
    """Returns the filtered list, or None when the cu field must be
    dropped entirely for this recipient."""
    if rights == "read-without-comments":
        return None
    if rights in OWN_COMMENTS_ONLY_RIGHTS:
        return [
            deepcopy(entry)
            for entry in cu
            if isinstance(entry, dict)
            and _entry_visible(entry, user_id, doc_comments)
        ]
    return cu


def sanitize_diff_message(message, rights, user_id, doc_comments):
    """Return a recipient-appropriate copy of a diff message."""
    if "cu" not in message:
        return message
    filtered = filter_cu_list(
        list(message["cu"]), rights, user_id, doc_comments
    )
    msg_to_send = deepcopy(message)
    if filtered is None:
        msg_to_send.pop("cu", None)
    else:
        msg_to_send["cu"] = filtered
    return msg_to_send

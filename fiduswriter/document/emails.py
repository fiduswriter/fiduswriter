from django.core.mail import send_mail
from django.conf import settings
from django.utils.translation import gettext as _

from base.html_email import html_email


def send_share_notification(
    document_title,
    owner,
    link,
    collaborator_name,
    collaborator_email,
    rights,
    change,
):
    if len(document_title) == 0:
        document_title = _("Untitled")
    if change:
        message_text = _(
            "Hey %(collaborator_name)s,\n%(owner)s has changed your access "
            "rights to %(rights)s on the document '%(document_title)s'. "
            "\nOpen the document: %(link)s"
        ) % {
            "owner": owner,
            "rights": rights,
            "collaborator_name": collaborator_name,
            "link": link,
            "document_title": document_title,
        }
        body_html_intro = _(
            "<p>Hey %(collaborator_name)s,<br>%(owner)s has changed your "
            "access rights to %(rights)s on the document "
            "'%(document_title)s'.</p>"
        ) % {
            "owner": owner,
            "rights": rights,
            "collaborator_name": collaborator_name,
            "document_title": document_title,
        }
    else:
        message_text = _(
            "Hey %(collaborator_name)s,\n%(owner)s has shared the document "
            "'%(document_title)s' with you and given you %(rights)s access "
            "rights. "
            "\nOpen document: %(link)s"
        ) % {
            "owner": owner,
            "rights": rights,
            "collaborator_name": collaborator_name,
            "link": link,
            "document_title": document_title,
        }
        body_html_intro = _(
            "<p>Hey %(collaborator_name)s,<br>%(owner)s has shared the "
            "document '%(document_title)s' with you and given you "
            "%(rights)s access rights.</p>"
        ) % {
            "owner": owner,
            "rights": rights,
            "collaborator_name": collaborator_name,
            "document_title": document_title,
        }

    body_html = (
        "<h1>%(document_title)s %(shared)s</h1>"
        "%(body_html_intro)s"
        "<table>"
        "<tr><td>"
        "%(Document)s"
        "</td><td>"
        "<b>%(document_title)s</b>"
        "</td></tr>"
        "<tr><td>"
        "%(Author)s"
        "</td><td>"
        "%(owner)s"
        "</td></tr>"
        "<tr><td>"
        "%(AccessRights)s"
        "</td><td>"
        "%(rights)s"
        "</td></tr>"
        "</table>"
        '<div class="actions"><a class="button" href="%(link)s">'
        "%(AccessTheDocument)s"
        "</a></div>"
    ) % {
        "shared": _("shared"),
        "body_html_intro": body_html_intro,
        "Document": _("Document"),
        "document_title": document_title,
        "Author": _("Author"),
        "owner": owner,
        "AccessRights": _("Access Rights"),
        "rights": rights,
        "link": link,
        "AccessTheDocument": _("Access the document"),
    }
    send_mail(
        _("Document shared: %(document_title)s")
        % {"document_title": document_title},
        message_text,
        settings.DEFAULT_FROM_EMAIL,
        [collaborator_email],
        fail_silently=True,
        html_message=html_email(body_html),
    )


def send_comment_notification(
    notification_type,
    commentator,
    collaborator_name,
    collaborator_email,
    link,
    document_title,
    comment_text,
    comment_html,
):
    if notification_type == "mention":
        message_text = _(
            "Hey %(collaborator_name)s,\n%(commentator)s has mentioned you "
            "in a comment in the document '%(document)s':"
            "\n\n%(comment_text)s"
            "\n\nGo to the document here: %(link)s"
        ) % {
            "commentator": commentator,
            "collaborator_name": collaborator_name,
            "link": link,
            "document": document_title,
            "comment_text": comment_text,
        }

        body_html_title = _(
            "Hey %(collaborator_name)s,<br>%(commentator)s has mentioned "
            "you in a comment in the document '%(document_title)s'."
        ) % {
            "commentator": commentator,
            "collaborator_name": collaborator_name,
            "document_title": document_title,
        }
        message_title = _("Comment on : %(document_title)s") % {
            "document_title": document_title
        }
    else:
        message_text = _(
            "Hey %(collaborator_name)s,\n%(commentator)s has assigned you to "
            "a comment in the document '%(document)s':\n\n%(comment_text)s"
            "\n\nGo to the document here: %(link)s"
        ) % {
            "commentator": commentator,
            "collaborator_name": collaborator_name,
            "link": link,
            "document": document_title,
            "comment_text": comment_text,
        }
        body_html_title = _(
            "Hey %(collaborator_name)s,<br>%(commentator)s has assigned you "
            "to a comment in the document '%(document_title)s'."
        ) % {
            "commentator": commentator,
            "collaborator_name": collaborator_name,
            "document_title": document_title,
        }
        message_title = _("Comment assignment on : %(document_title)s") % {
            "document_title": document_title
        }

    body_html = _(
        "<p>Hey %(collaborator_name)s,<br>%(commentator)s has assigned "
        "you to a comment in the document '%(document)s':</p>"
        "%(comment_html)s"
        '<p>Go to the document <a href="%(link)s">here</a>.</p>'
    ) % {
        "commentator": commentator,
        "collaborator_name": collaborator_name,
        "link": link,
        "document": document_title,
        "comment_html": comment_html,
    }

    body_html = (
        "<h1>%(body_html_title)s</h1>"
        "<table>"
        "<tr><td>"
        "%(Document)s"
        "</td><td>"
        "<b>%(document_title)s</b>"
        "</td></tr>"
        "<tr><td>"
        "%(Author)s"
        "</td><td>"
        "%(commentator)s"
        "</td></tr>"
        "<tr><td>"
        "%(Comment)s"
        "</td><td>"
        "%(comment_html)s"
        "</td></tr>"
        "</table>"
        '<div class="actions"><a class="button" href="%(link)s">'
        "%(AccessTheDocument)s"
        "</a></div>"
    ) % {
        "body_html_title": body_html_title,
        "Document": _("Document"),
        "document_title": document_title,
        "Author": _("Author"),
        "commentator": commentator,
        "Comment": _("Comment"),
        "comment_html": comment_html,
        "link": link,
        "AccessTheDocument": _("Access the document"),
    }
    send_mail(
        message_title,
        message_text,
        settings.DEFAULT_FROM_EMAIL,
        [collaborator_email],
        fail_silently=True,
        html_message=html_email(body_html),
    )


def send_access_request_notification(
    document_title,
    requester_name,
    requester_email,
    owner_name,
    owner_email,
    link,
    requested_rights,
):
    if len(document_title) == 0:
        document_title = _("Untitled")

    message_text = _(
        "Hey %(owner_name)s,\n%(requester_name)s has requested %(rights)s "
        "access to the document '%(document_title)s'. "
        "\nOpen the document to grant access: %(link)s"
    ) % {
        "owner_name": owner_name,
        "requester_name": requester_name,
        "rights": requested_rights,
        "document_title": document_title,
        "link": link,
    }

    body_html_intro = _(
        "<p>Hey %(owner_name)s,<br>%(requester_name)s has requested "
        "%(rights)s access to the document '%(document_title)s'.</p>"
    ) % {
        "owner_name": owner_name,
        "requester_name": requester_name,
        "rights": requested_rights,
        "document_title": document_title,
    }

    body_html = (
        "<h1>%(document_title)s %(access_request)s</h1>"
        "%(body_html_intro)s"
        "<table>"
        "<tr><td>"
        "%(Document)s"
        "</td><td>"
        "<b>%(document_title)s</b>"
        "</td></tr>"
        "<tr><td>"
        "%(RequestedBy)s"
        "</td><td>"
        "%(requester_name)s"
        "</td></tr>"
        "<tr><td>"
        "%(RequestedRights)s"
        "</td><td>"
        "%(requested_rights)s"
        "</td></tr>"
        "</table>"
        '<div class="actions"><a class="button" href="%(link)s">'
        "%(GrantAccess)s"
        "</a></div>"
    ) % {
        "access_request": _("access request"),
        "body_html_intro": body_html_intro,
        "Document": _("Document"),
        "document_title": document_title,
        "RequestedBy": _("Requested by"),
        "requester_name": requester_name,
        "RequestedRights": _("Requested rights"),
        "requested_rights": requested_rights,
        "link": link,
        "GrantAccess": _("Grant access"),
    }

    send_mail(
        _("Access request: %(document_title)s")
        % {"document_title": document_title},
        message_text,
        settings.DEFAULT_FROM_EMAIL,
        [owner_email],
        fail_silently=True,
        html_message=html_email(body_html),
    )

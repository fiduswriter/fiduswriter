import bleach
from django.template import loader


def html_email(body_html):
    body_html = bleach.clean(
        body_html,
        tags=['p', 'br', 'a', 'strong', 'em'],
        attributes={
            'a': ['href']
        },
        strip=True
    )
    html_string = loader.render_to_string(
        'email.html',
        {'body_html': body_html}
    )
    return html_string

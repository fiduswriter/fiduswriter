from allauth.account.adapter import DefaultAccountAdapter
from allauth.utils import build_absolute_uri


class AccountAdapter(DefaultAccountAdapter):

    def get_email_confirmation_url(self, request, emailconfirmation):
        """Constructs the email confirmation (activation) url.
        Note that if you have architected your system such that email
        confirmations are sent outside of the request context `request`
        can be `None` here.
        """
        url = '/account/confirm-email/{}/'.format(emailconfirmation.key)
        ret = build_absolute_uri(
            request,
            url)
        return ret

    def send_mail(self, template_prefix, email, context):
        if template_prefix == 'account/email/password_reset_key':
            # We replace the password reset URL to avoid a '/api' in the URL.
            key = context['password_reset_url'].split('/')[-2]
            url = '/account/change-password/{}/'.format(key)
            context['password_reset_url'] = build_absolute_uri(
                context['request'],
                url)
        return super(AccountAdapter, self).send_mail(
            template_prefix,
            email,
            context
        )

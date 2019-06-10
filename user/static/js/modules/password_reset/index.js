import {escapeText, post} from "../common"
import {PreloginPage} from "../prelogin"

export class PasswordReset extends PreloginPage {
    constructor({app, isFree, language, registrationOpen, contactEmail, staticUrl}) {
        super({app, isFree, language, registrationOpen, staticUrl})
        this.contactEmail = contactEmail
        this.title = gettext('Reset Password')
        // Note: We do not currently support plugins targetting only the reset password page
    }

    render() {
        this.contents = `<div class="fw-login-left">
            <h1 class="fw-login-title">${gettext('Password reset')}</h1>
            <p>${gettext('Forgotten your password? Enter your e-mail address in the form, and we\'ll send you an e-mail allowing you to reset it.')}</p>
            <p>${
                interpolate(
                    gettext('If you have any trouble resetting your password, please <a href="mailto:%(contactEmail)s">contact us</a>.'),
                    {contactEmail: this.contactEmail},
                    true
                )
            }</p>
        </div>
        <div class="fw-login-right">
            <ul id="non_field_errors" class="errorlist"></ul>
            <div class="input-wrapper">
                <label for="id_email">${gettext('E-mail address')}</label>
                <input type="email" name="email" size="30" placeholder="${gettext('E-mail address')}" required="" id="id_email">
                <ul id="id_email_errors" class="errorlist"></ul>
            </div>
            <div class="submit-wrapper">
                <button class="fw-button fw-dark fw-uppercase" id="email-submit" type="submit">${gettext("Reset My Password")}</button>
            </div>
        </div>`
        super.render()
    }

    bind() {
        super.bind()

        const emailInput = document.getElementById('id_email')
        if (emailInput) {
            emailInput.focus()
        }

        document.getElementById('email-submit').addEventListener('click', () => {
            document.querySelector('#non_field_errors').innerHTML = ''
            document.querySelector('#id_email_errors').innerHTML = ''

            const email = document.getElementById('id_email').value
            if (!email.length) {
                document.querySelector('#id_email_errors').innerHTML = `<li>${gettext('This field is required.')}</li>`
                return
            }
            post('/account/password/reset/', {email}).then(
                () => document.querySelector('.fw-login-right').innerHTML = `<p>${gettext('Thanks! Please check your email for instructions on how to reset your password.')}</p>`
            ).catch(
                response => response.json().then(
                    json => {
                        json.form.errors.forEach(
                            error => document.querySelector("#non_field_errors").innerHTML += `<li>${escapeText(error)}</li>`
                        )
                        json.form.fields.email.errors.forEach(
                            error => document.querySelector('#id_email_errors').innerHTML += `<li>${escapeText(error)}</li>`
                        )
                    }
                )
            )
        })

    }
}

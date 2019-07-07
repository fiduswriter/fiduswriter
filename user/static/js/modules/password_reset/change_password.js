import {escapeText, post, get} from "../common"
import {PreloginPage} from "../prelogin"

export class PasswordResetChangePassword extends PreloginPage {
    constructor({app, isFree, language, registrationOpen, contactEmail, staticUrl}, key = false) {
        super({app, isFree, language, registrationOpen, staticUrl})
        this.contactEmail = contactEmail
        this.title = gettext('Change Password')
        this.key = key
        // Note: We do not currently support plugins targetting only the reset password page
    }

    render() {
        this.contents = `<div class="fw-login-left">
            <h1 class="fw-login-title">${gettext('Change password')}</h1>
            <p>${gettext('You have indicated that you have forgotten your password. Please enter your new password in the form twice.')}</p>
        </div>
        <div class="fw-login-right">
            <form>
                <ul id="non_field_errors" class="errorlist"></ul>
                <div class="input-wrapper">
                    <label for="id_password1">${gettext('Create a password')}</label>
                    <input type="password" name="password1" placeholder="${gettext('Password')}" required="" id="id_password1" autocomplete="new-password">
                    <ul id="id_password1_errors" class="errorlist"></ul>
                </div>
                <div class="input-wrapper">
                    <label for="id_password2">${gettext('Confirm your password')}</label>
                    <input type="password" name="password2" placeholder="${gettext('Password (again)')}" required="" id="id_password2" autocomplete="new-password">
                    <ul id="id_password2_errors" class="errorlist"></ul>
                </div>
                <div class="submit-wrapper">
                    <button class="fw-button fw-dark fw-uppercase" id="change-password-submit" type="submit">${gettext("Change My Password")}</button>
                </div>
            </form>
        </div>`
        super.render()
    }

    bind() {
        super.bind()

        // We remove the key from the URL to prevent leakage.
        window.history.replaceState({}, "", '/account/change-password/')

        const passwordInput = document.getElementById('id_password1')
        if (passwordInput) {
            passwordInput.focus()
        }

        document.getElementById('change-password-submit').addEventListener('click', event => {
            event.preventDefault()
            document.querySelector('#non_field_errors').innerHTML = ''
            document.querySelector('#id_password1_errors').innerHTML = ''
            document.querySelector('#id_password2_errors').innerHTML = ''

            const password1 = document.getElementById('id_password1').value,
                password2 = document.getElementById('id_password2').value
            let errors = false
            if (!password1.length) {
                document.querySelector('#id_password1_errors').innerHTML = `<li>${gettext('This field is required.')}</li>`
                errors = true
            }
            if (!password2.length) {
                document.querySelector('#id_password2_errors').innerHTML = `<li>${gettext('This field is required.')}</li>`
                errors = true
            }
            if (password1 !== password2) {
                document.querySelector('#id_password2_errors').innerHTML = `<li>${gettext('You must type the same password each time.')}</li>`
                errors = true
            }

            if (errors) {
                return
            }
            get(`/api/account/password/reset/key/${this.key}/`).then(
                () => post('/api/account/password/reset/key/2-set-password/', {password1, password2})
            ).then(
                () => document.querySelector('.fw-contents').innerHTML = document.querySelector('.fw-contents').innerHTML =
                    `<div class="fw-login-left">
                        <h1 class="fw-login-title">${gettext('Password reset')}</h1>
                        <p>
                            ${
                                gettext('Your password has been reset and you can now log in with the new password.')
                            }
                        </p>
                    </div>`
            ).catch(
                response => response.json().then(
                    json => {
                        json.form.errors.forEach(
                            error => document.querySelector("#non_field_errors").innerHTML += `<li>${escapeText(error)}</li>`
                        )
                        if (json.form.fields.password1) {
                            json.form.fields.password1.errors.forEach(
                                error => document.querySelector('#id_password1_errors').innerHTML += `<li>${escapeText(error)}</li>`
                            )
                        }
                        if (json.form.fields.password2) {
                            json.form.fields.password2.errors.forEach(
                                error => document.querySelector('#id_password2_errors').innerHTML += `<li>${escapeText(error)}</li>`
                            )
                        }
                    }
                )
            )
        })

    }
}

import {escapeText, post} from "../common"
import {PreloginPage} from "../prelogin"

export class Signup extends PreloginPage {
    constructor({app, isFree, language, registrationOpen, staticUrl}) {
        super({app, isFree, language, registrationOpen, staticUrl})
        this.title = gettext('Signup')
        this.registrationOpen = registrationOpen
        this.headerLinks = [
            {
                type: 'button',
                text: gettext('Log in'),
                link: '/'
            }
        ]
        if (this.registrationOpen) {
            this.contents = `<div class="fw-login-left">
                <h1 class="fw-login-title">${gettext("Sign up")}</h1>
                <p>
                    ${
                        gettext('Already have an account? Then please <a href="/" title="Login">login</a>.')
                    }
                </p>
            </div>
            <div class="fw-login-right">
                <form>
                    <ul id="non_field_errors" class="errorlist"></ul>
                    <div class="input-wrapper">
                        <label for="id_username">${gettext('Choose your username')}</label>
                        <input type="text" name="username" placeholder="${gettext('Username')}" autofocus="autofocus" minlength="1" maxlength="150" required="" id="id_username" autocomplete="username">
                        <ul id="id_username_errors" class="errorlist"></ul>
                    </div>
                    <div class="input-wrapper">
                        <label for="id_password1">${gettext('Create a password')}</label>
                        <input type="password" name="password1" placeholder="${gettext('Password')}" required="" id="id_password1" autocomplete="new-password">
                        <ul id="id_password1_errors" class="errorlist"></ul>
                    </div>
                    <div class="input-wrapper">
                        <label for="id_password2">${gettext('Confirm your password')}</label>
                        <input type="password" name="password2" placeholder="${gettext('Password (again)')}'" required="" id="id_password2" autocomplete="new-password">
                        <ul id="id_password2_errors" class="errorlist"></ul>
                    </div>
                    <div class="input-wrapper">
                        <label for="id_email">${gettext('E-mail address')}</label>
                        <input type="email" name="email" placeholder="${gettext('E-mail address')}" required="" id="id_email" autocomplete="email">
                        <ul id="id_email_errors" class="errorlist"></ul>
                    </div>
                    <div class="submit-wrapper">
                        <button class="fw-button fw-dark fw-uppercase" id="signup-submit" type="submit">${gettext('Sign up')}</button>
                    </div>
                </form>
            </div>`
        } else {
            this.contents = `<div class="fw-login-left">
                <h1 class="fw-login-title">${gettext("Sign Up Closed")}</h1>
                <p>${gettext("We are sorry, but the sign up is currently closed.")}</p>
            </div>`
        }

        // Note: We do not currently support plugins targetting only the signup page
    }

    bind() {
        super.bind()

        if (!this.registrationOpen) {
            return
        }

        document.getElementById('signup-submit').addEventListener('click', event => {
            event.preventDefault()

            document.querySelector('#non_field_errors').innerHTML = ''
            document.querySelector('#id_username_errors').innerHTML = ''
            document.querySelector('#id_password1_errors').innerHTML = ''
            document.querySelector('#id_password2_errors').innerHTML = ''
            document.querySelector('#id_email_errors').innerHTML = ''

            const username = document.getElementById('id_username').value,
                password1 = document.getElementById('id_password1').value,
                password2 = document.getElementById('id_password2').value,
                email = document.getElementById('id_email').value
            let errors = false
            if (!username.length) {
                document.querySelector('#id_username_errors').innerHTML = `<li>${gettext('This field is required.')}</li>`
                errors = true
            }
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
            if (!email.length) {
                document.querySelector('#id_email_errors').innerHTML = `<li>${gettext('This field is required.')}</li>`
                errors = true
            }
            if (errors) {
                return
            }
            post('/api/account/signup/', {username, password1, password2, email}).then(
                () => document.querySelector('.fw-contents').innerHTML =
                    `<div class="fw-login-left">
                        <h1 class="fw-login-title">${gettext('Verify Your E-mail Address')}</h1>
                        <p>
                            ${
                                interpolate(
                                    gettext('We have sent an e-mail to <a href="mailto:%(email)s">%(email)s</a> for verification. Follow the link provided to finalize the signup process.'),
                                    {email},
                                    true
                                )
                            }
                            <br />
                            ${
                                gettext('Please contact us if you do not receive it within a few minutes.')
                            }
                        </p>
                    </div>`
            ).catch(
                response => response.json().then(
                    json => {
                        json.form.errors.forEach(
                            error => document.querySelector("#non_field_errors").innerHTML += `<li>${escapeText(error)}</li>`
                        )
                        json.form.fields.username.errors.forEach(
                            error => document.querySelector('#id_username_errors').innerHTML += `<li>${escapeText(error)}</li>`
                        )
                        json.form.fields.password1.errors.forEach(
                            error => document.querySelector('#id_password1_errors').innerHTML += `<li>${escapeText(error)}</li>`
                        )
                        json.form.fields.password2.errors.forEach(
                            error => document.querySelector('#id_password2_errors').innerHTML += `<li>${escapeText(error)}</li>`
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

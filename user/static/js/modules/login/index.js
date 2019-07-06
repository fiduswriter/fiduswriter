import {loginUser, escapeText} from "../common"
import * as pluginLoaders from "../../plugins/login"
import {PreloginPage} from "../prelogin"

export class LoginPage extends PreloginPage {
    constructor({app, isFree, language, registrationOpen, socialaccountProviders, staticUrl}) {
        super({app, isFree, language, registrationOpen, staticUrl})
        this.socialaccountProviders = socialaccountProviders
        this.title = gettext('Login')
        this.pluginLoaders = pluginLoaders
        this.headerLinks = [
            {
                type: 'label',
                text: gettext('New here?')
            },
            {
                type: 'button',
                text: gettext('Sign up'),
                link: '/account/sign-up/'
            }
        ]
    }

    render() {
        this.contents = `<div class="fw-login-left">
            <h1 class="fw-login-title">${gettext("Log in")}</h1>
            ${
                this.registrationOpen ?
                    `<p>${gettext("If you are new here, please <a href='/account/sign-up/' title='Sign up'>sign up</a> or use one of the login options below to create an account.")}</p>` +
                    (
                        this.socialaccountProviders.length ?
                        `<div class="socialaccount_ballot">
                            <ul class="socialaccount_providers">
                            ${
                                this.socialaccountProviders.map(
                                    provider => `<li>
                                        <a title="${provider.name}" class="fw-button fw-socialaccount fw-${provider.id}"
                                            href="${provider.login_url}">
                                            <span class="fab fa-${provider.id}"></span>
                                            ${gettext("Login with")} ${provider.name}
                                        </a>
                                    </li>`
                                ).join('')
                            }
                            </ul>
                        </div>` :
                        ''
                    )
                         :
                        ''
            }
        </div>
        <div class="fw-login-right">
            <form>
                <ul id="non_field_errors" class="errorlist"></ul>
                <div class="input-wrapper">
                    <label for="id_login">${gettext("Username")}</label>
                    <input type="text" name="login" placeholder="${gettext("Username or e-mail")}" autofocus="autofocus" required="" id="id_login" autocomplete="username email">
                    <ul id="id_login_errors" class="errorlist"></ul>
                </div>
                <div class="input-wrapper">
                    <label for="id_password">${gettext("Password")}</label>
                    <input type="password" name="password" placeholder="${gettext("Password")}" required="" id="id_password" autocomplete="current-password">
                    <ul id="id_password_errors" class="errorlist"></ul>
                </div>
                <div class="submit-wrapper">
                    <button class="fw-button fw-dark fw-uppercase" type="submit" id="login-submit">${gettext("Log in")}</button>
                    <br>
                    <input type="checkbox" name="remember" id="id_remember">
                    <label for="id_remember">${gettext("Remember me")}</label>
                </div>
                <a id="lost-passwd" href="/account/password-reset/">${gettext("Forgot Password?")}</a>
            </form>
        </div>`
        super.render()
    }

    bind() {
        super.bind()
        const socialButtons = document.body.querySelectorAll('.fw-button.fw-socialaccount')
        let btnWidth = 1

        socialButtons.forEach(
            button => {
                const theWidth = button.clientWidth
                if (btnWidth < theWidth) {
                    btnWidth = theWidth
                }
            }
        )
        btnWidth += 15
        socialButtons.forEach(
            button => button.style.width = `${btnWidth}px`
        )

        if (!this.registrationOpen) {
            return
        }

        document.getElementById('login-submit').addEventListener('click', event => {
            event.preventDefault()
            document.querySelector('#non_field_errors').innerHTML = ''
            document.querySelector('#id_login_errors').innerHTML = ''
            document.querySelector('#id_password_errors').innerHTML = ''

            const login = document.getElementById('id_login').value,
                password = document.getElementById('id_password').value,
                remember = document.getElementById('id_remember').checked
            let errors = false
            if (!login.length) {
                document.querySelector('#id_login_errors').innerHTML = `<li>${gettext('This field is required.')}</li>`
                errors = true
            }
            if (!password.length) {
                document.querySelector('#id_password_errors').innerHTML = `<li>${gettext('This field is required.')}</li>`
                errors = true
            }
            if (errors) {
                return
            }
            return loginUser(this.app.config, login, password, remember).then(
                () => this.app.init()
            ).catch(
                response => response.json().then(
                    json => {
                        json.form.errors.forEach(
                            error => document.querySelector("#non_field_errors").innerHTML += `<li>${escapeText(error)}</li>`
                        )
                        json.form.fields.login.errors.forEach(
                            error => document.querySelector('#id_login_errors').innerHTML += `<li>${escapeText(error)}</li>`
                        )
                        json.form.fields.password.errors.forEach(
                            error => document.querySelector('#id_password_errors').innerHTML += `<li>${escapeText(error)}</li>`
                        )
                    }
                )
            )
        })
    }
}

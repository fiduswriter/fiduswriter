import {whenReady, basePreloginTemplate, ensureCSS, setDocTitle, setLanguage, loginUser} from "../common"
import * as plugins from "../../plugins/login"
import {FeedbackTab} from "../feedback"

export class LoginPage {
    constructor({app, isFree, language, registrationOpen, socialaccountProviders, staticUrl}) {
        this.app = app
        this.isFree = isFree
        this.language = language
        this.registrationOpen = registrationOpen
        this.socialaccountProviders = socialaccountProviders
        this.staticUrl = staticUrl
    }

    init() {
        whenReady().then(() => {
            this.render()
            this.activateFidusPlugins()
            this.bind()
        })
    }

    render() {
        document.body = document.createElement('body')
        document.body.innerHTML = basePreloginTemplate({
            isFree: this.isFree,
            language: this.language,
            contents: `<div class="fw-login-left">
                <h1 class="fw-login-title">${gettext("Log in")}</h1>
                ${
                    this.registrationOpen ?
                        `<p>${gettext("If you are new here, please <a href='/account/signup/' title='Sign up'>sign up</a> or use one of the login options below to create an account.")}</p>` +
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
                <div id="non_field_errors"></div>
                <div class="input-wrapper">
                    <label for="id_login">${gettext("Username")}</label>
                    <input type="text" name="login" placeholder="${gettext("Username or e-mail")}" autofocus="autofocus" required="" id="id_login">
                </div>
                <div class="input-wrapper">
                    <label for="id_password">${gettext("Password")}</label>
                    <input type="password" name="password" placeholder="${gettext("Password")}" required="" id="id_password">
                </div>
                <div class="submit-wrapper">
                    <button class="fw-button fw-dark fw-uppercase" type="submit" id="login-submit">${gettext("Log in")}</button>
                    <br>
                    <input type="checkbox" name="remember" id="id_remember">
                    <label for="id_remember">${gettext("Remember me")}</label>
                </div>
                    <a id="lost-passwd" href="/account/password/reset/">${gettext("Forgot Password?")}</a>
                </form>
            </div>`,
            staticUrl: this.staticUrl
        })
        ensureCSS([
            'prelogin.css'
        ], this.staticUrl)
        setDocTitle(gettext('Login'), this.app)
        const feedbackTab = new FeedbackTab({staticUrl: this.staticUrl})
        feedbackTab.init()
    }

    activateFidusPlugins() {
        // Add plugins.
        this.plugins = {}

        Object.keys(plugins).forEach(plugin => {
            if (typeof plugins[plugin] === 'function') {
                this.plugins[plugin] = new plugins[plugin]({page: this, staticUrl: this.staticUrl})
                this.plugins[plugin].init()
            }
        })
    }

    bind() {
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

        document.getElementById('lang-selection').addEventListener('change', event => {
            this.language = event.target.value
            return setLanguage(this.app.config, this.language).then(
                () => this.init()
            )
        })

        document.getElementById('login-submit').addEventListener('click', () => {
            const login = document.getElementById('id_login').value,
                password = document.getElementById('id_password').value,
                remember = document.getElementById('id_remember').checked
            return loginUser(this.app.config, login, password, remember).then(
                () => this.app.init()
            )
        })
    }
}

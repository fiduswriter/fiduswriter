import {BibliographyOverview} from "../bibliography/overview"
import {DocumentOverview} from "../documents/overview"
import {DocumentInvite} from "../documents/invite"
import {ImageOverview} from "../images/overview"
import {ContactsOverview} from "../contacts"
import {Profile} from "../profile"
import {getUserInfo, findTarget, WebSocketConnector, showSystemMessage} from "../common"
import {LoginPage} from "../login"
import {EmailConfirm} from "../email_confirm"
import {PasswordResetRequest, PasswordResetChangePassword} from "../password_reset"
import {Signup} from "../signup"
import {ImageDB} from "../images/database"
import {BibliographyDB} from "../bibliography/database"
import {Page404} from "../404"
import {FlatPage} from "../flatpage"
import * as plugins from "../../plugins/app"

export class App {
    constructor(config = {}) {
        this.config = config
        this.name = 'Fidus Writer'
        this.config.app = this
        this.routes = {
            "": {
                requireLogin: true,
                open: () => new DocumentOverview(this.config)
            },
            "account": {
                requireLogin: false,
                open: pathnameParts => {
                    let returnValue
                    switch (pathnameParts[2]) {
                        case "confirm-email": {
                            const key = pathnameParts[3]
                            returnValue = new EmailConfirm(this.config, key)
                            break
                        }
                        case "password-reset":
                            returnValue = new PasswordResetRequest(this.config)
                            break
                        case "change-password": {
                            const key = pathnameParts[3]
                            returnValue = new PasswordResetChangePassword(this.config, key)
                            break
                        }
                        case "sign-up":
                            returnValue = new Signup(this.config)
                            break
                        default:
                            returnValue = false
                    }
                    return returnValue
                }
            },
            "bibliography": {
                requireLogin: true,
                open: () => new BibliographyOverview(this.config)
            },
            "document": {
                requireLogin: true,
                open: pathnameParts => {
                    const id = pathnameParts[2]
                    return import('../editor').then(({Editor}) => new Editor(this.config, id))
                }
            },
            "invite": {
                open: pathnameParts => {
                    const id = pathnameParts[2]
                    return new DocumentInvite(this.config, id)
                }
            },
            "pages": {
                open: pathnameParts => {
                    const url = `/${pathnameParts[2]}/`
                    return new FlatPage(this.config, url)
                }
            },
            "user": {
                requireLogin: true,
                open: pathnameParts => {
                    let returnValue
                    switch (pathnameParts[2]) {
                        case "profile":
                            returnValue = new Profile(this.config)
                            break
                        case "team":
                            returnValue = new ContactsOverview(this.config)
                            break
                        default:
                            returnValue = false
                    }
                    return returnValue
                }
            },
            "usermedia": {
                requireLogin: true,
                open: () => new ImageOverview(this.config)
            }
        }
        this.openLoginPage = () => new LoginPage(this.config)
        this.open404Page = () => new Page404(this.config)
    }

    init() {
        if (!this.config.loggedIn) {
            this.activateFidusPlugins()
            this.selectPage()
            this.bind()
            return
        }
        this.bibDB = new BibliographyDB()
        this.imageDB = new ImageDB()
        Promise.all([
            this.bibDB.getDB(),
            this.imageDB.getDB(),
            this.getUserInfo()
        ]).then(
            () => {
                this.activateFidusPlugins()
                this.selectPage()
            }
        )
        this.bind()
        this.connectWs()
    }

    bind() {
        window.onpopstate = () => this.selectPage()
        document.addEventListener('click', event => {
            const el = {}
            switch (true) {
                case findTarget(event, 'a', el):
                    if (
                        el.target.hostname === window.location.hostname &&
                        el.target.getAttribute('href')[0] === '/'
                    ) {
                        event.preventDefault()
                        this.goTo(el.target.href)
                    }
                    break
            }
        })
    }

    connectWs() {
        this.ws = new WebSocketConnector({
            url: `${this.config.websocketUrl}/ws/base/`,
            appLoaded: () => true,
            receiveData: data => {
                switch (data.type) {
                    case 'message':
                            showSystemMessage(data.message)
                        break
                    default:
                        break
                }
            }

        })
        this.ws.init()
    }

    activateFidusPlugins() {
        if (this.plugins) {
            // Plugins have been activated already
            return
        }
        // Add plugins.
        this.plugins = {}

        Object.keys(plugins).forEach(plugin => {
            if (typeof plugins[plugin] === 'function') {
                this.plugins[plugin] = new plugins[plugin](this)
                this.plugins[plugin].init()
            }
        })
    }

    selectPage() {
        if (this.page && this.page.close) {
            this.page.close()
        }
        const pathnameParts = window.location.pathname.split('/')
        const route = this.routes[pathnameParts[1]]
        if (route) {
            if (route.requireLogin && !this.config.loggedIn) {
                this.page = this.openLoginPage()
                this.page.init()
                return
            }
            const page = route.open(pathnameParts)
            if (page.then) {
                page.then(thisPage => {
                    this.page = thisPage
                    this.page.init()
                })
                return
            } else if (page) {
                this.page = page
                this.page.init()
                return
            }
        }
        this.page = this.open404Page()
        this.page.init()
    }

    getUserInfo() {
        return getUserInfo().then(
            ({json}) => {
                this.config.user = json
            }
        )
    }

    goTo(url) {
        window.history.pushState({}, "", url)
        this.selectPage()
    }
}

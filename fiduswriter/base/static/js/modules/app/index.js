import {CSL} from 'citeproc-plus'
import OfflinePluginRuntime from 'offline-plugin/runtime'
import {DocumentInvite} from "../documents/invite"
import {ImageOverview} from "../images/overview"
import {ContactsOverview} from "../contacts"
import {Profile} from "../profile"
import {findTarget, WebSocketConnector, showSystemMessage, postJson, ensureCSS, addAlert} from "../common"
import {LoginPage} from "../login"
import {EmailConfirm} from "../email_confirm"
import {PasswordResetRequest, PasswordResetChangePassword} from "../password_reset"
import {Signup} from "../signup"
import {ImageDB} from "../images/database"
import {BibliographyDB} from "../bibliography/database"
import {Page404} from "../404"
import {OfflinePage} from "../offline"
import {SetupPage} from "../setup"
import {FlatPage} from "../flatpage"
import * as plugins from "../../plugins/app"
import {IndexedDB} from '../indexed_db'

export class App {
    constructor() {
        this.config = {}
        this.name = 'Fidus Writer'
        this.config.app = this
        this.routes = {
            "": {
                requireLogin: true,
                open: () => import(/* webpackPrefetch: true */"../documents/overview").then(({DocumentOverview}) => new DocumentOverview(this.config))
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
                open: () => import("../bibliography/overview").then(({BibliographyOverview}) => new BibliographyOverview(this.config))
            },
            "document": {
                requireLogin: true,
                open: pathnameParts => {
                    const id = pathnameParts[2]
                    return import(/* webpackPrefetch: true *//* webpackChunkName: "editor" */'../editor').then(({Editor}) => new Editor(this.config, id))
                },
                dbTables: {
                    "list": {
                        keyPath: "id"
                    },
                    "templates": {
                        keyPath: "pk"
                    },
                    "styles": {
                        keyPath: "title"
                    },
                    "teammembers": {
                        keyPath: "id"
                    }
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
                },
                dbTables: {
                    "contacts": {
                        keyPath: "id"
                    }
                }
            },
            "usermedia": {
                requireLogin: true,
                open: () => new ImageOverview(this.config)
            }
        }
        this.openLoginPage = () => new LoginPage(this.config)
        this.openOfflinePage = () => new OfflinePage(this.config)
        this.openSetupPage = () => new SetupPage(this.config)
        this.open404Page = () => new Page404(this.config)
        this.handleSWUpdate = () => window.location.reload()
    }

    isOffline() {
        return !navigator.onLine || (this.ws?.connectionCount > 0 && !this.ws?.connected)
    }

    alertCached() {
        addAlert('info', gettext('You are viewing a cached version of this page.'))
    }

    installServiceWorker() {
        /* This function is used for testing SW with Django tests */
        OfflinePluginRuntime.install({
            onUpdateReady: () => OfflinePluginRuntime.applyUpdate(),
            onUpdated: () => window.location.reload()
        })
    }

    init() {
        if (!settings_DEBUG && settings_USE_SERVICE_WORKER) {
            OfflinePluginRuntime.install({
                onUpdateReady: () => OfflinePluginRuntime.applyUpdate(),
                onUpdated: () => this.handleSWUpdate()
            })
        }
        ensureCSS([
            'fontawesome/css/all.css'
        ])
        if (this.isOffline()) {
            this.page = this.openOfflinePage()
            return this.page.init()
        } else {
            return this.getUserInfo().catch(
                error => {
                    if (error instanceof TypeError) {
                        // We could not fetch user info from server, so let's
                        // assume we are disconnected.
                        this.page = this.openOfflinePage()
                        this.page.init()
                    } else if (error.status === 405) {
                        // 405 indicates that the server is running but the
                        // method is not allowed. This must be the setup server.
                        // We show a setup message instead.
                        this.page = this.openSetupPage()
                        this.page.init()
                    } else if (settings_DEBUG) {
                        throw error
                    } else {
                        // We don't know what is going on, but we are in production
                        // mode. Hopefully the app will update soon.
                        this.page = this.openOfflinePage()
                        this.page.init()
                    }
                    return Promise.reject(false)
                }
            ).then(
                () => this.setup()
            ).catch(
                error => {
                    if (error === false) {
                        return
                    }
                    throw error
                }
            )
        }
    }

    setup() {
        if (!this.config.user.is_authenticated) {
            this.activateFidusPlugins()
            return this.selectPage().then(
                () => this.bind()
            )
        }
        this.bibDB = new BibliographyDB(this)
        this.imageDB = new ImageDB()
        this.csl = new CSL()
        this.connectWs()
        return Promise.all([
            this.bibDB.getDB(),
            this.imageDB.getDB(),
        ]).then(
            () => {
                this.activateFidusPlugins()
                // Initialize the indexedDB after the plugins have loaded.
                this.indexedDB = new IndexedDB(this)
                this.indexedDB.init()
                return this.selectPage()
            }
        ).then(
            () => this.bind()
        )
    }

    bind() {
        window.onpopstate = () => this.selectPage()
        document.addEventListener('click', event => {
            const el = {}
            switch (true) {
            case findTarget(event, 'a', el):
                if (
                    el.target.hostname === window.location.hostname &&
                        el.target.getAttribute('href')[0] === '/' &&
                        el.target.getAttribute('href').slice(0, 7) !== '/media/' &&
                        el.target.getAttribute('href').slice(0, 5) !== '/api/'
                ) {
                    event.preventDefault()
                    event.stopImmediatePropagation()
                    this.goTo(el.target.href)
                }
                break
            }
        })
        let resizeDone
        window.addEventListener('resize', () => {
            clearTimeout(resizeDone)
            resizeDone = setTimeout(() => {
                if (this.page && this.page.onResize) {
                    this.page.onResize()
                }
            }, 250)
        })
        window.addEventListener('beforeunload', event => {
            if (this.page && this.page.onBeforeUnload) {
                if (this.page.onBeforeUnload()) {
                    event.preventDefault()
                    // To stop the event for chrome and safari
                    event.returnValue = ''
                    return ''
                }
            }
        })
    }

    connectWs() {
        this.ws = new WebSocketConnector({
            url: '/ws/base/',
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
            if (
                route.requireLogin &&
                !(this.config.user || {}).is_authenticated
            ) {
                this.page = this.openLoginPage()
                return this.page.init()
            }
            const page = route.open(pathnameParts)
            if (page.then) {
                return page.then(thisPage => {
                    this.page = thisPage
                    return this.page.init().then(
                        () => {
                            if (this.isOffline()) {
                                this.alertCached()
                            }
                        }
                    )
                })
            } else if (page) {
                this.page = page
                return this.page.init().then(
                    () => {
                        if (this.isOffline()) {
                            this.alertCached()
                        }
                    }
                )
            }
        }
        this.page = this.open404Page()
        return this.page.init()
    }

    getUserInfo() {
        return postJson('/api/base/configuration/').then(
            ({json}) => Object.entries(json).forEach(([key, value]) => this.config[key] = value)
        )
    }

    goTo(url) {
        window.history.pushState({}, "", url)
        return this.selectPage()
    }

}

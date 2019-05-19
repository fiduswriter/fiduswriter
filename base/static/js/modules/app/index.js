import {BibliographyOverview} from "../bibliography/overview"
import {DocumentOverview} from "../documents/overview"
import {ImageOverview} from "../images/overview"
import {ContactsOverview} from "../contacts"
import {Profile} from "../profile"
import {getUserInfo, findTarget, WebSocketConnector, showSystemMessage} from "../common"
import {ImageDB} from "../images/database"
import {BibliographyDB} from "../bibliography/database"
import * as plugins from "../../plugins/app"

export class App {
    constructor(config = {}) {
        this.config = config
        this.name = 'Fidus Writer'
        this.config.app = this
        this.routes = {
            "usermedia": () => new ImageOverview(this.config),
            "bibliography": () => new BibliographyOverview(this.config),
            "user": pathnameParts => {
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
            "document": pathnameParts => {
                const id = pathnameParts[2]
                return import('../editor').then(({Editor}) => new Editor(this.config, id))
            },
            "": () => new DocumentOverview(this.config)
        }
    }

    init() {
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
        const page = this.routes[pathnameParts[1]] ? this.routes[pathnameParts[1]](pathnameParts) : false
        if (page) {
            if (page.then) {
                page.then(thisPage => {
                    this.page = thisPage
                    this.page.init()
                })
            } else {
                this.page = page
                this.page.init()
            }
        } else {
            window.location = window.location
        }
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

import {BibliographyOverview} from "../bibliography/overview"
import {DocumentOverview} from "../documents/overview"
import {Editor} from "../editor"
import {ImageOverview} from "../images/overview"
import {ContactsOverview} from "../contacts"
import {Profile} from "../profile"
import {getUserInfo, findTarget} from "../common"
import * as plugins from "../../plugins/app"

export class App {
    constructor(config = {}) {
        this.config = config
        this.config.app = this
        this.routes = {
            "usermedia": () => new ImageOverview(this.config),
            "bibliography": () => new BibliographyOverview(this.config),
            "user": pathnameParts => {
                switch(pathnameParts[2]) {
                    case "profile":
                        return new Profile(this.config)
                        break
                    case "team":
                        return new ContactsOverview(this.config)
                        break
                    default:
                        return false
                }
            },
            "document": pathnameParts => {
                let id = parseInt(pathnameParts[2])
                if (isNaN(id)) {
                    id = 0
                }
                return new Editor(id, this.config)
            },
            "": () => new DocumentOverview(this.config)
        }
    }

    init() {
        this.getUserInfo().then(
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
        this.page = this.routes[pathnameParts[1]] ? this.routes[pathnameParts[1]](pathnameParts) : false
        if (this.page) {
            this.page.init()
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

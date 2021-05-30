import * as plugins from "../../plugins/menu"
import {dropdownSelect, whenReady, post} from "../common"
import {headerNavTemplate} from "./templates"

// Bindings for the top menu on overview pages

export class SiteMenu {
    constructor(app, activeItem) {
        this.app = app
        this.activeItem = activeItem
        this.navItems = [
            {
                text: gettext('Documents'),
                url: '/',
                title: gettext('edit documents'),
                id: 'documents',
                order: 0
            },
            {
                text: gettext('Bibliography'),
                url: '/bibliography/',
                title: gettext('manage bibliography library'),
                id: 'bibliography',
                order: 1
            },
            {
                text: gettext('Images'),
                url: '/usermedia/',
                title: gettext('manage image files'),
                id: 'images',
                order: 2
            }
        ]
    }

    init() {
        this.activatePlugins()
        const currentActive = this.navItems.find(item => item.id === this.activeItem)
        if (currentActive) {
            currentActive.active = true
        }

        whenReady().then(() => {
            this.sortMenu()
            this.renderMenu()
            this.bindPreferencePullDown()
        })
    }

    sortMenu() {
        this.navItems.sort((a, b) => a.order - b.order)
    }

    renderMenu() {
        const headerNav = document.getElementById('header-nav')
        headerNav.innerHTML = headerNavTemplate({navItems: this.navItems})
    }

    bindPreferencePullDown() {
        dropdownSelect(
            document.getElementById('user-preferences-pulldown'),
            {
                button: document.getElementById('preferences-btn'),
                onChange: value => {
                    switch (value) {
                    case 'profile':
                        this.app.goTo('/user/profile/')
                        break
                    case 'contacts':
                        this.app.goTo('/user/contacts/')
                        break
                    case 'logout':
                        post('/api/user/logout/').then(
                            () => window.location = '/'
                        )
                        break
                    }
                }
            }
        )
    }

    activatePlugins() {
        // Add plugins, but only once.
        if (!this.plugins) {
            this.plugins = {}

            Object.keys(plugins).forEach(plugin => {
                if (typeof plugins[plugin] === 'function') {
                    this.plugins[plugin] = new plugins[plugin](this)
                    this.plugins[plugin].init()
                }
            })

        }
    }
}

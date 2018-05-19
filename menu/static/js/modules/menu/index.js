import * as plugins from "../../plugins/menu"
import {addDropdownBox, whenReady} from "../common"
import {headerNavTemplate} from "./templates"

// Bindings for the top menu on overview pages

export class SiteMenu {
    constructor(activeItem) {
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
        let currentActive = this.navItems.find(item => item.id === this.activeItem)
        if (currentActive) {
            currentActive.active = true
        }

        whenReady().then(() => {
            this.renderMenu()
            this.bindPreferencePullDown()
        })
    }

    renderMenu() {
        let headerNav = document.getElementById('header-nav')
        headerNav.innerHTML = headerNavTemplate({navItems: this.navItems})
    }

    bindPreferencePullDown() {
        let box = document.getElementById('user-preferences-pulldown')
        let button = document.getElementById('preferences-btn')
        addDropdownBox(
            button,
            box,
            () => {
                // In addition to adding the dropdown, we also need to add some css
                // values so that the dropdown is placed close to #preferences-btn
                let btnOffset = button.getBoundingClientRect()
                box.style.left = `${document.body.scrollLeft + btnOffset.left - 52}px`
                box.style.top = `${document.body.scrollTop + btnOffset.top + 27}px`
            }
        )

        // As a click will close the pulldown, we need to activate the link by means of a mousedown already.
        document.querySelectorAll('#user-preferences-pulldown a').forEach(el => el.addEventListener('mousedown', event => {
            event.preventDefault()
            window.location = el.getAttribute('href')
        }))

        // Same for form button
        document.querySelectorAll('#user-preferences-pulldown form').forEach(el => el.addEventListener('mousedown', event => {
            event.preventDefault()
            el.submit()
        }))
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

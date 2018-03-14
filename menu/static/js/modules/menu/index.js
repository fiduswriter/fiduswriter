import * as plugins from "../../plugins/menu"
import {addDropdownBox} from "../common"
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
                id: 'documents'
            },
            {
                text: gettext('Bibliography'),
                url: '/bibliography/',
                title: gettext('manage bibliography library'),
                id: 'bibliography'
            },
            {
                text: gettext('Images'),
                url: '/usermedia/',
                title: gettext('manage image files'),
                id: 'images'
            }
        ]
    }

    init() {
        this.activatePlugins()
        let currentActive = this.navItems.find(item => item.id === this.activeItem)
        if (currentActive) {
            currentActive.active = true
        }

        jQuery(document).ready(() => {
            this.renderMenu()
            this.bindPreferencePullDown()
        })
    }

    renderMenu() {
        let headerNav = document.getElementById('header-nav')
        headerNav.innerHTML = headerNavTemplate({navItems: this.navItems})
    }

    bindPreferencePullDown() {
        let box = jQuery('#user-preferences-pulldown')
        let button = jQuery('#preferences-btn')
        addDropdownBox(button, box)

        // In addition to adding the dropdown, we also need to add some css
        // values so that the dropdown is placed close to #preferences-btn
        document.getElementById('preferences-btn').addEventListener('mousedown', () => {
            let btnOffset = button.offset()
            box.css({
                'left': btnOffset.left - 52,
                'top': btnOffset.top + 27
            })
        })
        // As a click will close the pulldown, we need to activate the link by means of a mousedown already.
        jQuery(document).on('mousedown', '#user-preferences-pulldown a', function(event) {
            event.preventDefault()
            window.location = this.getAttribute('href')
        })
        // Same for form button
        jQuery(document).on('mousedown', '#user-preferences-pulldown button[type="submit"]', function(event) {
            event.preventDefault()
            jQuery(this).closest('form').submit()
        })
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

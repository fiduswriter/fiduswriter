import {addDropdownBox} from "../common/common"

// Bindings for the menu

export class Menu {
    constructor(activeItem) {
        this.activeItem = activeItem
        this.bind()
    }

    bind() {
        jQuery(document).ready(() => {
            this.markCurrentlyActive()
            this.bindPreferencePullDown()
        })
    }

    markCurrentlyActive() {
        // Mark currently active menu item
        let active = jQuery(`body > header a[data-item="${this.activeItem}"]`)
        active.addClass('active')
        active.parent().addClass('active-menu-wrapper')
    }

    bindPreferencePullDown() {
        let box = jQuery('#user-preferences-pulldown')
        let button = jQuery('#preferences-btn')
        addDropdownBox(button, box)

        // In addition to adding the dropdown, we also need to add some css
        // values so that the dropdown is placed close to #preferences-btn
        jQuery('#preferences-btn').bind('mousedown', () => {
            let btnOffset = button.offset()
            box.css({
                'left': btnOffset.left - 52,
                'top': btnOffset.top + 27
            })
        })
        // As a click will close the pulldown, we need to activate the link by means of a mousedown already.
        jQuery(document).on('mousedown', '#user-preferences-pulldown a', function(event) {
            event.preventDefault()
            window.location = jQuery(this).attr('href')
        })
        // Same for form button
        jQuery(document).on('mousedown', '#user-preferences-pulldown button[type="submit"]', function(event) {
            event.preventDefault()
            jQuery(this).closest('form').submit()
        })
    }
}

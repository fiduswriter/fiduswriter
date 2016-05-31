// Bindings for the menu

export class Menu {
    constructor(activeItem) {
        this.activeItem = activeItem
//        let currentURL = document.location.href.split('//')[1]
//        let currentRelativeUrl = currentURL.substring(currentURL.indexOf('/'), currentURL.length)
//        this.currentRelativeUrlCleaned = currentRelativeUrl.replace('#','')
        this.bind()
    }

    bind() {
        let that = this
        jQuery(document).ready(function(){
            that.markCurrentlyActive()
            that.bindPreferencePullDown()
        })
    }

    markCurrentlyActive() {
        //let that = this
        // Mark currently active menu item
        let active = jQuery(`body > header a[data-item="${this.activeItem}"]`)
        active.addClass('active')
        active.parent().addClass('active-menu-wrapper')
        /*jQuery('body > header a').each(function () {
            //if (jQuery(this).attr('href') == that.currentRelativeUrlCleaned) {
                jQuery(this).addClass('active')
                jQuery(this).parent().addClass('active-menu-wrapper')
            }
        })*/
    }

    bindPreferencePullDown() {
        let that = this
        jQuery('#preferences-btn').bind('click', function() {
            let menuBox = jQuery('#user-preferences-pulldown')
            if('none' == menuBox.css('display')) {
                that.openPreferencePulldown(menuBox)
            }
        })
    }

    openPreferencePulldown(box) {
        let btnOffset = jQuery('#preferences-btn').offset(), that = this
        box.css({
            'left': btnOffset.left - 52,
            'top': btnOffset.top + 27
        })
        box.show()
        window.setTimeout(function() {
            jQuery(document).on('click', {'box': box}, function(event){
                that.closePreferencePulldown(event)
            })
        }, 100)
    }

    closePreferencePulldown(e) {
        let that = this
        e.data.box.hide()
        jQuery(document).off('click', function(box){
            that.closePreferencePulldown(box)
        })
    }
}

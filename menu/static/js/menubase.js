jQuery(document).ready(function () {
    // Mark currently active menu item
    var currentURL = document.location.href.split('//')[1];
    var currentRelativeUrl = currentURL.substring(currentURL.indexOf('/'), currentURL.length)
    var currentRelativeUrlCleaned = currentRelativeUrl.replace('#','')
    jQuery('body > header a').each(function () {
        if (jQuery(this).attr('href') == currentRelativeUrlCleaned) {
            jQuery(this).addClass('active');
            jQuery(this).parent().addClass('active-menu-wrapper')
        }
    });

    var openPreferencePulldown = function(box) {
        var btn_offset = jQuery('#preferences-btn').offset();
        box.css({
            'left': btn_offset.left - 52,
            'top': btn_offset.top + 27
        });
        box.show();
        window.setTimeout(function() {
            jQuery(document).on('click', {'box': box}, closePreferencePulldown);
        }, 100);
        $.isDropdownBoxOpen = true;
    }

    var closePreferencePulldown = function(e) {
        e.data.box.hide();
        jQuery(document).off('click', closePreferencePulldown);
        $.isDropdownBoxOpen = false;
    }

    jQuery('#preferences-btn').bind('click', function() {
        var $menu_box = jQuery('#user-preferences-pulldown');
        if('none' == $menu_box.css('display')) {
            openPreferencePulldown($menu_box);
        }
    });
});

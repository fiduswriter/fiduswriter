/** Creates a dropdown box.
 * @param btn The button to open and close the dropdown box.
 * @param box The node containing the contents of the dropdown box.
 */

export let addDropdownBox = function(btn, box) {
    btn.bind('mousedown', function(e) {
        e.preventDefault()
        if(btn.hasClass('disabled')) {
            return
        }
        if('none' == box.css('display')) {
            openDropdownBox(box)
        }
    })
}

/** Opens a dropdown box.
 * @param box The node containing the contents of the dropdown box.
 */

let openDropdownBox = function(box) {
    box.show()
    window.setTimeout(function() {
        jQuery(document).on('mousedown', {'box': box}, closeDropdownBox)
    }, 100)
}

/** Closes a dropdown box.
 * @param e The clode event.
 */

let closeDropdownBox = function(e) {
    e.preventDefault()
    jQuery(document).off('mousedown', closeDropdownBox)
    e.data.box.hide()
}

/** Checkes or uncheckes a checkable label. This is used for example for bibliography categories when editing bibliography items.
 * @param label The node who's parent has to be checked or unchecked.
 */
export let setCheckableLabel = function(label) {
    let checkbox = label.parent().find('input[type=checkbox]')
    if(label.hasClass('checked')) {
        label.removeClass('checked')
    } else {
        label.addClass('checked')
    }
}

/** Cover the page signaling to the user to wait.
 */
export let activateWait = function() {
    jQuery('#wait').addClass('active')
}

/** Remove the wait cover.
 */
export let deactivateWait = function() {
    jQuery('#wait').removeClass('active')
}

/** Show a message to the user.
 * @param alertType The type of message that is shown (error, warning, info or success).
 * @param alertMsg The message text.
 */
export let addAlert = function(alertType, alertMsg) {
    let fadeSpeed = 300
    let iconNames = {
        'error': 'icon-attention-circle',
        'warning': 'icon-attention-circle',
        'info': 'icon-info-circle',
        'success': 'icon-ok'
    }
    let alertBox = jQuery('<li class="alerts-' + alertType + ' ' + iconNames[alertType] + '">' + alertMsg + '</li>')
    if(0 === jQuery('#alerts-outer-wrapper').size())
        jQuery('body').append('<div id="alerts-outer-wrapper"><ul id="alerts-wrapper"></ul></div>')
    jQuery('#alerts-wrapper').append(alertBox)
    alertBox.fadeTo(fadeSpeed, 1, function() {
        jQuery(this).delay('2000').fadeOut(fadeSpeed, function() { jQuery(this).remove() })
    })
}


/** Turn milliseconds since epoch (UTC) into a local date string.
 * @param {number} milliseconds Number of milliseconds since epoch (1/1/1970 midnight, UTC).
 * @param {boolean} sortable Whether the result should appear in a date only list.
 */
export let localizeDate = function (milliseconds, sortable) {
    milliseconds = parseInt(milliseconds)
    if (milliseconds > 0) {
        let theDate = new Date(milliseconds)
        if (true === sortable) {
            let yyyy = theDate.getFullYear(),
                mm = theDate.getMonth() + 1,
                dd = theDate.getDate()

            if (10 > mm) {
                mm = '0' + mm
            }

            return yyyy + '/' + mm + '/' + dd
        }
        else {
            return theDate.toLocaleString()
        }
    }
    else {
        return ''
    }
}

/** Get cookie to set as part of the request header of all AJAX requests to the server.
 * @param name The name of the token to look for in the cookie.
 */
export let getCookie = function(name) {
    let cookieValue = null
    if (document.cookie && document.cookie !== '') {
        let cookies = document.cookie.split(';')
        for (let i = 0; i < cookies.length; i++) {
            let cookie = jQuery.trim(cookies[i])
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) == (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1))
                break
            }
        }
    }
    return cookieValue
}

/**
 * The Cross Site Request Forgery (CSRF) token
 */
export let csrfToken = getCookie('csrftoken')

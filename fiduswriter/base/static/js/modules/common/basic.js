import {Dialog} from "./dialog"

/** Creates a dropdown box.
 * @param btn The button to open and close the dropdown box.
 * @param box The node containing the contents of the dropdown box.
 * @param preopen An optional function to be called before opening the dropdown box. Used to position dropdown box.
 */

export const addDropdownBox = function(btn, box, preopen=false) {
    btn.addEventListener('click', event => {
        event.preventDefault()
        event.stopPropagation()
        if (btn.classList.contains('disabled')) {
            return
        }
        if (!box.clientWidth) {
            if (preopen) {
                preopen()
            }
            openDropdownBox(box)
        }
    })
}

/** Opens a dropdown box.
 * @param box The node containing the contents of the dropdown box.
 */

export const openDropdownBox = function(box) {
    // Show this box
    box.style.display = 'block'

    const closeDropdownBox = function(event) {
        event.preventDefault()
        box.style.display = ''
        document.removeEventListener('click', closeDropdownBox, false)
    }
    document.body.addEventListener('click', closeDropdownBox, false)
}


/** Checks or unchecks a checkable label. This is used for example for bibliography categories when editing bibliography items.
 * @param label The node who's parent has to be checked or unchecked.
 */
export const setCheckableLabel = function(labelEl) {
    if (labelEl.classList.contains('checked')) {
        labelEl.classList.remove('checked')
    } else {
        labelEl.classList.add('checked')
    }
}

/** Cover the page signaling to the user to wait.
 */
export const activateWait = function(full = false) {
    const waitEl = document.getElementById('wait')
    if (waitEl) {
        waitEl.classList.add('active')
        if (full) {
            waitEl.classList.add('full')
        }
    }
}

/** Remove the wait cover.
 */
export const deactivateWait = function() {
    const waitEl = document.getElementById('wait')
    if (waitEl) {
        waitEl.classList.remove('active')
        waitEl.classList.remove('full')
    }
}

/** Show a message to the user.
 * @param alertType The type of message that is shown (error, warning, info or success).
 * @param alertMsg The message text.
 */
export const addAlert = function(alertType, alertMsg) {
    const iconNames = {
        'error': 'exclamation-circle',
        'warning': 'exclamation-circle',
        'info': 'info-circle',
        'success': 'check-circle'
    }
    if (!document.getElementById('#alerts-outer-wrapper'))
        document.body.insertAdjacentHTML('beforeend', '<div id="alerts-outer-wrapper"><ul id="alerts-wrapper"></ul></div>')
    const alertsWrapper = document.getElementById('alerts-wrapper')
    alertsWrapper.insertAdjacentHTML('beforeend', `<li class="alerts-${alertType} fa fa-${iconNames[alertType]}">${alertMsg}</li>`)
    const alertBox = alertsWrapper.lastElementChild
    setTimeout(()=>{
        alertBox.classList.add('visible')
        setTimeout(()=>{
            alertBox.classList.remove('visible')
            setTimeout(()=>alertsWrapper.removeChild(alertBox), 2000)
        }, 4000)
    }, 1)
}

// Used for system mesages
export const showSystemMessage = function(message) {
    const dialog = new Dialog({
        title: gettext('System message'),
        body: `<p>${escapeText(message)}</p>`,
        buttons: [{type: 'close'}]
    })
    dialog.open()
}

/** Turn milliseconds since epoch (UTC) into a local date string.
 * @param {number} milliseconds Number of milliseconds since epoch (1/1/1970 midnight, UTC).
 * @param {boolean} type 'full' for full date (default), 'sortable-date' for sortable date, 'minutes' for minute accuracy
 */
const CACHED_DATES = {
    'sortable-date': {},
    'minutes': {},
    'full': {}
}
export const localizeDate = function(milliseconds, type='full') {
    if (milliseconds === 0) {
        return ''
    } else if (CACHED_DATES[type][milliseconds]) {
        return CACHED_DATES[type][milliseconds]
    }
    const theDate = new Date(milliseconds)
    let returnValue
    switch (type) {
        case 'sortable-date': {
            const yyyy = theDate.getFullYear()
            const mm = theDate.getMonth() + 1
            const dd = theDate.getDate()
            returnValue = `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
            break
        }
        case 'minutes':
            returnValue = theDate.toLocaleString([], {year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'})
            break
        default:
            returnValue = theDate.toLocaleString()
    }
    if (Object.keys(CACHED_DATES[type]).length > 5000) {
        CACHED_DATES[type] = {}
    }
    CACHED_DATES[type][milliseconds] = returnValue
    return returnValue
}

/**
 * Turn string literals into single line, removing spaces at start of line
 */

export const noSpaceTmp = function(_strings) {
     const values = Array.from(arguments)
     const tmpStrings = Array.from(values.shift())

     let combined = ""
     while (tmpStrings.length > 0 || values.length > 0) {
         if (tmpStrings.length > 0) {
             combined += tmpStrings.shift()
         }
         if (values.length > 0) {
             combined += values.shift()
         }
     }

     let out = ""
     combined.split('\n').forEach(line => {
         out += line.replace(/^\s*/g, '')
     })
     return out
 }

export const escapeText = function(text) {
     return text
         .replace(/&/g, '&amp;')
         .replace(/</g, '&lt;')
         .replace(/>/g, '&gt;')
 }
/**
 * Return a cancel promise if you need to cancel a promise chain. Import as
 * ES6 promises are not (yet) cancelable.
 */

export const cancelPromise = () => new Promise(()=>{})

// Check if selector matches one of the ancestors of the event target.
// Used in switch statements of document event listeners.
export const findTarget = function(event, selector, el={}) {
    el.target = event.target.closest(selector)
    if (el.target) {
        event.stopPropagation()
        return true
    }
    return false
}

// Promise when page has been loaded.
export const whenReady = function() {
    if (document.readyState === "complete") {
        return Promise.resolve()
    } else {
        return new Promise(resolve => {
            document.addEventListener("readystatechange", _event => {
                if (document.readyState === "complete") {
                    resolve()
                }
            })
        })
    }
}

export const setDocTitle = function(title, app) {
    const titleText = `${title} - ${app.name}`
    if (document.title !== titleText) {
        document.title = titleText
    }
}

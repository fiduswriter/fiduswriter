/** Creates a dropdown box.
 * @param btn The button to open and close the dropdown box.
 * @param box The node containing the contents of the dropdown box.
 * @param preopen An optional function to be called before opening the dropdown box. Used to position dropdown box.
 */

export let addDropdownBox = function(btn, box, preopen=false) {
    btn.addEventListener('click', event => {
        event.preventDefault()
        event.stopPropagation()
        if(btn.classList.contains('disabled')) {
            return
        }
        if(!box.clientWidth) {
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

export let openDropdownBox = function(box) {
    // Show this box
    box.style.display = 'block'

    let closeDropdownBox = function(event) {
        event.preventDefault()
        box.style.display = ''
        document.removeEventListener('click', closeDropdownBox, false);
    }
    document.addEventListener('click', closeDropdownBox, false)
}


/** Checks or unchecks a checkable label. This is used for example for bibliography categories when editing bibliography items.
 * @param label The node who's parent has to be checked or unchecked.
 */
export let setCheckableLabel = function(labelEl) {
    if(labelEl.classList.contains('checked')) {
        labelEl.classList.remove('checked')
    } else {
        labelEl.classList.add('checked')
    }
}

/** Cover the page signaling to the user to wait.
 */
export let activateWait = function() {
    let waitEl = document.getElementById('wait')
    if (waitEl) {
        waitEl.classList.add('active')
    }
}

/** Remove the wait cover.
 */
export let deactivateWait = function() {
    let waitEl = document.getElementById('wait')
    if (waitEl) {
        waitEl.classList.remove('active')
    }
}

/** Show a message to the user.
 * @param alertType The type of message that is shown (error, warning, info or success).
 * @param alertMsg The message text.
 */
export let addAlert = function(alertType, alertMsg) {
    let fadeSpeed = 300
    let iconNames = {
        'error': 'exclamation-circle',
        'warning': 'exclamation-circle',
        'info': 'info-circle',
        'success': 'check-circle'
    }
    if(!document.getElementById('#alerts-outer-wrapper'))
        document.body.insertAdjacentHTML('beforeend', '<div id="alerts-outer-wrapper"><ul id="alerts-wrapper"></ul></div>')
    let alertsWrapper = document.getElementById('alerts-wrapper')
    alertsWrapper.insertAdjacentHTML('beforeend', `<li class="alerts-${alertType} fa fa-${iconNames[alertType]}">${alertMsg}</li>`)
    let alertBox = alertsWrapper.lastElementChild
    setTimeout(()=>{
        alertBox.classList.add('visible')
        setTimeout(()=>{
            alertBox.classList.remove('visible')
            setTimeout(()=>alertsWrapper.removeChild(alertBox), 2000)
        }, 4000)
    }, 1)
}


/** Turn milliseconds since epoch (UTC) into a local date string.
 * @param {number} milliseconds Number of milliseconds since epoch (1/1/1970 midnight, UTC).
 * @param {boolean} type 'full' for full date (default), 'sortable-date' for sortable date, 'minutes' for minute accuracy
 */
export let localizeDate = function (milliseconds, type='full') {
    milliseconds = parseInt(milliseconds)
    if (milliseconds > 0) {
        let theDate = new Date(milliseconds)
        switch(type) {
            case 'sortable-date':
                let yyyy = theDate.getFullYear(),
                    mm = theDate.getMonth() + 1,
                    dd = theDate.getDate()

                return `${yyyy}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`
                break
            case 'minutes':
                return theDate.toLocaleString([], {year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute:'2-digit'})
                break
            default:
                return theDate.toLocaleString()
        }
    }
    else {
        return ''
    }
}

/**
 * Turn string literals into single line, removing spaces at start of line
 */

export let noSpaceTmp = function(strings) {
     let values = Array.from(arguments)
     let tmpStrings = Array.from(values.shift())

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
         out += line.replace(/^\s*/g,'')
     })
     return out
 }

export let escapeText = function(text) {
     return text
         .replace(/&/g, '&amp;')
         .replace(/</g, '&lt;')
         .replace(/>/g, '&gt;')
 }
/**
 * Return a cancel promise if you need to cancel a promise chain. Import as
 * ES6 promises are not (yet) cancelable.
 */

export let cancelPromise = () => new Promise(()=>{})

// Check if selector matches one of the ancestors of the event target.
// Used in switch statements of document event listeners.
export let findTarget = function(event, selector, el={}) {
    el.target = event.target.closest(selector)
    if (el.target) {
        event.stopPropagation()
        return true
    }
    return false
}

// Promise when page has been loaded.
export let whenReady = function() {
    if (document.readyState === "complete") {
        return Promise.resolve()
    } else {
        return new Promise(resolve => {
            document.addEventListener("readystatechange", event => {
                if (document.readyState === "complete") {
                    resolve()
                }
            })
        })
    }
}

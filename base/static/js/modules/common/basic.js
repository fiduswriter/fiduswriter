/** Creates a dropdown box.
 * @param btn The button to open and close the dropdown box.
 * @param box The node containing the contents of the dropdown box.
 */

export let addDropdownBox = function(btn, box) {
    btn.bind('mousedown', event => {
        event.preventDefault()
        if(btn.classList.contains('disabled')) {
            return
        }
        if('none' === box.style.display) {
            openDropdownBox(box)
        }
    })
}

/** Opens a dropdown box.
 * @param box The node containing the contents of the dropdown box.
 */

let openDropdownBox = function(box) {

    // Show this box
    box.style.display = ''
    // Give that the dropdown menu was opened through a mousedown event, there
    // will be a first click event following it. We will wait for the second
    // click event.
    jQuery(document).one('click', () => {
        jQuery(document).one('click', event => {
            event.preventDefault()
            box.style.display = 'none'
        })
    })
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

            return `${yyyy}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`
        }
        else {
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
     let values = [].slice.call(arguments)
     let tmpStrings = [].slice.call(values.shift())

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


/** Get cookie to set as part of the request header of all AJAX requests to the server.
 * @param name The name of the token to look for in the cookie.
 */
let getCookie = function(name) {
    let cookieValue = null
    if (document.cookie && document.cookie !== '') {
        let cookies = document.cookie.split(';')
        for (let i = 0; i < cookies.length; i++) {
            let cookie = cookies[i].trim()
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) == (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1))
                break
            }
        }
    }
    return cookieValue
}

export let getCsrfToken = function () {
    return getCookie('csrftoken')
}

/* from https://www.tjvantoll.com/2015/09/13/fetch-and-errors/ */
let handleFetchErrors = function(response) {
    if (!response.ok) { throw Error(response.statusText) }
    return response
}

export let get = function(url, params={}, csrfToken=false) {
    if (!csrfToken) {
        csrfToken = getCsrfToken() // Won't work in web worker.
    }
    let queryString = Object.keys(params).map(
        key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
    ).join('&')
    if (queryString.length) {
        url = `${url}?${queryString}`
    }
    return fetch(url, {
        method: "GET",
        headers: {
            'X-CSRFToken': csrfToken,
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include'
    }).then(
        handleFetchErrors
    )
}

export let getJson = function(url, params={}, csrfToken=false) {
    return get(url, params, csrfToken).then(
        response => response.json()
    )
}

export let post = function(url, params={}, csrfToken=false) {
    if (!csrfToken) {
        csrfToken = getCsrfToken() // Won't work in web worker.
    }
    let body = new FormData()
    body.append('csrfmiddlewaretoken', csrfToken)
    Object.keys(params).forEach(key => {
        let value = params[key]
        if (typeof(value)==="object" && value.file && value.filename) {
            body.append(key, value.file, value.filename)
        } else if (Array.isArray(value)) {
            value.forEach(item => body.append(`${key}[]`, item))
        } else {
            body.append(key, value)
        }
    })

    return fetch(url, {
        method: "POST",
        headers: {
            'X-CSRFToken': csrfToken,
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include',
        body
    }).then(
        handleFetchErrors
    )
}

// post and then return json
export let postJson = function(url, params={}, csrfToken=false) {
    return post(url, params, csrfToken).then(
        response => response.json()
    )
}

// post and then return json and status
export let postJsonStatus = function(url, params={}, csrfToken=false) {
    return post(url, params, csrfToken).then(
        response => response.json().then(
            json => ({json, status: response.status})
        )
    )
}

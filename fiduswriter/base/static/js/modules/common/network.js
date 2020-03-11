/** Get cookie to set as part of the request header of all AJAX requests to the server.
 * @param name The name of the token to look for in the cookie.
 */
const getCookie = function(name) {
    if (!document.cookie || document.cookie === '') {
        return null
    }
    const cookie = document.cookie.split(';').map(cookie => cookie.trim()).find(cookie => {
        if (cookie.substring(0, name.length + 1) == (name + '=')) {
            return true
        } else {
            return false
        }
    })
    if (cookie) {
        return decodeURIComponent(cookie.substring(name.length + 1))
    }
    return null
}

const deleteCookie = function(name) {
    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
}

const getCsrfToken = function() {
    return getCookie('csrftoken')
}

/* from https://www.tjvantoll.com/2015/09/13/fetch-and-errors/ */
const handleFetchErrors = function(response) {
    if (!response.ok) { throw response }
    return response
}

// We don't use django messages in the frontend. The only messages that are recording
//  are "user logged in" and "user logged out". The admin interface does use messages.
// To prevent it from displaying lots of old login/logout messages, we delete the
// messages after each post/get.
const removeDjangoMessages = function(response) {
    deleteCookie('messages')
    return response
}

export const get = function(url, params={}, csrfToken=false) {
    if (!csrfToken) {
        csrfToken = getCsrfToken() // Won't work in web worker.
    }
    const queryString = Object.keys(params).map(
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
        removeDjangoMessages
    ).then(
        handleFetchErrors
    )
}

export const getJson = function(url, params={}, csrfToken=false) {
    return get(url, params, csrfToken).then(
        response => response.json()
    )
}

export const postBare = function(url, params={}, csrfToken=false) {
    if (!csrfToken) {
        csrfToken = getCsrfToken() // Won't work in web worker.
    }
    const body = new FormData()
    body.append('csrfmiddlewaretoken', csrfToken)
    Object.keys(params).forEach(key => {
        const value = params[key]
        if (typeof(value)==="object" && value.file && value.filename) {
            body.append(key, value.file, value.filename)
        } else if (Array.isArray(value)) {
            value.forEach(item => body.append(`${key}[]`, item))
        } else if (typeof(value)==="object" && value.constructor.name !== 'File') {
            body.append(key, JSON.stringify(value))
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
    })
}

export const post = function(url, params={}, csrfToken=false) {
    return postBare(url, params, csrfToken).then(
        removeDjangoMessages
    ).then(
        handleFetchErrors
    )
}

// post and then return json and status
export const postJson = function(url, params={}, csrfToken=false) {
    return post(url, params, csrfToken).then(
        response => response.json().then(
            json => ({json, status: response.status})
        )
    )
}

export const ensureCSS = function(cssUrl) {
    if (typeof cssUrl === 'object') {
        cssUrl.forEach(url => ensureCSS(url))
        return
    }
    const url = `${settings.STATIC_URL}css/${cssUrl}?v=${transpile.VERSION}`,
        link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = url
    const styleSheet = Array.from(document.styleSheets).find(styleSheet => styleSheet.href === link.href)
    if (!styleSheet) {
        document.head.appendChild(link)
        return true
    }
    return false
}

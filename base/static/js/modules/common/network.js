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

export let postBare = function(url, params={}, csrfToken=false) {
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
    })
}

export let post = function(url, params={}, csrfToken=false) {
    return postBare(url, params, csrfToken).then(
        handleFetchErrors
    )
}

// post and then return json and status
export let postJson = function(url, params={}, csrfToken=false) {
    return post(url, params, csrfToken).then(
        response => response.json().then(
            json => ({json, status: response.status})
        )
    )
}

import {getCookie} from "../common"

export class ErrorHook {
    constructor() {

    }

    init() {
        window.onerror = (msg, url, lineNumber, columnNumber, errorObj) => this.onError(msg, url, lineNumber, columnNumber, errorObj)

        if (window.addEventListener) {
            window.addEventListener('unhandledrejection', rejection => this.onUnhandledRejection(rejection))
        }
    }

    logError(details) {
        const xhr = new XMLHttpRequest()

		xhr.open("POST", "/api/django_js_error_hook/", true)
		xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded')
		const cookie = getCookie('csrftoken')
		if (cookie) {
			xhr.setRequestHeader("X-CSRFToken", cookie)
		}
		const query = [], data = {
			context: navigator.userAgent,
			details
		}
		for (const key in data) {
			query.push(encodeURIComponent(key) + '=' + encodeURIComponent(data[key]))
		}
		xhr.send(query.join('&'))
    }

    onError(msg, url, lineNumber, columnNumber, errorObj) {
		let logMessage = url + ': ' + lineNumber + ': ' + msg
		if (columnNumber) {
			logMessage += ", " + columnNumber
		}
		if (errorObj && errorObj.stack) {
			logMessage += ", " + errorObj.stack
		}
		this.logError(logMessage)
	}

    onUnhandledRejection(rejection) {
        let logMessage = rejection.type
        if (rejection.reason) {
            if (rejection.reason.message) {
                logMessage += ", " + rejection.reason.message
            } else {
                logMessage += ", " + JSON.stringify(rejection.reason)
            }
            if (rejection.reason.stack) {
                logMessage += ", " + rejection.reason.stack
            }
        }
        this.logError(logMessage)
    }
}

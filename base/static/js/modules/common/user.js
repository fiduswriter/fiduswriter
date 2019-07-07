import {post, postJson} from "./network"

export const setLanguage = function(config, language) {
    return post('/api/i18n/setlang/', {language}).then(
        () => window.location.reload()
    )
}

export const getUserInfo = function() {
    return postJson('/api/user/info/')
}

export const loginUser = function(config, login, password, remember) {
    return post('/api/user/login/', {login, password, remember}).then(
        () => {
            config.loggedIn = true
        }
    )
}

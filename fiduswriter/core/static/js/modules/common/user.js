import {post} from "./network"

export const setLanguage = function(config, language) {
    return post('/api/i18n/setlang/', {language}).then(
        () => {
            // We delete the network cache as this contains the JS
            // translations.
            caches.keys().then(names => {
                for (const name of names) {
                    caches.delete(name)
                }
                window.location.reload()
            })
        }
    )
}

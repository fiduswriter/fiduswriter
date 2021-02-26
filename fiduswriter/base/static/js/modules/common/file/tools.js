import {postJson} from "../network"

export const shortFileTitle = function(title, path) {
    if (!path.length || path.endsWith('/')) {
        return title
    }
    return path.split('/').pop()
}

export const moveFile = function(fileId, title, path, moveUrl) {
    path = path.replace(/\/{2,}/g, '/') // replace multiple backslashes
    if (path.endsWith(title || gettext('Untitled'))) {
        path = path.split('/').slice(0, -1).join('/') + '/'
    }
    if (!path.startsWith('/')) {
        path = '/' + path
    }
    if (path === '/') {
        path = ''
    }
    return new Promise((resolve, reject) => {
        postJson(
            moveUrl,
            {id: fileId, path}
        ).then(
            ({json}) => {
                if (json.done) {
                    resolve(path)
                } else {
                    reject()
                }
            }
        )
    })

}

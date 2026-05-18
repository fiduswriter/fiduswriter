// Mock for `../../common` and similar paths
export const escapeText = str => {
    if (typeof str !== "string") {
        return String(str)
    }
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
}

export const shortFileTitle = (title, path) => {
    return title || path || "untitled"
}

export const addAlert = (type, message) => {
    if (typeof console !== "undefined") {
        console.log(`[${type}] ${message}`)
    }
}

export const get = _url => {
    return Promise.resolve({
        blob: () => Promise.resolve(new Blob()),
        json: () => Promise.resolve({})
    })
}

export const post = (_url, _params) => {
    return Promise.resolve({ok: true})
}

export const postJson = (_url, _data) => {
    return Promise.resolve({json: {}})
}

export const getJson = _url => {
    return Promise.resolve({})
}

export const convertDataURIToBlob = _dataURI => {
    return new Blob()
}

export const noSpaceTmp = () => "tmp"

export const longFilePath = (path, filename) => `${path}${filename}`

export default {
    escapeText,
    shortFileTitle,
    addAlert,
    get,
    post,
    postJson,
    getJson,
    convertDataURIToBlob,
    noSpaceTmp,
    longFilePath
}

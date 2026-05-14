// Mock for jszip
class JSZipMock {
    constructor() {
        this.files = {}
    }

    file(path, content) {
        if (content === undefined) {
            return this.files[path] || null
        }
        this.files[path] = {
            name: path,
            async: type => {
                if (type === "string") {
                    return Promise.resolve(content)
                }
                if (type === "blob") {
                    return Promise.resolve(new Blob([content]))
                }
                return Promise.resolve(content)
            }
        }
        return this
    }

    loadAsync(_data) {
        return Promise.resolve(this)
    }

    forEach(callback) {
        Object.keys(this.files).forEach(path =>
            callback(path, this.files[path])
        )
    }

    generateAsync(_options) {
        return Promise.resolve(new Blob())
    }

    static loadAsync(_data) {
        const zip = new JSZipMock()
        return Promise.resolve(zip)
    }
}

export default JSZipMock
export {JSZipMock as JSZip}

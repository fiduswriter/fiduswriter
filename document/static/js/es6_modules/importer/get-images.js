import 'whatwg-fetch'

export class GetImages {
    constructor(newImageEntries, entries) {
        this.newImageEntries = newImageEntries
        this.entries = entries
        this.counter = 0
    }

    init() {
        let that = this

        if (this.entries.length > 0) {
            if (this.entries[0].hasOwnProperty('url')) {
                return this.getImageUrlEntry()
            } else {
                return this.getImageZipEntry()
            }
        } else {
            return Promise.resolve()
        }
    }

    getImageZipEntry() {
        if (this.counter < this.newImageEntries.length) {
            return new Promise((resolve, reject) => {
                let fc = _.findWhere(
                    this.entries,
                    {filename: this.newImageEntries[this.counter].oldUrl.split('/').pop()}
                ).contents
                this.newImageEntries[this.counter]['file'] = new window.Blob(
                    [fc],
                    {type: this.newImageEntries[this.counter].file_type}
                )
                this.counter++
                this.getImageZipEntry().then(()=>{
                    resolve()
                })
            })
        } else {
            return Promise.resolve()
        }
    }

    getImageUrlEntry() {
        let that = this
        if (this.counter < this.newImageEntries.length) {
            return new Promise((resolve, reject) => {
                let getUrl = _.findWhere(
                    this.entries,
                    {filename: this.newImageEntries[this.counter].oldUrl.split('/').pop()}
                ).url
                fetch(getUrl).then(response => response.blob()).then(blob => {
                    that.newImageEntries[that.counter]['file'] = blob
                    that.counter++
                    that.getImageUrlEntry().then(()=>{
                        resolve()
                    })
                })
            })
        } else {
            return Promise.resolve()
        }
    }
}

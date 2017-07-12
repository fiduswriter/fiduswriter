import JSZipUtils from "jszip-utils"

export class GetImages {
    constructor(newImageEntries, entries) {
        this.newImageEntries = newImageEntries
        this.entries = entries
        this.counter = 0
    }

    init() {
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
                let fc = this.entries.find(entry => entry.filename === this.newImageEntries[this.counter].oldUrl.split('/').pop()).contents
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
        if (this.counter < this.newImageEntries.length) {
            return new Promise((resolve, reject) => {
                let getUrl = this.entries.find(entry => entry.filename === this.newImageEntries[this.counter].oldUrl.split('/').pop()).url
                let mimeString = this.newImageEntries[this.counter].file_type
                JSZipUtils.getBinaryContent(getUrl, (err, data) => {
                    let dataView = new DataView(data)
                    let blob = new window.Blob([dataView], {type: mimeString});
                    this.newImageEntries[this.counter]['file'] = blob
                    this.counter++
                    this.getImageUrlEntry().then(()=>{
                        resolve()
                    })
                })
            })
        } else {
            return Promise.resolve()
        }
    }
}

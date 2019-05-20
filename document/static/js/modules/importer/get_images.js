export class GetImages {
    constructor(images, entries) {
        this.images = images
        this.imageEntries = Object.values(this.images)
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
        if (this.counter < this.imageEntries.length) {
            return new Promise(resolve => {
                const fc = this.entries.find(entry => entry.filename === this.imageEntries[
                    this.counter
                ].image.split('/').pop()).contents
                this.imageEntries[this.counter]['file'] = new window.Blob(
                    [fc],
                    {type: this.imageEntries[this.counter].file_type}
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
        if (this.counter < this.imageEntries.length) {
            return new Promise(resolve => {
                const getUrl = this.entries.find(entry => entry.filename === this.imageEntries[this.counter].image.split('/').pop()).url
                const mimeString = this.imageEntries[this.counter].file_type
                import("jszip-utils").then(
                    ({default: JSZipUtils}) => JSZipUtils.getBinaryContent(getUrl, (err, data) => {
                        const dataView = new DataView(data)
                        const blob = new window.Blob([dataView], {type: mimeString})
                        this.imageEntries[this.counter]['file'] = blob
                        this.counter++
                        this.getImageUrlEntry().then(()=>{
                            resolve()
                        })
                    })
                )
            })
        } else {
            return Promise.resolve()
        }
    }
}

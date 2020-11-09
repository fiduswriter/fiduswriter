import {get} from "../common"

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
                ].image.split('/').pop()).content
                this.imageEntries[this.counter]['file'] = new window.Blob(
                    [fc],
                    {type: this.imageEntries[this.counter].file_type}
                )
                this.counter++
                this.getImageZipEntry().then(() => {
                    resolve()
                })
            })
        } else {
            return Promise.resolve()
        }
    }

    getImageUrlEntry() {
        if (this.counter < this.imageEntries.length) {
            const getUrl = this.entries.find(
                entry => entry.filename === this.imageEntries[this.counter].image.split('/').pop()
            ).url
            return get(getUrl).then(
                response => response.blob()
            ).then(
                blob => {
                    // const mimeString = this.imageEntries[this.counter].file_type
                    // const dataView = new DataView(blob)
                    // const newBlob = new window.Blob([dataView], {type: mimeString})
                    // this.imageEntries[this.counter]['file'] = newBlob
                    this.imageEntries[this.counter]['file'] = blob
                    this.counter++
                    return this.getImageUrlEntry()
                }
            )
        } else {
            return Promise.resolve()
        }
    }
}

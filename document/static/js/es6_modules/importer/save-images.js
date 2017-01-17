import {addAlert, csrfToken} from "../common"

export class SaveImages {
    constructor(newImageEntries, ImageTranslationTable, imageDB) {
        this.newImageEntries = newImageEntries
        this.ImageTranslationTable = ImageTranslationTable
        this.imageDB = imageDB
        this.counter = 0
    }

    init() {
        return this.sendImage()
    }

    sendImage() {
        if (this.counter < this.newImageEntries.length) {
            let formValues = new window.FormData()
            formValues.append('id', 0)
            formValues.append('title', this.newImageEntries[this.counter].title)
            formValues.append('imageCats', '')
            formValues.append('image', this.newImageEntries[this.counter].file,
                this.newImageEntries[this.counter].oldUrl.split('/').pop())
            formValues.append(
                'checksum',
                this.newImageEntries[this.counter].checksum
            )
            return new Promise((resolve, reject) => {
                jQuery.ajax({
                    url: '/usermedia/save/',
                    data: formValues,
                    type: 'POST',
                    dataType: 'json',
                    crossDomain: false, // obviates need for sameOrigin test
                    beforeSend: (xhr, settings) => xhr.setRequestHeader("X-CSRFToken", csrfToken),
                    success: (response, textStatus, jqXHR) => {
                        this.imageDB[response.values.pk] = response.values
                        let oldId = this.newImageEntries[this.counter].oldId
                        this.ImageTranslationTable[oldId] = response.values.pk
                        this.counter++
                        this.sendImage().then(() => resolve())
                    },
                    error: () => {
                        addAlert('error', gettext('Could not save ') +
                            this.newImageEntries[this.counter].title)
                        reject()
                    },
                    complete: () => {},
                    cache: false,
                    contentType: false,
                    processData: false
                })
            })

        } else {
            return Promise.resolve()
        }
    }
}

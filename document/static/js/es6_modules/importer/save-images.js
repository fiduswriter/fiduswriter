import {addAlert, csrfToken} from "../common/common"

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
        let that = this
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
                    beforeSend: function(xhr, settings) {
                        xhr.setRequestHeader("X-CSRFToken", csrfToken)
                    },
                    success: function(response, textStatus, jqXHR) {
                        that.imageDB[response.values.pk] = response.values
                        let oldId = that.newImageEntries[that.counter].oldId
                        that.ImageTranslationTable[oldId] = response.values.pk
                        that.counter++
                        that.sendImage().then(()=>{
                            resolve()
                        })
                    },
                    error: function() {
                        addAlert('error', gettext('Could not save ') +
                            that.newImageEntries[that.counter].title)
                        reject()
                    },
                    complete: function() {},
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

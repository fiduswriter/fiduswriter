import {imageEditTemplate} from "./templates"
import {setCheckableLabel, cancelPromise, addAlert, Dialog} from "../../common"

export class ImageEditDialog {
    constructor(imageDB, imageId = false) {
        this.imageDB = imageDB
        this.imageId = imageId
        this.dialog = false
    }

    //open a dialog for uploading an image
    init() {

        let returnPromise = new Promise(resolve => {

            this.dialog = new Dialog({
                title: this.imageId ? gettext('Update Image Information') : gettext('Upload Image'),
                id: 'editimage',
                body: imageEditTemplate({
                    image: this.imageId ? this.imageDB.db[this.imageId] : false,
                    cats: this.imageDB.cats
                }),
                buttons: [
                    {
                        text: this.imageId ? gettext('Update') : gettext('Upload'),
                        click: () => resolve(this.saveImage()),
                        classes: "fw-dark"
                    },
                    {
                        type: 'cancel'
                    }
                ]
            })
            this.dialog.open()

        })

        document.querySelectorAll('.fw-checkable-label').forEach(
            el => el.addEventListener('click', () => setCheckableLabel(el))
        )

        if (!this.imageId) {
            this.bindMediaUploadEvents()
        }
        return returnPromise
    }

    //add image upload events
    bindMediaUploadEvents() {
        let selectButton = document.querySelector('#editimage .fw-media-select-button'),
            mediaInput = document.querySelector('#editimage .fw-media-file-input'),
            mediaPreviewer = document.querySelector('#editimage .figure-preview > div')

        selectButton.addEventListener('click', () => mediaInput.click())

        mediaInput.addEventListener('change', function() {
            let file = mediaInput.files[0],
                fr = new window.FileReader()

            fr.onload = () => {
                mediaPreviewer.innerHTML = '<img src="' + fr.result + '" />'
            }
            fr.readAsDataURL(file)
        })
    }

    displayCreateImageError(errors) {
        Object.keys(errors).forEach(
            eKey => {
                let eMsg = `<div class="warning">${errors[eKey]}</div>`
                if ('error' == eKey) {
                    document.getElementById(`editimage`).insertAdjacentHTML(
                        'afterbegin',
                        eMsg
                    )
                } else {
                    document.getElementById(`id_${eKey}`).insertAdjacentHTML(
                        'afterend',
                        eMsg
                    )
                }
            }
        )
    }

    saveImage() {

        let imageData = {
            title: document.querySelector('#editimage .fw-media-title').value,
            cats: [].slice.call(document.querySelectorAll('#editimage .entry-cat:checked')).map(
                el => parseInt(el.value)
            )
        }

        if (this.imageId) {
            imageData.id = this.imageId
        } else {
            imageData.image = document.querySelector('#editimage .fw-media-file-input').files[0]
        }

        // Remove old warning messages
        document.querySelectorAll('#editimage .warning').forEach(
            el => el.parentElement.removeChild(el)
        )

        return new Promise(resolve => {
            this.imageDB.saveImage(imageData).then(
                imageId => {
                    this.dialog.close()
                    addAlert('success', gettext('The image has been updated.'))
                    this.imageId = imageId
                    resolve(imageId)
                },
                errors => {
                    this.displayCreateImageError(errors)
                    addAlert('error', gettext('Some errors were found. Please examine the form.'))
                }
            )
        })
    }

}

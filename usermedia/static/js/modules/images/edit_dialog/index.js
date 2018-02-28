import {imageEditTemplate} from "./templates"
import {setCheckableLabel, cancelPromise, addAlert} from "../../common"

export class ImageEditDialog {
    constructor(imageDB, imageId = false) {
        this.imageDB = imageDB
        this.imageId = imageId
    }

    //open a dialog for uploading an image
    init() {

        jQuery('body').append(imageEditTemplate({
            image: this.imageId ? this.imageDB.db[this.imageId] : false,
            cats: this.imageDB.cats
        }))

        let returnPromise = new Promise(resolve => {

            jQuery("#editimage").dialog({
                resizable: false,
                height: 'auto',
                width: 'auto',
                modal: true,
                buttons: [
                    {
                        text: this.imageId ? gettext('Update') : gettext('Upload'),
                        click: () => resolve(this.saveImage()),
                        class: "fw-button fw-dark"
                    },
                    {
                        text: gettext('Cancel'),
                        click: function () {
                            jQuery(this).dialog('close')
                            resolve(cancelPromise())
                        },
                        class: "fw-button fw-orange"
                    }
                ],
                close: function () {
                    jQuery(this).dialog('destroy').remove()
                }
            })

        })

        jQuery('.fw-checkable-label').bind('click', function () {
            setCheckableLabel(jQuery(this))
        })

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
                    jQuery('#editimage').prepend(eMsg)
                } else {
                    jQuery(`#id_${eKey}`).after(eMsg)
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
        jQuery('#editimage .warning').detach()

        return new Promise(resolve => {
            this.imageDB.saveImage(imageData).then(
                imageId => {
                    jQuery("#editimage").dialog('close')
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

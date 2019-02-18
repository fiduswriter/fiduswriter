import {imageEditTemplate} from "./templates"
import {setCheckableLabel, addAlert, Dialog, findTarget, ContentMenu} from "../../common"
import {figureEditModel} from './figure_edit_model'
export class ImageEditDialog {
    constructor(imageDB, editor, imageId = false) {
        this.imageDB = imageDB
        this.editor = editor
        this.imageId = imageId
        this.dialog = false
    }

    //open a dialog for uploading an image
    init() {

        const returnPromise = new Promise(resolve => {

            this.dialog = new Dialog({
                title: this.imageId ? gettext('Update Image Information') : gettext('Upload Image'),
                id: 'editimage',
                classes: 'fw-media-uploader',
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

        document.body.addEventListener('click', event => {
            const el = {}
            switch (true) {
                case findTarget(event, '.figure-edit-menu', el):
                    const contentMenu = new ContentMenu({
                        menu: figureEditModel(),
                        width: 220,
                        page: this.editor,
                        menuPos: {X: event.pageX, Y: event.pageY},
                        onClose: () => {
                            this.editor.view.focus()
                        }
                    })
                    contentMenu.open()
                    break;

                default:
                    break;
            }
        });

        if (!this.imageId) {
            this.bindMediaUploadEvents()
        }
        return returnPromise
    }

    //add image upload events
    bindMediaUploadEvents() {
        const selectButton = document.querySelector('#editimage .fw-media-select-button'),
            mediaInput = document.querySelector('#editimage .fw-media-file-input'),
            mediaPreviewer = document.querySelector('#editimage .figure-preview > div')

        selectButton.addEventListener('click', () => mediaInput.click())

        mediaInput.addEventListener('change', () =>{
            const file = mediaInput.files[0],
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
                const eMsg = `<div class="warning">${errors[eKey]}</div>`
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
        
        


        const imageData = {
            title: document.querySelector('#editimage .fw-media-title').value,
            cats: Array.from(document.querySelectorAll('#editimage .entry-cat:checked')).map(
                el => parseInt(el.value)
            ).join(',')
        }

        if (this.imageId) {
            imageData.id = this.imageId
        } else {
            imageData.image = document.querySelector('#editimage .fw-media-file-input').files[0]
        }
        console.log(imageData.image)
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
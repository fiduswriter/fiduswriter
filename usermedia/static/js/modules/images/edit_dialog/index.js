import {imageEditTemplate} from "./templates"
import {setCheckableLabel, addAlert, Dialog, ContentMenu} from "../../common"
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


        if (!this.imageId) {
            this.bindMediaUploadEvents()
        }

        document.querySelector('.figure-edit-menu').addEventListener('click', event => {
            event.preventDefault()
            event.stopImmediatePropagation()

            const contentMenu = new ContentMenu({
                menu: figureEditModel(),
                width: 220,
                page: this.editor,
                menuPos: {X: event.pageX-50, Y: event.pageY+50},
                onClose: () => {
                    this.editor.view.focus()
                }
            })
            contentMenu.open()
        })

        return returnPromise
    }

    //add image upload events
    bindMediaUploadEvents() {
        const selectButton = document.querySelector('#editimage .fw-media-select-button'),
            mediaInput = document.querySelector('#editimage .fw-media-file-input'),
            mediaPreviewer = document.querySelector('#editimage .figure-preview > div')

        selectButton.addEventListener('click', () =>{
                mediaInput.click()
        })

        mediaInput.addEventListener('change', () =>{
            const file = mediaInput.files[0],
                fr = new window.FileReader()
            fr.onload = () => {
                mediaPreviewer.innerHTML = '<img src="' + fr.result + '" />'
                this.cropMode(false)
            }
            fr.readAsDataURL(file)
            document.querySelector('.figure-edit-menu').classList.remove("hide")
        })
    }

    cropMode(val){
        const div = document.querySelector('#editimage .figure-preview > div')
        if (val){
            div.classList.add('crop-mode')
            document.querySelector('.btn-select-crop').classList.remove('hide')
            document.querySelector('.btn-cancel-crop').classList.remove('hide')
        } else {
            div.classList.remove('crop-mode')
            document.querySelector('.btn-select-crop').classList.add('hide')
            document.querySelector('.btn-cancel-crop').classList.add('hide')
        }
        const parentDiv = document.querySelector('#editimage').parentElement
        this.centerDialog(parentDiv)
    }

    centerDialog(parentDiv){
        const totalWidth = window.innerWidth,
            totalHeight = window.innerHeight,
            dialogWidth = parentDiv.clientWidth,
            dialogHeight = parentDiv.clientHeight,
            scrollTopOffset = window.pageYOffset,
            scrollLeftOffset = window.pageXOffset
        parentDiv.style.top = `${(totalHeight - dialogHeight)/2 + scrollTopOffset}px`
        parentDiv.style.left = `${(totalWidth - dialogWidth)/2 + scrollLeftOffset}px`
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

        const mediaInput = document.querySelector('#editimage .fw-media-file-input').files[0]
        const mediaPreviewer = document.querySelector('#editimage .figure-preview > div > img')
        const base64data = mediaPreviewer.src
        const bstr = atob(base64data.split(',')[1])
        let n = bstr.length
        const u8arr = new Uint8Array(n)
        while (n--){
            u8arr[n] = bstr.charCodeAt(n)
        }
        const file =  new File([u8arr], mediaInput.name, {type:mediaInput.type})
        const imageData = {
            title: document.querySelector('#editimage .fw-media-title').value,
            cats: Array.from(document.querySelectorAll('#editimage .entry-cat:checked')).map(
                el => parseInt(el.value)
            ).join(',')
        }

        if (this.imageId) {
            imageData.id = this.imageId
        } else {
            imageData.image = file//document.querySelector('#editimage .fw-media-file-input').files[0]
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
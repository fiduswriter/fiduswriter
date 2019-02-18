import {imageEditTemplate} from "./templates"
import {setCheckableLabel, addAlert, Dialog} from "../../common"

export class ImageEditDialog {
    constructor(imageDB, imageId = false) {
        this.imageDB = imageDB
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
                this.rotateBase64Image(fr.result,this.callback)
               // mediaPreviewer.innerHTML = '<img src="' + t + '" />'
            }
            fr.readAsDataURL(file)
            console.log(file)
        })
    }

    rotateBase64Image(base64data, callback) {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        const image = new Image()
        image.src = base64data
        image.onload = ()=> {
            canvas.height = image.width
            canvas.width = image.height

            ctx.rotate(90 * Math.PI / 180)
            ctx.translate(0, -canvas.width)
            ctx.drawImage(image, 0, 0);
            callback(canvas.toDataURL())
        }
    }
    callback(base64data){
        const mediaPreviewer = document.querySelector('#editimage .figure-preview > div')
        mediaPreviewer.innerHTML = '<img src="' + base64data + '" />'

        var arr = base64data.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
        while(n--){
            u8arr[n] = bstr.charCodeAt(n);
        }
        const f =  new File([u8arr], "test.jpeg", {type:mime});
        
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
        
        const mediaPreviewer = document.querySelector('#editimage .figure-preview > div > img')
        const base64data = mediaPreviewer.src;

        var arr = base64data.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
        console.log(arr[0],mime)
        while(n--){
            u8arr[n] = bstr.charCodeAt(n);
        }
        const f =  new File([u8arr], "test.png", {type:mime});


        const imageData = {
            title: document.querySelector('#editimage .fw-media-title').value,
            cats: Array.from(document.querySelectorAll('#editimage .entry-cat:checked')).map(
                el => parseInt(el.value)
            ).join(',')
        }

        if (this.imageId) {
            imageData.id = this.imageId
        } else {
            imageData.image = f//document.querySelector('#editimage .fw-media-file-input').files[0]
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

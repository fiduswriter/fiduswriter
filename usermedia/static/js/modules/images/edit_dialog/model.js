import Cropper from 'cropperjs'
export const imageEditModel = () => ({
    content: [{
            title: gettext('Rotate Left'),
            type: 'action',
            tooltip: gettext('Rotate-left'),
            order: 0,
            action: dialog => {
                rotateBase64Image(dialog.mediaPreviewer.src, dialog.mediaInput.type, 'left').then((response) => {
                    dialog.mediaPreviewer.src = response
                })
                if (dialog.rotation === 0) {
                    dialog.rotation = 270
                } else {
                    dialog.rotation -= 90
                }

            },
            icon: 'redo fa-rotate-180'
        },
        {
            title: gettext('Rotate Right'),
            type: 'action',
            tooltip: gettext('Rotate-right'),
            order: 0,
            action: dialog => {
                rotateBase64Image(dialog.mediaPreviewer.src, dialog.mediaInput.type, 'right').then((response) => {
                    dialog.mediaPreviewer.src = response
                })
                if (dialog.rotation === 270) {
                    dialog.rotation = 0
                } else {
                    dialog.rotation += 90
                }
            },

            icon: 'undo'
        },
        {
            title: gettext('Crop'),
            type: 'action',
            tooltip: gettext('Crop image'),
            order: 0,
            action: dialog => {
                const cropper = new Cropper(dialog.mediaPreviewer, {
                    viewMode: 1,
                    responsive: true,
                })
                toggleCropMode(true, dialog, cropper)
            },
            icon: 'crop'
        },
    ]
})

let oldButtons = false

const toggleCropMode = (val, dialog, cropper) => {
    if (val && !oldButtons) {
        dialog.mediaPreviewerDiv.classList.add('crop-mode')
        oldButtons = dialog.dialog.buttons
        dialog.dialog.setButtons([
            {
                text: gettext("Crop"),
                click: () => {
                    dialog.mediaPreviewer.src = cropper.getCroppedCanvas().toDataURL(
                        dialog.mediaInput.type
                    )
                    dialog.cropped = true
                    cropper.destroy()
                    toggleCropMode(false, dialog, cropper)
                },
                classes: "fw-dark"
            },
            {
                type: 'cancel',
                classes: "fw-orange",
                click: () => {
                    cropper.destroy()
                    toggleCropMode(false, dialog, cropper)
                }
            }
        ])
    } else {
        dialog.mediaPreviewerDiv.classList.remove('crop-mode')
        if (oldButtons) {
            dialog.dialog.buttons = oldButtons
            oldButtons = false
        }
    }
    dialog.dialog.refreshButtons()
    dialog.dialog.centerDialog()
}

const rotateBase64Image = (base64data, type, direction) => {
    return new Promise(resolve => {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        const image = new Image()
        image.src = base64data
        image.onload = () => {
            canvas.height = image.width
            canvas.width = image.height
            if (direction == 'left') {
                ctx.rotate(90 * Math.PI / 180)
                ctx.translate(0, -canvas.width)
            } else {
                ctx.rotate(-90 * Math.PI / 180)
                ctx.translate(-canvas.height, 0)
            }
            ctx.drawImage(image, 0, 0)
            resolve(canvas.toDataURL(type))
        }
    })
}

export const figureEditModel = ()=> ({
    content: [
        {
            title:gettext('Rotate Left'),
            type: 'action',
            tooltip: gettext('Rotate-left'),
            order: 0,
            action: editor => {
                const mediaInput = document.querySelector('#editimage .fw-media-file-input').files[0],
                        mediaPreviewer = document.querySelector('#editimage .figure-preview > div > img')
                rotateBase64Image(mediaPreviewer.src, mediaInput.type, 'left').then((response)=>{
                    mediaPreviewer.src = response
                })
            },
            icon: 'redo fa-rotate-180'
        },
        {
            title:gettext('Rotate Right'),
            type: 'action',
            tooltip: gettext('Rotate-right'),
            order: 0,
            action: editor => {
                const mediaInput = document.querySelector('#editimage .fw-media-file-input').files[0],
                        mediaPreviewer = document.querySelector('#editimage .figure-preview > div > img')
                rotateBase64Image(mediaPreviewer.src, mediaInput.type, 'right').then((response)=>{
                    mediaPreviewer.src = response
                })
            },

            icon: 'undo'
        },
    ]
})

export const rotateBase64Image = (base64data,type, direction)=> {
    return new Promise(resolve => { 
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        const image = new Image()
        image.src = base64data
        image.onload = ()=> {
            canvas.height = image.width
            canvas.width = image.height
            if(direction=='left'){
                ctx.rotate(90 * Math.PI / 180)
                ctx.translate(0, -canvas.width)
            }else{
                ctx.rotate(-90 * Math.PI / 180);
                ctx.translate(-canvas.height, 0);
            }   
            ctx.drawImage(image, 0, 0);
            resolve(canvas.toDataURL(type,0.9))
        }
    })
}
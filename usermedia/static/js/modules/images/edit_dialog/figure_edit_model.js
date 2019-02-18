export const figureEditModel = ()=> ({
    content: [
        {
            title:gettext('Rotate Left'),
            type: 'action',
            tooltip: gettext('Rotate-left'),
            order: 0,
            action: editor => {
                const selectButton = document.querySelector('#editimage .fw-media-select-button'),
                        mediaInput = document.querySelector('#editimage .fw-media-file-input'),
                        mediaPreviewer = document.querySelector('#editimage .figure-preview > div > img')
                rotateBase64Image(mediaPreviewer.src,'left').then((response)=>{
                    mediaPreviewer.src = response
                })
            },
        },
        {
            title:gettext('Rotate Right'),
            type: 'action',
            tooltip: gettext('Rotate-right'),
            order: 0,
            action: editor => {
                const selectButton = document.querySelector('#editimage .fw-media-select-button'),
                        mediaInput = document.querySelector('#editimage .fw-media-file-input'),
                        mediaPreviewer = document.querySelector('#editimage .figure-preview > div > img')
                rotateBase64Image(mediaPreviewer.src,'right').then((response)=>{
                    mediaPreviewer.src = response
                })
            },
        },
    ]
})

export const rotateBase64Image = (base64data, direction)=> {
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
            resolve(canvas.toDataURL())
        }
    })
}

export const callback = (base64data)=>{
    const mediaPreviewer = document.querySelector('#editimage .figure-preview > div')
    mediaPreviewer.innerHTML = '<img src="' + base64data + '" />'

    var arr = base64data.split(','), mime = arr[0].match(/:(.*?);/)[1],
    bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    const f =  new File([u8arr], "test.jpeg", {type:mime});
    
}

export const base64toFile = (base64data)=>{

        var arr = base64data.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
        console.log(arr[0],mime)
        while(n--){
            u8arr[n] = bstr.charCodeAt(n);
        }
        const f =  new File([u8arr], "test.png", {type:mime});
        return f;
}
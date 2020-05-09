export const modifyImages = function(htmlEl) {
    const imageLinks = htmlEl.querySelectorAll('img'),
        images = []

    imageLinks.forEach((el, index) => {
        const src = el.getAttribute('src').split('?')[0]
        let filename = `images/${src.split('/').pop()}`
        // JPGs are output as PNG elements as well.
        if (filename === 'images/') {
            // name was not retrievable so we give the image a unique numerical
            // name like 1.png, 2.jpg, 3.svg, etc. .
            filename = `images/${index}`
        }

        const newImg = document.createElement('img')
        // We set the src of the image as "data-src" for now so that the browser
        // won't try to load the file immediately
        newImg.setAttribute('data-src', filename)
        el.parentNode.replaceChild(newImg, el)

        if (!images.find(image => image.filename === filename)) {
            images.push({
                filename,
                url: src
            })
        }
    })

    return images
}

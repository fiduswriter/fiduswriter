export let createSlug = function(str) {
    str = str.replace(/[^a-zA-Z0-9\s]/g, "")
    str = str.toLowerCase()
    str = str.replace(/\s/g, '-')
    return str
}

export let findImages = function(htmlCode) {
    var imageLinks = jQuery(htmlCode).find('img'),
        images = []

    imageLinks.each(function(index) {
        var src, name, newImg
        src = jQuery(this).attr('src').split('?')[0]
        name = src.split('/').pop()
        // JPGs are output as PNG elements as well.
        if (name === '') {
            // name was not retrievable so we give the image a unique numerical name like 1.png, 2.jpg, 3.svg, etc. .
            name = index
        }

        newImg = document.createElement('img')
        // We set the src of the image as "data-src" for now so that the browser won't try to load the file immediately
        newImg.setAttribute('data-src', name)
        this.parentNode.replaceChild(newImg, this)

        if (!_.findWhere(images, {
                'filename': name
            })) {

            images.push({
                'filename': name,
                'url': src
            })
        }
    })

    return images
}

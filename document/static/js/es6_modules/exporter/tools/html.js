export let findImages = function(htmlCode) {
    let imageLinks = jQuery(htmlCode).find('img'),
        images = []

    imageLinks.each(function(index) {
        let src = jQuery(this).attr('src').split('?')[0]
        let name = src.split('/').pop()
        // JPGs are output as PNG elements as well.
        if (name === '') {
            // name was not retrievable so we give the image a unique numerical
            // name like 1.png, 2.jpg, 3.svg, etc. .
            name = index
        }

        let newImg = document.createElement('img')
        // We set the src of the image as "data-src" for now so that the browser
        // won't try to load the file immediately
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

export let escapeText = function(text) {
    return text
        .replace(/"/g, '&quot;')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
}

// all descendant text nodes for dom nodes
export let domDescendantTexNodes = function(node) {
    let returnValue = []
    let childNodes = [].slice.call(node.childNodes)
    childNodes.forEach(
        subNode => {
            if (subNode.nodeType===3) {
                returnValue.push(subNode)
            } else if (subNode.nodeType===1) {
                returnValue = returnValue.concat(domDescendantTexNodes(subNode))
            }
        }
    )
    return returnValue
}

import {BibliographyDB} from "../bibliography/database"

export let createSlug = function(str) {
    if (str==='') {
        str = gettext('Untitled')
    }
    str = str.replace(/[^a-zA-Z0-9\s]/g, "")
    str = str.toLowerCase()
    str = str.replace(/\s/g, '-')
    return str
}

export let findImages = function(htmlCode) {
    let imageLinks = jQuery(htmlCode).find('img'),
        images = []

    imageLinks.each(function(index) {
        let src = jQuery(this).attr('src').split('?')[0]
        let name = src.split('/').pop()
        // JPGs are output as PNG elements as well.
        if (name === '') {
            // name was not retrievable so we give the image a unique numerical name like 1.png, 2.jpg, 3.svg, etc. .
            name = index
        }

        let newImg = document.createElement('img')
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

export let getDatabasesIfNeeded = function(object, doc, callback) {
    let p = []

    if (!object.bibDB) {
        p.push(
            new window.Promise((resolve) => {
                object.bibDB = new BibliographyDB(doc.owner.id, false, false, false)
                object.bibDB.getDB(resolve)
            })
        )
    }
    if (!object.imageDB) {
        p.push(
            new window.Promise((resolve) => {
                object.imageDB = new ImageDB(doc.owner.id)
                object.imageDB.getDB(resolve)
            })
        )
    }
    window.Promise.all(p).then(function(){
        callback()
    })
}

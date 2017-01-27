import {activateWait, deactivateWait, csrfToken} from "../common"

/* A class that holds information about images uploaded by the user. */

export class ImageDB {
    constructor(userId) {
        this.userId = userId
        this.db = {}
        this.cats = []
    }

    getDB() {
        this.db = {}
        this.cats = []

        activateWait()
        return new Promise((resolve, reject) => {
            jQuery.ajax({
                url: '/usermedia/images/',
                data: {
                    'owner_id': this.userId
                },
                type: 'POST',
                dataType: 'json',
                crossDomain: false, // obviates need for sameOrigin test
                beforeSend: (xhr, settings) =>
                    xhr.setRequestHeader("X-CSRFToken", csrfToken),
                success: (response, textStatus, jqXHR) => {
                    this.cats = response.imageCategories
                    let pks = []
                    for (let i = 0; i < response.images.length; i++) {
                        response.images[i].image = response.images[i].image.split('?')[0]
                        this.db[response.images[i]['pk']] = response.images[i]
                        pks.push(response.images[i]['pk'])
                    }
                    resolve(pks)
                },
                error: (jqXHR, textStatus, errorThrown) => {
                    reject(jqXHR.responseText)
                },
                complete: () => deactivateWait()
            })
        })
    }

    saveImage(postData) {
        activateWait()

        return new Promise((resolve, reject) => {
            // Send to server
            jQuery.ajax({
                url: '/usermedia/save/',
                data: postData,
                type: 'POST',
                dataType: 'json',
                crossDomain: false, // obviates need for sameOrigin test
                beforeSend: (xhr, settings) =>
                    xhr.setRequestHeader("X-CSRFToken", csrfToken),
                success: (response, textStatus, jqXHR) => {
                    if (Object.keys(response.errormsg).length) {
                        reject(response.errormsg)
                    } else {
                        this.db[response.values.pk] = response.values
                        resolve(response.values.pk)
                    }
                },
                error: (jqXHR, textStatus, errorThrown) => {
                    let error = '' // Fallback -- if we get don't have an error message, we show an empty error.
                    if (jqXHR && jqXHR.responseJSON && jqXHR.responseJSON.errormsg) {
                        error = jqXHR.responseJSON.errormsg
                    }
                    reject({error})
                },
                complete: () => deactivateWait(),
                cache: false,
                contentType: false,
                processData: false
            })
        })
    }

}

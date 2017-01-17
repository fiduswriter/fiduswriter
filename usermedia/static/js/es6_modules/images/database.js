import {activateWait, deactivateWait, addAlert, csrfToken} from "../common"


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
                    addAlert('error', jqXHR.responseText)
                    reject()
                },
                complete: () => deactivateWait()
            })
        })
    }

    createImage(postData, callback) {
        activateWait()
        // Remove old warning messages
        jQuery('#uploadimage .warning').detach()
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
                if (this.displayCreateImageError(response.errormsg)) {
                    this.db[response.values.pk] = response.values
                    addAlert('success', gettext('The image has been uploaded'))
                    callback(response.values.pk)
                } else {
                    addAlert('error', gettext(
                        'Some errors are found. Please examine the form.'
                    ))
                }
            },
            error: (jqXHR, textStatus, errorThrown) => {
                if (jqXHR && jqXHR.responseJSON && jqXHR.responseJSON.errormsg) {
                    addAlert('error', jqXHR.responseJSON.errormsg)
                }
            },
            complete: () => deactivateWait(),
            cache: false,
            contentType: false,
            processData: false
        })
    }

    displayCreateImageError(errors) {
        let noError = true
        for (let eKey in errors) {
            let eMsg = '<div class="warning">' + errors[eKey] + '</div>'
            if ('error' == eKey) {
                jQuery('#uploadimage').prepend(eMsg)
            } else {
                jQuery('#id_' + eKey).after(eMsg)
            }
            noError = false
        }
        return noError
    }

}

import {activateWait, deactivateWait, addAlert, csrfToken} from "../common"


/* A class that holds information about styles uploaded by the user. */

export class StyleDB {
    constructor(userId) {
        this.userId = userId
        this.db = {}

    }
    getDB(Default_List) {
        this.db = {}
	
        activateWait()
	return new Promise((resolve, reject) => {
          jQuery.ajax({
            url: '/style/stylelist/',
            data: {
                'owner_id': this.userId,
                'Default_List': Default_List,
            },
            type: 'POST',
            dataType: 'json',
            crossDomain: false, // obviates need for sameOrigin test
            beforeSend: (xhr, settings) =>
                    xhr.setRequestHeader("X-CSRFToken", csrfToken),

            success: (response, textStatus, jqXHR) => {
                let pks = []
                 for (let i = 0; i < response.styles.length; i++) {
                    this.db[response.styles[i]['pk']] = response.styles[i]
                    pks.push(response.styles[i]['pk'])
                }
               resolve(pks)
            },
            error: (jqXHR, textStatus, errorThrown) =>{
                addAlert('error', jqXHR.responseText)
		reject()
            },
            complete: () => deactivateWait()
        })
      })

    }

    createStyle(postData, callback) {
        let that = this
        activateWait()
        // Remove old warning messages
        jQuery('#uploadstyle .warning').detach()
        // Send to server
        jQuery.ajax({
            url: '/style/save/',
            data: postData,
            type: 'POST',
            dataType: 'json',
            crossDomain: false, // obviates need for sameOrigin test
            beforeSend: function(xhr, settings) {
                xhr.setRequestHeader("X-CSRFToken", csrfToken)
            },
            success: function (response, textStatus, jqXHR) {
                if (that.displayCreateStyleError(response.errormsg)) {
                    that.db[response.values.pk] = response.values
                    addAlert('success', gettext('The style has been uploaded'))
                    callback(response.values.pk)
                } else {
                    addAlert('error', gettext(
                        'Some errors are found. Please examine the form.'
                    ))
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                if (jqXHR && jqXHR.responseJSON && jqXHR.responseJSON.errormsg) {
                    addAlert('error', jqXHR.responseJSON.errormsg)
                }
            },
            complete: function () {
                deactivateWait()
            },
            cache: false,
            contentType: false,
            processData: false
        })
    }

    displayCreateStyleError(errors) {
        let noError = true
        for (let eKey in errors) {
            let eMsg = '<div class="warning">' + errors[eKey] + '</div>'
            if ('error' == eKey) {
                jQuery('#uploadstyle').prepend(eMsg)
            } else {
                jQuery('#id_' + eKey).after(eMsg)
            }
            noError = false
        }
        return noError
    }

    /** Delete a list of Style items both locally and on the server.
     * @function deleteStyle
     * @param ids A list of style item ids that are to be deleted.
     */
    deleteStyle(ids, callback) {
        let that = this
        for (let i = 0; i < ids.length; i++) {
            ids[i] = parseInt(ids[i])
        }
        let postData = {
            'ids[]': ids
        }
        activateWait()
        jQuery.ajax({
            url: '/style/delete/',
            data: postData,
            type: 'POST',
            crossDomain: false, // obviates need for sameOrigin test
            beforeSend: function(xhr, settings) {
                xhr.setRequestHeader("X-CSRFToken", csrfToken)
            },
            success: function (response, textStatus, jqXHR) {
                for (let i = 0; i < ids.length; i++) {
                    delete that.db[ids[i]]
                }
                addAlert('success', gettext(
                    'The style item(s) have been deleted'))
                if (callback) {
                    callback(ids)
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                addAlert('error', jqXHR.responseText)
            },
            complete: function () {
                deactivateWait()
            }
        })
    }
}

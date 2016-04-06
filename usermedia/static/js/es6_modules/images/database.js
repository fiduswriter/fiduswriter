/* A class that holds information about images uploaded by the user. */

export class ImageDB {
    constructor(userId) {
        this.userId = userId
        this.db = {}
        this.cats = []
    }

    getDB(callback) {
        let that = this
        this.db = {}
        this.cats = []

        $.activateWait()

        $.ajax({
            url: '/usermedia/images/',
            data: {
                'owner_id': this.userId
            },
            type: 'POST',
            dataType: 'json',
            success: function (response, textStatus, jqXHR) {
                that.cats = response.imageCategories
                for (let i = 0; i < response.images.length; i++) {
                    response.images[i].image = response.images[i].image.split('?')[0]
                    that.db[response.images[i]['pk']] = response.images[i]
                }
                if (callback) {
                    callback()
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                $.addAlert('error', jqXHR.responseText)
            },
            complete: function () {
                $.deactivateWait()
            }
        })

    }

}

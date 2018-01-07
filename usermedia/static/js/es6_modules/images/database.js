import {activateWait, deactivateWait, postJson, addAlert} from "../common"

/* A class that holds information about images uploaded by the user. */

export class ImageDB {
    constructor() {
        this.db = {}
        this.cats = []
    }

    getDB() {
        this.db = {}
        this.cats = []

        activateWait()

        return postJson('/usermedia/images/').then(
            response => {
                this.cats = response.imageCategories
                let ids = response.images.map(
                    image => {
                        image.image = image.image.split('?')[0]
                        this.db[image.id] = image
                        return image.id
                    }
                )
                return ids
            }
        )
    }

    saveImage(postData) {

        activateWait()

        return postJson(
            '/usermedia/save/',
            postData
        ).then(
            response => {
                if (Object.keys(response.errormsg).length) {
                    return Promise.reject(response.errormsg)
                } else {
                    this.db[response.values.id] = response.values
                    return response.values.id
                }
                deactivateWait()
            }
        ).catch(
            errors => {
                addAlert('error', gettext('Could not save image'))
                deactivateWait()
                if (errors) {
                    return Promise.reject(errors)
                }
            }
        )

    }

}

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

        return postJson('/api/usermedia/images/').then(
            ({json}) => {
                this.cats = json.imageCategories
                json.images.forEach(
                    image => {
                        image.image = image.image.split('?')[0]
                        this.db[image.id] = image
                    }
                )
                deactivateWait()
                return
            }
        )
    }

    saveImage(postData) {

        activateWait()

        return postJson(
            '/api/usermedia/save/',
            postData
        ).then(
            ({json}) => {
                deactivateWait()
                if (Object.keys(json.errormsg).length) {
                    return Promise.reject(new Error(json.errormsg))
                } else {
                    this.db[json.values.id] = json.values
                    return json.values.id
                }
            }
        ).catch(
            error => {
                addAlert('error', gettext('Could not save image'))
                deactivateWait()
                throw (error)
            }
        )

    }

}

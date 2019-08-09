import {whenReady, postJson} from "../common"

export class DocTemplatesEditor {
    constructor({app, staticUrl, user}, idString) {
        this.app = app
        this.staticUrl = staticUrl
        this.user = user
        this.id = parseInt(idString)
    }

    init() {
        return postJson('/api/user_template_manager/get/', {id: this.id}). then(
            ({json}) => {
                this.template = json
                console.log({json})
                return whenReady()
            }
        )
    }
}

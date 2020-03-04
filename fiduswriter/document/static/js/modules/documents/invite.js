import {postJson} from "../common"

export class DocumentInvite {

    constructor({app}, id) {
        this.app = app
        this.id = id
    }

    init() {
        if (!this.app.config.user.is_authenticated) {
            // The user is not logged in and will possibly click around on the
            // outer pages for a while before signing up.
            // We store the invite id in the app so that it can be found there
            // and used if the user ends up signing up later during this
            // browsing session.
            this.app.inviteId = this.id
            this.app.page = this.app.openLoginPage()
            return this.app.page.init()
        }

        return postJson(
            '/api/document/invite/',
            {id: this.id}
        ).then(
            ({json}) => {
                window.history.replaceState({}, "", json.redirect)
                return this.app.selectPage()
            }
        )
    }
}

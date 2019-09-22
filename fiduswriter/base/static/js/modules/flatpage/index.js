import {whenReady, postJson} from "../common"
import {PreloginPage} from "../prelogin"

export class FlatPage extends PreloginPage {
    constructor({app, isFree, language, registrationOpen, staticUrl}, url) {
        super({app, isFree, language, registrationOpen, staticUrl})
        this.url = url
    }

    init() {
        return Promise.all([
            whenReady(),
            this.getPageData(),
        ]).then(() => {
            this.activateFidusPlugins()
            this.render()
            this.bind()
        })
    }

    getPageData() {
        return postJson(`/api/base/flatpage/`, {url: this.url}).then(
            ({json}) => {
                this.title = json.title
                this.contents = `<div>
                    <h1 class="fw-login-title">${json.title}</h1>
                    ${json.content}
                </div>`
            }
        ).catch(
            () => {
                this.title = gettext('Page not found')
                this.contents = `<div>
                    <h1 class="fw-login-title">${gettext('Error 404')}</h1>
                    <p>${gettext('The page you are looking for cannot be found.')}</p>
                </div>`
            }
        )
    }


}

import {BibliographyOverview} from "../bibliography/overview"
import {DocumentOverview} from "../documents/overview"
import {Editor} from "../editor"
import {ImageOverview} from "../images/overview"
import {ContactsOverview} from "../contacts"
import {Profile} from "../profile"
import {getUserInfo} from "../common"


export class App {
    constructor(config = {}) {
        this.config = config
    }

    init() {
        getUserInfo().then(
            ({json}) => {
                this.config.user = json
                this.selectPage()
            }
        )
    }

    selectPage() {
        const pathnameParts = window.location.pathname.split('/')

        switch(pathnameParts[1]) {
            case "usermedia":
                this.page = new ImageOverview(this.config)
                break
            case "bibliography":
                this.page = new BibliographyOverview(this.config)
                break
            case "user":
                switch(pathnameParts[2]) {
                    case "profile":
                        this.page = new Profile(this.config)
                        break
                    case "team":
                        this.page = new ContactsOverview(this.config)
                        break
                }
                break
            case "document":
                let id = parseInt(pathnameParts[2])
                if (isNaN(id)) {
                    id = 0
                }
                this.page = new Editor(id, this.config)
                break
            case "":
                this.page = new DocumentOverview(this.config)
                break
        }
        if (this.page) {
            this.page.init()
        }
    }
}

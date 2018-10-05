import {teammemberTemplate} from "./templates"
import {deleteMemberDialog} from "./manage"
import {postJson, addAlert, OverviewMenuView, findTarget, whenReady, baseBodyTemplate, setDocTitle} from "../common"
import {FeedbackTab} from "../feedback"
import {SiteMenu} from "../menu"
import {menuModel} from "./menu"

export class ContactsOverview {
    constructor({app, user, staticUrl}) {
        this.app = app
        this.username = user.username
        this.staticUrl = staticUrl
    }

    init() {
        whenReady().then(() => {
            this.render()
            let smenu = new SiteMenu("") // Nothing highlighted.
            smenu.init()
            this.menu = new OverviewMenuView(this, menuModel)
            this.menu.init()
            this.bind()
            this.getList()
        })
    }

    render() {
        document.body = document.createElement('body')
        document.body.innerHTML = baseBodyTemplate({
            contents: `<ul id="fw-overview-menu"></ul>
            <div class="fw-table-wrapper">
                <table id="team-table" class="tablesorter fw-document-table">
                    <thead class="fw-document-table-header">
                        <tr>
                            <td width="30"></td>
                            <th width="350">${gettext("Contacts")}</th>
                            <th width="350">${gettext("E-mail address")}</th>
                            <th width="50" align="center">${gettext("Delete")}</th>
                        </tr>
                    </thead>
                    <tbody class="fw-document-table-body fw-large">
                    </tbody>
                </table>
            </div>`,
            username: this.username,
            staticUrl: this.staticUrl
        })
        setDocTitle(gettext('Team Members'))
        const feedbackTab = new FeedbackTab({staticUrl: this.staticUrl})
        feedbackTab.init()
    }

    getList() {

        postJson('/user/team/list/').then(
            ({json}) => {
                document.querySelector('#team-table tbody').innerHTML += teammemberTemplate({members: json.team_members})
            }
        ).catch(
            error => {
                addAlert('error', gettext('Could not obtain contacts list'))
                throw(error)
            }
        )
    }

    bind() {
        document.body.addEventListener('click', event => {
            let el = {}
            switch (true) {
                case findTarget(event, '.delete-single-member', el):
                    //delete single user
                    deleteMemberDialog([el.target.dataset.id])
                    break
                case findTarget(event, 'a', el):
                    if (el.target.hostname === window.location.hostname) {
                        event.preventDefault()
                        this.app.goTo(el.target.href)
                    }
                    break
                default:
                    break
            }
        })
    }

    // get IDs of selected contacts
    getSelected() {
        return Array.from(
            document.querySelectorAll('.entry-select:checked:not(:disabled)')
        ).map(el => parseInt(el.getAttribute('data-id')))
    }


}

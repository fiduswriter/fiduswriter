import {teammemberTemplate} from "./templates"
import {DeleteContactDialog} from "./delete_dialog"
import {postJson, addAlert, OverviewMenuView, findTarget, whenReady, baseBodyTemplate, setDocTitle, DatatableBulk} from "../common"
import {FeedbackTab} from "../feedback"
import {SiteMenu} from "../menu"
import {menuModel, bulkModel} from "./menu"

export class ContactsOverview {
    constructor({app, user, staticUrl, registrationOpen}) {
        this.app = app
        this.user = user
        this.staticUrl = staticUrl
        this.registrationOpen = registrationOpen
    }

    init() {
        whenReady().then(() => {
            this.render()
            const smenu = new SiteMenu("") // Nothing highlighted.
            smenu.init()
            this.menu = new OverviewMenuView(this, menuModel)
            this.menu.init()
            this.bind()
            this.getList()
        })
    }

    render() {
        const dt_bulk = new DatatableBulk(this, bulkModel)

        document.body = document.createElement('body')
        document.body.innerHTML = baseBodyTemplate({
            contents: `<div class="fw-table-wrapper">
                <table id="team-table" class="tablesorter fw-data-table">
                    <thead class="fw-data-table-header">
                        <tr>
                            <td width="30">${dt_bulk.getHTML()}</td>
                            <th width="350">${gettext("Contacts")}</th>
                            <th width="350">${gettext("E-mail address")}</th>
                            <th width="50" align="center">${gettext("Delete")}</th>
                        </tr>
                    </thead>
                    <tbody class="fw-data-table-body fw-large">
                    </tbody>
                </table>
            </div>`,
            user: this.user,
            staticUrl: this.staticUrl,
            hasOverview: true
        })
        setDocTitle(gettext('Team Members'), this.app)
        const feedbackTab = new FeedbackTab({staticUrl: this.staticUrl})
        feedbackTab.init()

        dt_bulk.init(document.querySelector('#team-table'))
    }

    getList() {

        postJson('/api/user/team/list/').then(
            ({json}) => {
                document.querySelector('#team-table tbody').innerHTML += teammemberTemplate({members: json.team_members})
            }
        ).catch(
            error => {
                addAlert('error', gettext('Could not obtain contacts list'))
                throw (error)
            }
        )
    }

    bind() {
        document.body.addEventListener('click', event => {
            const el = {}
            switch (true) {
                case findTarget(event, '.delete-single-member', el): {
                    //delete single user
                    const dialog = new DeleteContactDialog([el.target.dataset.id])
                    dialog.init()
                    break
                }
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

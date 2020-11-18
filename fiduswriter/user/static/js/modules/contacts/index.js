import {teammemberTemplate} from "./templates"
import {DeleteContactDialog} from "./delete_dialog"
import {postJson, addAlert, OverviewMenuView, findTarget, whenReady, baseBodyTemplate, setDocTitle, DatatableBulk} from "../common"
import {FeedbackTab} from "../feedback"
import {SiteMenu} from "../menu"
import {menuModel, bulkMenuModel} from "./menu"

export class ContactsOverview {
    constructor({app, user}) {
        this.app = app
        this.user = user
    }

    init() {
        return whenReady().then(() => {
            this.render()
            const smenu = new SiteMenu(this.app, "") // Nothing highlighted.
            smenu.init()
            this.menu = new OverviewMenuView(this, menuModel)
            this.menu.init()
            this.bind()
            this.getList()
        })
    }

    render() {
        this.dtBulk = new DatatableBulk(this, bulkMenuModel())

        this.dom = document.createElement('body')
        this.dom.innerHTML = baseBodyTemplate({
            contents: `<div class="fw-table-wrapper">
                <table id="team-table" class="tablesorter fw-data-table">
                    <thead class="fw-data-table-header">
                        <tr>
                            <td width="30">${this.dtBulk.getHTML()}</td>
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
            hasOverview: true
        })
        document.body = this.dom
        setDocTitle(gettext('Team Members'), this.app)
        const feedbackTab = new FeedbackTab()
        feedbackTab.init()

        this.dtBulk.init(
            this.dom.querySelector('#team-table'))
    }

    getList() {
        if (this.app.isOffline()) {
            return this.showCached()
        }
        return postJson('/api/user/team/list/').then(
            ({json}) => {
                // Update data in the indexed DB
                this.app.indexedDB.clearData("user_contacts").then(
                    this.app.indexedDB.insertData("user_contacts", json.team_members)
                )
                this.dom.querySelector('#team-table tbody').innerHTML += teammemberTemplate({members: json.team_members})
            }
        ).catch(
            error => {
                if (this.app.isOffline()) {
                    return this.showCached()
                } else {
                    addAlert('error', gettext('Could not obtain contacts list'))
                    throw (error)
                }
            }
        )
    }

    showCached() {
        return this.app.indexedDB.readAllData("user_contacts").then(response => {
            this.dom.querySelector('#team-table tbody').innerHTML += teammemberTemplate({members: response})
        })
    }

    bind() {
        this.dom.addEventListener('click', event => {
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
            this.dom.querySelectorAll('.entry-select:checked:not(:disabled)')
        ).map(el => parseInt(el.getAttribute('data-id')))
    }


}

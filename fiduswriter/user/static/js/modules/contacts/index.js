import deepEqual from "fast-deep-equal"
import {contactTemplate} from "./templates"
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
        setDocTitle(gettext('Contacts'), this.app)
        const feedbackTab = new FeedbackTab()
        feedbackTab.init()

        this.dtBulk.init(
            this.dom.querySelector('#team-table'))
    }

    getList() {
        const cachedPromise = this.showCached()
        if (this.app.isOffline()) {
            return cachedPromise
        }
        return postJson('/api/user/contacts/list/').then(
            ({json}) => {
                return cachedPromise.then(oldJson => {
                    if (!deepEqual(json, oldJson)) {
                        this.updateIndexedDB(json)
                        this.initializeView(json)
                    }
                })

            }
        ).catch(
            error => {
                if (!this.app.isOffline()) {
                    addAlert('error', gettext('Could not obtain contacts list'))
                    throw (error)
                }
            }
        )
    }

    initializeView(json) {
        this.dom.querySelector('#team-table tbody').innerHTML += contactTemplate({contacts: json.contacts})
        return json
    }

    showCached() {
        return this.loaddatafromIndexedDB().then(json => {
            if (!json) {
                return
            }
            return this.initializeView(json)
        })
    }

    loaddatafromIndexedDB() {
        return this.app.indexedDB.readAllData("user_data").then(
            response => {
                if (!response.length) {
                    return false
                }
                const data = response[0]
                delete data.id
                return data
            }
        )

    }

    updateIndexedDB(json) {
        // Update data in the indexed DB
        this.app.indexedDB.clearData("user_data").then(
            this.app.indexedDB.insertData("user_data", json)
        )
    }

    bind() {
        this.dom.addEventListener('click', event => {
            const el = {}
            switch (true) {
            case findTarget(event, '.delete-single-contact', el): {
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

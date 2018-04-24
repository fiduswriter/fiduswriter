import {teammemberTemplate} from "./templates"
import {deleteMemberDialog} from "./manage"
import {postJson, addAlert, OverviewMenuView, findTarget} from "../common"
import {SiteMenu} from "../menu"
import {menuModel} from "./menu"

export class ContactsOverview {
    constructor() {
        let smenu = new SiteMenu("") // Nothing highlighted.
        smenu.init()
        this.menu = new OverviewMenuView(this, menuModel)
        this.menu.init()
        this.bind()
        this.getList()
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
        document.addEventListener('click', event => {
            let el = {}
            switch (true) {
                case findTarget(event, '.delete-single-member', el):
                    //delete single user
                    deleteMemberDialog([el.target.dataset.id])
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

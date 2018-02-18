import {teammemberTemplate} from "./templates"
import {deleteMemberDialog} from "./manage"
import {addDropdownBox, postJson, addAlert, OverviewMenuView} from "../common"
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
            json => {
                document.querySelector('#team-table tbody').innerHTML += teammemberTemplate({members: json.team_members})
            }
        ).catch(
            () => addAlert('error', gettext('Could not obtain contacts list'))
        )
    }

    bind() {
        jQuery(document).ready(function() {

            //delete single user
            jQuery(document).on('click', '.delete-single-member', function() {
                deleteMemberDialog([jQuery(this).attr('data-id')])
            })

        })
    }

    // get IDs of selected contacts
    getSelected() {
        return [].slice.call(
            document.querySelectorAll('.entry-select:checked:not(:disabled)')
        ).map(el => parseInt(el.getAttribute('data-id')))
    }


}

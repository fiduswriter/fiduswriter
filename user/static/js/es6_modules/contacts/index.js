import {teammemberTemplate} from "./templates"
import {deleteMemberDialog} from "./manage"
import {addDropdownBox, csrfToken, addAlert, OverviewMenuView} from "../common"
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
        jQuery.ajax({
            url: '/user/team/list/',
            data: {},
            type: 'POST',
            dataType: 'json',
            crossDomain: false, // obviates need for sameOrigin test
            beforeSend: (xhr, settings) =>
                xhr.setRequestHeader("X-CSRFToken", csrfToken),
            success: (response, textStatus, jqXHR) => {
                //intialize the teammember table
                jQuery('#team-table tbody').append(teammemberTemplate({members: response.team_members}))
            },
            error: (jqXHR, textStatus, errorThrown) => {
                addAlert('error', errorThrown)
            },
            complete: () => {}
        })
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

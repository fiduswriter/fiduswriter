import {DocumentOverviewActions} from "./actions"
import {DocumentOverviewMenus} from "./menus"
import {documentsListTemplate, documentsListItemTemplate} from "./templates"
import {BibliographyDB} from "../../bibliography/database"
import {ImageDB} from "../../images/database"
import {activateWait, deactivateWait, addAlert, localizeDate, csrfToken} from "../../common/common"
import {Menu} from "../../menu/menu"
/*
* Helper functions for the document overview page.
*/

export class DocumentOverview {

    constructor () {
        this.documentList = []
        this.user = false
        this.teamMembers = []
        this.accessRights = []
        this.mod = {}
        new DocumentOverviewActions(this)
        new DocumentOverviewMenus(this)
        new Menu("documents")
        this.bind()
    }

    bind() {
        jQuery(document).ready(() => this.getDocumentListData())

    }

    // Get the bibliography database -- only executed if needed (when importing, etc.).
    getBibDB(callback) {
        if (!this.bibDB) { // Don't get the bibliography again if we already have it.
            this.bibDB = new BibliographyDB(this.user.id, true, false, false)
            this.bibDB.getDB(() => {
                callback()
            })
        } else {
            callback()
        }
    }

    getImageDB(callback) {
        if (!this.imageDB) {
            let imageGetter = new ImageDB(this.user.id)
            imageGetter.getDB(() => {
                this.imageDB = imageGetter.db
                callback()
            })
        } else {
            callback()
        }
    }

    getDocumentListData(id) {
        activateWait()
        jQuery.ajax({
            url: '/document/documentlist/',
            data: {},
            type: 'POST',
            dataType: 'json',
            crossDomain: false, // obviates need for sameOrigin test
            beforeSend: (xhr, settings) => {
                xhr.setRequestHeader("X-CSRFToken", csrfToken)
            },
            success: (response, textStatus, jqXHR) => {
                this.documentList = _.uniq(
                    response.documents,
                    true,
                    obj => obj.id
                )
                this.teamMembers = response.team_members
                this.accessRights = response.access_rights
                this.user = response.user
                this.layoutTable()
            },
            error: (jqXHR, textStatus, errorThrown) => addAlert('error', jqXHR.responseText),
            complete: () => deactivateWait()

        })
    }

    layoutTable() {
        jQuery('#document-table tbody').html(documentsListTemplate({
            documentList: this.documentList,
            user: this.user,
            documentsListItemTemplate,
            localizeDate
        }))
        this.startDocumentTable()
    }

    startDocumentTable() {
        // The document table seems not to have an option to accept new data added to the DOM. Instead we destroy and recreate it.

        jQuery('#document-table').dataTable({
            "bPaginate": false,
            "bLengthChange": false,
            "bFilter": true,
            "bInfo": false,
            "bAutoWidth": false,
            "oLanguage": {
                "sSearch": ''
            },
            "aoColumnDefs": [{
                "bSortable": false,
                "aTargets": [0, 2, 6, 7]
            }],
        })

        jQuery('#document-table_wrapper .dataTables_filter input').attr('placeholder', gettext('Search for Document'))
        jQuery('#document-table_wrapper .dataTables_filter input').unbind('focus, blur')
        jQuery('#document-table_wrapper .dataTables_filter input').bind('focus', function() {
            jQuery(this).parent().addClass('focus')
        })
        jQuery('#document-table_wrapper .dataTables_filter input').bind('blur', function() {
            jQuery(this).parent().removeClass('focus')
        })

        let autocompleteTags = []
        jQuery('#document-table .fw-searchable').each(function() {
            autocompleteTags.push(this.textContent.replace(/^\s+/g, '').replace(/\s+$/g, ''))
        })
        autocompleteTags = _.uniq(autocompleteTags)
        jQuery("#document-table_wrapper .dataTables_filter input").autocomplete({
            source: autocompleteTags
        })
    }

    stopDocumentTable() {
        jQuery('#document-table').dataTable().fnDestroy()
    }

}

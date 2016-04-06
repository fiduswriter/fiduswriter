import {DocumentOverviewActions} from "./actions"
import {DocumentOverviewMenus} from "./menus"
import {documentsListTemplate, documentsListItemTemplate} from "./templates"
import {BibliographyDB} from "../../bibliography/database"
import {ImageDB} from "../../images/database"
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
        this.bind()
    }

    bind() {
        let that = this
        jQuery(document).ready(function () {
            that.getDocumentListData()
        })

    }

    getBibDB(callback) { // Get the bibliography database -- only executed if needed (when importing, etc.).
        let that = this
        if (!this.bibDB) { // Don't get the bibliography again if we already have it.
            let bibGetter = new BibliographyDB(this.user.id, true, false, false)
            bibGetter.getBibDB(function(){
                that.bibDB = bibGetter.bibDB // We only need the bibliography database
                callback()
            })
        } else {
            callback()
        }
    }

    getImageDB(callback) {
        let that = this
        if (!this.imageDB) {
            let imageGetter = new ImageDB(this.user.id)
            imageGetter.getDB(function(){
                that.imageDB = imageGetter.db
                callback()
            })
        } else {
            callback()
        }
    }

    getDocumentListData(id) {
        let that = this
        $.activateWait()
        $.ajax({
            url: '/document/documentlist/',
            data: {},
            type: 'POST',
            dataType: 'json',
            success: function (response, textStatus, jqXHR) {
                that.documentList = _.uniq(response.documents, true, function(obj) { return obj.id })
                that.teamMembers = response.team_members
                that.accessRights = response.access_rights
                that.user = response.user
                that.layoutTable()
            },
            error: function (jqXHR, textStatus, errorThrown) {
                $.addAlert('error', jqXHR.responseText)
            },
            complete: function () {
                $.deactivateWait()
            }
        })
    }

    layoutTable() {
        jQuery('#document-table tbody').html(documentsListTemplate({
            documentList: this.documentList,
            user: this.user,
            documentsListItemTemplate
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

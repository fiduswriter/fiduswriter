import * as plugins from "../../../plugins/documents_overview"
import {DocumentOverviewActions} from "./actions"
import {DocumentAccessRightsDialog} from "../access_rights"
import {menuModel} from "./menu"
import {documentsListTemplate} from "./templates"
import {activateWait, deactivateWait, addAlert, postJson, OverviewMenuView} from "../../common"
import {SiteMenu} from "../../menu"
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
        let smenu = new SiteMenu("documents")
        smenu.init()
        new DocumentOverviewActions(this)
        this.menu = new OverviewMenuView(this, menuModel)
        this.menu.init()
        this.activateFidusPlugins()
        this.bind()
    }

    bind() {
        jQuery(document).ready(() => this.getDocumentListData())
        let that = this
        jQuery(document).on('mousedown', '.revisions', function () {
            let docId = parseInt(jQuery(this).attr('data-id'))
            that.mod.actions.revisionsDialog(docId)
        })
        jQuery(document).on('mousedown', '.delete-document', function () {
            let docId = parseInt(jQuery(this).attr('data-id'))
            that.mod.actions.deleteDocumentDialog([docId])
        })

        jQuery(document).on('mousedown', '.owned-by-user .rights', function () {
            let docId = parseInt(jQuery(this).attr('data-id'))
            new DocumentAccessRightsDialog(
                [docId],
                that.accessRights,
                that.teamMembers,
                newAccessRights => that.accessRights = newAccessRights,
                memberDetails => that.teamMembers.push(memberDetails)
            )
        })
    }

    activateFidusPlugins() {
        // Add plugins.
        this.plugins = {}

        Object.keys(plugins).forEach(plugin => {
            if (typeof plugins[plugin] === 'function') {
                this.plugins[plugin] = new plugins[plugin](this)
                this.plugins[plugin].init()
            }
        })
    }

    getDocumentListData(id) {
        activateWait()
        postJson(
            '/document/documentlist/'
        ).then(
            response => {
                let ids = new Set()
                this.documentList = response.documents.filter(doc => {
                    if (ids.has(doc.id)) {return false}
                    ids.add(doc.id)
                    return true
                })

                this.teamMembers = response.team_members
                this.accessRights = response.access_rights
                this.user = response.user
                this.citationStyles = response.citation_styles
                this.citationLocales = response.citation_locales
                this.exportTemplates = response.export_templates
                this.layoutTable()
                this.addExportTemplatesToMenu()
            }
        ).catch(
            () => addAlert('error', gettext('Cannot load data of documents.'))
        ).then(
            () => deactivateWait()
        )

    }

    layoutTable() {
        document.querySelector('#document-table tbody').innerHTML = documentsListTemplate({
            documentList: this.documentList,
            user: this.user
        })
        this.startDocumentTable()
    }

    addExportTemplatesToMenu() {
        let docSelectMenuItem = this.menu.model.content.find(menuItem => menuItem.id='doc_selector')
        this.exportTemplates.forEach(template => {
            docSelectMenuItem.content.push({
                title: `${gettext('Export selected as: ')} ${template.file_name} (${template.file_type})`,
                action: overview => {
                    let ids = overview.getSelected()
                    if (ids.length) {
                        let fileType = template.file_type
                        let templateUrl = template.template_file
                        this.mod.actions.downloadTemplateExportFiles(ids, templateUrl, fileType)
                    }
                }
            })
        })
        this.menu.update()
    }

    startDocumentTable() {
        // The document table seems not to have an option to accept new data added to the DOM.
        // Instead we destroy and recreate it.

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

        document.querySelector('#document-table_wrapper .dataTables_filter input').setAttribute(
            'placeholder',
            gettext('Search for Document')
        )
        jQuery('#document-table_wrapper .dataTables_filter input').unbind('focus, blur')
        jQuery('#document-table_wrapper .dataTables_filter input').bind('focus', function() {
            jQuery(this).parent().addClass('focus')
        })
        jQuery('#document-table_wrapper .dataTables_filter input').bind('blur', function() {
            jQuery(this).parent().removeClass('focus')
        })

        let autocompleteTags = []
        document.querySelectorAll('#document-table .fw-searchable').forEach(el => {
            autocompleteTags.push(el.textContent.replace(/^\s+/g, '').replace(/\s+$/g, ''))
        })
        autocompleteTags = [...new Set(autocompleteTags)] // only unique values
        jQuery("#document-table_wrapper .dataTables_filter input").autocomplete({
            source: autocompleteTags
        })
    }

    stopDocumentTable() {
        jQuery('#document-table').dataTable().fnDestroy()
    }

    getSelected() {
        return [].slice.call(
            document.querySelectorAll('.entry-select:checked:not(:disabled)')
        ).map(el => parseInt(el.getAttribute('data-id')))
    }

}

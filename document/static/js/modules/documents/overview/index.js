import {DataTable} from "simple-datatables"

import * as plugins from "../../../plugins/documents_overview"
import {DocumentOverviewActions} from "./actions"
import {DocumentAccessRightsDialog} from "../access_rights"
import {menuModel} from "./menu"
import {activateWait, deactivateWait, addAlert, postJson, OverviewMenuView, findTarget, whenReady, escapeText, localizeDate, baseBodyTemplate, ensureCSS, setDocTitle} from "../../common"
import {SiteMenu} from "../../menu"
import {FeedbackTab} from "../../feedback"

/*
* Helper functions for the document overview page.
*/

export class DocumentOverview {

    constructor ({app, user, staticUrl}) {
        this.app = app
        this.user = user
        this.staticUrl = staticUrl
        this.documentList = []
        this.teamMembers = []
        this.accessRights = []
        this.mod = {}
    }

    init() {
        whenReady().then(() => {
            this.render()
            let smenu = new SiteMenu("documents")
            smenu.init()
            new DocumentOverviewActions(this)
            this.menu = new OverviewMenuView(this, menuModel)
            this.menu.init()
            this.activateFidusPlugins()
            this.bind()
            this.getDocumentListData()
        })
    }

    render() {
        document.body = document.createElement('body')
        document.body.innerHTML = baseBodyTemplate({
            contents: '<ul id="fw-overview-menu"></ul>',
            username: this.user.username,
            staticUrl: this.staticUrl
        })
        ensureCSS([
            'add_remove_dialog.css',
            'access_rights_dialog.css'
        ], this.staticUrl)
        setDocTitle(gettext('Document Overview'))
        const feedbackTab = new FeedbackTab({staticUrl: this.staticUrl})
        feedbackTab.init()
    }

    bind() {
        document.body.addEventListener('click', event => {
            let el = {}, docId
            switch (true) {
                case findTarget(event, '.revisions', el):
                    docId = parseInt(el.target.dataset.id)
                    this.mod.actions.revisionsDialog(docId)
                    break
                case findTarget(event, '.delete-document', el):
                    docId = parseInt(el.target.dataset.id)
                    this.mod.actions.deleteDocumentDialog([docId])
                    break
                case findTarget(event, '.owned-by-user .rights', el):
                    docId = parseInt(el.target.dataset.id)
                    new DocumentAccessRightsDialog(
                        [docId],
                        this.accessRights,
                        this.teamMembers,
                        newAccessRights => this.accessRights = newAccessRights,
                        memberDetails => this.teamMembers.push(memberDetails)
                    )
                    break
                case findTarget(event, 'a', el):
                    if (el.target.hostname === window.location.hostname && el.target.getAttribute('href')[0] === '/') {
                        event.preventDefault()
                        this.app.goTo(el.target.href)
                    }
                    break
                default:
                    break
            }
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

    getDocumentListData() {
        activateWait()
        postJson(
            '/document/documentlist/'
        ).catch(
            error => {
                addAlert('error', gettext('Cannot load data of documents.'))
                throw(error)
            }
        ).then(
            ({json}) => {
                let ids = new Set()
                this.documentList = json.documents.filter(doc => {
                    if (ids.has(doc.id)) {return false}
                    ids.add(doc.id)
                    return true
                })

                this.teamMembers = json.team_members
                this.accessRights = json.access_rights
                this.citationStyles = json.citation_styles
                this.citationLocales = json.citation_locales
                this.documentStyles = json.document_styles
                this.exportTemplates = json.export_templates
                this.initTable()
                this.addExportTemplatesToMenu()
            }
        ).then(
            () => deactivateWait()
        )

    }

    /* Initialize the overview table */
    initTable() {
        let tableEl = document.createElement('table')
        tableEl.classList.add('fw-document-table')
        tableEl.classList.add('fw-large')
        document.querySelector('.fw-contents').appendChild(tableEl)
        this.table = new DataTable(tableEl, {
            searchable: true,
            paging: false,
            scrollY: "calc(100vh - 320px)",
            labels: {
                noRows: gettext("No documents available") // Message shown when there are no search results
            },
            layout: {
                top: ""
            },
            data: {
                headings: ['','&emsp;&emsp;', gettext("Title"), gettext("Revisions"), gettext("Created"), gettext("Last changed"), gettext("Owner"), gettext("Rights"), ''],
                data: this.documentList.map(doc => this.createTableRow(doc))
            },
            columns: [
                {
                    select: 0,
                    hidden: true
                },
                {
                    select: [1,3,7,8],
                    sortable: false
                }
            ]
        })
        this.lastSort = {column: 0, dir: 'asc'}

        this.table.on('datatable.sort', (column, dir) => {
            this.lastSort = {column, dir}
        })
    }

    createTableRow(doc) {
        return [
            String(doc.id),
            `<input type="checkbox" class="entry-select" data-id="${doc.id}">`,
            `<span class="fw-document-table-title fw-inline">
                <i class="fa fa-file-text-o"></i>
                <a class="doc-title fw-link-text fw-searchable" href="/document/${doc.id}/">
                    ${doc.title.length ? escapeText(doc.title) : gettext('Untitled')}
                </a>
            </span>`,
            doc.revisions.length ?
            `<span class="fw-inline revisions" data-id="${doc.id}">
                <i class="fa fa-clock-o"></i>
            </span>` :
            '',
            `<span class="date">${localizeDate(doc.added*1000, 'sortable-date')}</span>`,
            `<span class="date">${localizeDate(doc.updated*1000, 'sortable-date')}</span>`,
            `<span>
                <img class="fw-avatar" src="${doc.owner.avatar}" />
            </span>
            <span class="fw-inline fw-searchable">${escapeText(doc.owner.name)}</span>`,
            `<span class="rights fw-inline" data-id="${doc.id}" title="${doc.rights}">
                <i data-id="${doc.id}" class="icon-access-right icon-access-${doc.rights}"></i>
            </span>`,
            `<span class="delete-document fw-inline fw-link-text" data-id="${doc.id}"
                    data-title="${escapeText(doc.title)}">
                ${
                    this.user.id === doc.owner.id ?
                    '<i class="fa fa-trash-o"></i>' :
                    ''
                }
            </span>`
        ]
    }

    removeTableRows(ids) {
        let existingRows = this.table.data.map((data, index) => {
            let id = parseInt(data.cells[0].textContent)
            if (ids.includes(id)) {
                return index
            } else {
                return false
            }
        }).filter(rowIndex => rowIndex !== false)

        if (existingRows.length) {
            this.table.rows().remove(existingRows)
        }
    }

    addDocToTable(doc) {
        this.table.insert({data: [this.createTableRow(doc)]})
        // Redo last sort
        this.table.columns().sort(this.lastSort.column, this.lastSort.dir)
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

    getSelected() {
        return Array.from(
            document.querySelectorAll('.entry-select:checked:not(:disabled)')
        ).map(el => parseInt(el.getAttribute('data-id')))
    }

}

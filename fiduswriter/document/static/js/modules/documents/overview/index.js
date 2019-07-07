import {DataTable} from "simple-datatables"

import * as plugins from "../../../plugins/documents_overview"
import {DocumentOverviewActions} from "./actions"
import {DocumentAccessRightsDialog} from "../access_rights"
import {menuModel, bulkModel} from "./menu"
import {activateWait, deactivateWait, addAlert, postJson, OverviewMenuView, findTarget, whenReady, escapeText, localizeDate, baseBodyTemplate, ensureCSS, setDocTitle, DatatableBulk} from "../../common"
import {SiteMenu} from "../../menu"
import {FeedbackTab} from "../../feedback"
import {
    docSchema
} from "../../schema/document"

/*
* Helper functions for the document overview page.
*/

export class DocumentOverview {

    constructor({app, user, staticUrl, registrationOpen}) {
        this.app = app
        this.user = user
        this.staticUrl = staticUrl
        this.registrationOpen = registrationOpen
        this.schema = docSchema
        this.documentList = []
        this.teamMembers = []
        this.mod = {}
    }

    init() {
        whenReady().then(() => {
            this.render()
            activateWait(true)
            const smenu = new SiteMenu("documents")
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
            contents: '',
            user: this.user,
            staticUrl: this.staticUrl,
            hasOverview: true
        })
        ensureCSS([
            'document_overview.css',
            'add_remove_dialog.css',
            'access_rights_dialog.css'
        ], this.staticUrl)
        setDocTitle(gettext('Document Overview'), this.app)
        const feedbackTab = new FeedbackTab({staticUrl: this.staticUrl})
        feedbackTab.init()
    }

    bind() {
        document.body.addEventListener('click', event => {
            const el = {}
            let docId
            switch (true) {
                case findTarget(event, '.revisions', el):
                    docId = parseInt(el.target.dataset.id)
                    this.mod.actions.revisionsDialog(docId)
                    break
                case findTarget(event, '.delete-document', el):
                    docId = parseInt(el.target.dataset.id)
                    this.mod.actions.deleteDocumentDialog([docId])
                    break
                case findTarget(event, '.owned-by-user.rights', el): {
                    docId = parseInt(el.target.dataset.id)
                    const dialog = new DocumentAccessRightsDialog(
                        [docId],
                        this.teamMembers,
                        memberDetails => this.teamMembers.push(memberDetails),
                        this.registrationOpen
                    )
                    dialog.init()
                    break
                }
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
        postJson(
            '/api/document/documentlist/'
        ).catch(
            error => {
                addAlert('error', gettext('Cannot load data of documents.'))
                throw (error)
            }
        ).then(
            ({json}) => {
                const ids = new Set()
                this.documentList = json.documents.filter(doc => {
                    if (ids.has(doc.id)) {return false}
                    ids.add(doc.id)
                    return true
                })

                this.teamMembers = json.team_members
                this.citationStyles = json.citation_styles
                this.citationLocales = json.citation_locales
                this.documentStyles = json.document_styles
                this.exportTemplates = json.export_templates
                this.documentTemplates = json.document_templates
                this.initTable()
                this.addExportTemplatesToMenu()
                if (this.documentTemplates.length > 1) {
                    this.multipleNewDocumentMenuItem()
                }
            }
        ).then(
            () => deactivateWait()
        )

    }

    /* Initialize the overview table */
    initTable() {
        const tableEl = document.createElement('table')
        tableEl.classList.add('fw-data-table')
        tableEl.classList.add('fw-document-table')
        tableEl.classList.add('fw-large')
        document.querySelector('.fw-contents').appendChild(tableEl)

        const dt_bulk = new DatatableBulk(this, bulkModel)

        this.table = new DataTable(tableEl, {
            searchable: true,
            paging: false,
            scrollY: "calc(100vh - 240px)",
            labels: {
                noRows: gettext("No documents available") // Message shown when there are no search results
            },
            layout: {
                top: ""
            },
            data: {
                headings: ['', dt_bulk.getHTML(), gettext("Title"), gettext("Revisions"), gettext("Created"), gettext("Last changed"), gettext("Owner"), gettext("Rights"), ''],
                data: this.documentList.map(doc => this.createTableRow(doc))
            },
            columns: [
                {
                    select: 0,
                    hidden: true
                },
                {
                    select: [1, 3, 7, 8],
                    sortable: false
                }
            ]
        })
        this.lastSort = {column: 0, dir: 'asc'}

        this.table.on('datatable.sort', (column, dir) => {
            this.lastSort = {column, dir}
        })

        dt_bulk.init(this.table.table)
    }

    createTableRow(doc) {
        return [
            String(doc.id),
            `<input type="checkbox" class="entry-select fw-check" data-id="${doc.id}" id="doc-${doc.id}"><label for="doc-${doc.id}"></label>`,
            `<span class="fw-data-table-title">
                <i class="far fa-file-alt"></i>
                <a class="doc-title fw-link-text fw-searchable" href="/document/${doc.id}/">
                    ${doc.title.length ? escapeText(doc.title) : gettext('Untitled')}
                </a>
            </span>`,
            doc.revisions.length ?
            `<span class="revisions" data-id="${doc.id}">
                <i class="fas fa-history"></i>
            </span>` :
            '',
            `<span class="date">${localizeDate(doc.added*1000, 'sortable-date')}</span>`,
            `<span class="date">${localizeDate(doc.updated*1000, 'sortable-date')}</span>`,
            `<span>
                ${doc.owner.avatar.html}
            </span>
            <span class="fw-searchable">${escapeText(doc.owner.name)}</span>`,
            `<span class="rights${doc.is_owner ? ' owned-by-user' : ''}" data-id="${doc.id}" title="${doc.rights}">
                <i data-id="${doc.id}" class="icon-access-right icon-access-${doc.rights}"></i>
            </span>`,
            `<span class="delete-document fw-link-text" data-id="${doc.id}"
                    data-title="${escapeText(doc.title)}">
                ${
                    this.user.id === doc.owner.id ?
                    '<i class="fa fa-trash-alt"></i>' :
                    ''
                }
            </span>`
        ]
    }

    removeTableRows(ids) {
        const existingRows = this.table.data.map((data, index) => {
            const id = parseInt(data.cells[0].textContent)
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
        /*const docSelectMenuItem = this.menu.model.content.find(menuItem => menuItem.id='doc_selector')
        this.exportTemplates.forEach(template => {
            docSelectMenuItem.content.push({
                title: `${gettext('Export selected as: ')} ${template.file_name} (${template.file_type})`,
                action: overview => {
                    const ids = overview.getSelected()
                    if (ids.length) {
                        const fileType = template.file_type
                        const templateUrl = template.template_file
                        this.mod.actions.downloadTemplateExportFiles(ids, templateUrl, fileType)
                    }
                }
            })
        })
        this.menu.update()*/
    }

    multipleNewDocumentMenuItem() {

        const menuItem = this.menu.model.content.find(menuItem => menuItem.id==='new_document')
        menuItem.type = 'dropdown'
        menuItem.content = this.documentTemplates.map(docTemplate => ({
            title: docTemplate.title,
            action: () => this.goToNewDocument(`n${docTemplate.id}`)
        }))
        this.menu.update()

    }

    getSelected() {
        return Array.from(
            document.querySelectorAll('.entry-select:checked:not(:disabled)')
        ).map(el => parseInt(el.getAttribute('data-id')))
    }

    goToNewDocument(id) {
        this.app.goTo(`/document/${id}/`)
    }

}

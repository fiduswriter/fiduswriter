import {DataTable} from "simple-datatables"

import * as plugins from "../../../plugins/documents_overview"
import {DocumentOverviewActions} from "./actions"
import {DocumentAccessRightsDialog} from "../access_rights"
import {menuModel, bulkMenuModel} from "./menu"
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

    constructor({app, user}) {
        this.app = app
        this.user = user
        this.schema = docSchema
        this.documentList = []
        this.teamMembers = []
        this.mod = {}
    }

    init() {
        return whenReady().then(() => {
            this.render()
            activateWait(true)
            const smenu = new SiteMenu("documents")
            smenu.init()
            new DocumentOverviewActions(this)
            this.menu = new OverviewMenuView(this, menuModel)
            this.menu.init()
            this.dtBulkModel = bulkMenuModel()
            this.activateFidusPlugins()
            this.bind()
            this.getDocumentListData()
        })
    }

    render() {
        this.dom = document.createElement('body')
        this.dom.innerHTML = baseBodyTemplate({
            contents: '',
            user: this.user,
            hasOverview: true
        })
        document.body = this.dom
        ensureCSS([
            'document_overview.css',
            'add_remove_dialog.css',
            'access_rights_dialog.css'
        ])
        setDocTitle(gettext('Document Overview'), this.app)
        const feedbackTab = new FeedbackTab()
        feedbackTab.init()
    }

    bind() {
        this.dom.addEventListener('click', event => {
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
                    memberDetails => this.teamMembers.push(memberDetails)
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
        return postJson(
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
                this.documentStyles = json.document_styles
                this.documentTemplates = json.document_templates
                this.initTable()
                if (Object.keys(this.documentTemplates).length > 1) {
                    this.multipleNewDocumentMenuItem()
                }
            }
        ).then(
            () => deactivateWait()
        )

    }

    onResize() {
        if (!this.table) {
            return
        }
        this.initTable()
    }

    /* Initialize the overview table */
    initTable() {
        const tableEl = document.createElement('table')
        tableEl.classList.add('fw-data-table')
        tableEl.classList.add('fw-document-table')
        tableEl.classList.add('fw-large')
        document.querySelector('.fw-contents').innerHTML = '' // Delete any old table
        document.querySelector('.fw-contents').appendChild(tableEl)

        this.dtBulk = new DatatableBulk(this, this.dtBulkModel)

        const hiddenCols = [0]

        if (window.innerWidth < 500) {
            hiddenCols.push(1, 4)
            if (window.innerWidth < 400) {
                hiddenCols.push(5)
            }
        }

        this.table = new DataTable(tableEl, {
            searchable: true,
            paging: false,
            scrollY: `${Math.max(window.innerHeight - 360, 100)}px`,
            labels: {
                noRows: gettext("No documents available") // Message shown when there are no search results
            },
            layout: {
                top: "",
                bottom: ""
            },
            data: {
                headings: [
                    '',
                    this.dtBulk.getHTML(),
                    gettext("Title"),
                    gettext("Revisions"),
                    gettext("Created"),
                    gettext("Last changed"),
                    gettext("Owner"),
                    gettext("Rights"),
                    ''
                ],
                data: this.documentList.map(doc => this.createTableRow(doc))
            },
            columns: [
                {
                    select: hiddenCols,
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

        this.dtBulk.init(this.table.table)
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
            `<span class="date">${localizeDate(doc.added * 1000, 'sortable-date')}</span>`,
            `<span class="date">${localizeDate(doc.updated * 1000, 'sortable-date')}</span>`,
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

    multipleNewDocumentMenuItem() {

        const menuItem = this.menu.model.content.find(menuItem => menuItem.id === 'new_document')
        menuItem.type = 'dropdown'
        menuItem.content = Object.values(this.documentTemplates).map(docTemplate => ({
            title: docTemplate.title || gettext('Undefined'),
            action: () => this.goToNewDocument(`n${docTemplate.id}`)
        }))
        this.menu.update()

        this.dtBulkModel.content.push({
            title: gettext('Copy selected as...'),
            tooltip: gettext('Copy the documents and assign them to a specific template.'),
            action: overview => {
                const ids = overview.getSelected()
                if (ids.length) {
                    overview.mod.actions.copyFilesAs(ids)
                }
            },
            disabled: overview => !overview.getSelected().length,
            order: 2.5
        })

        this.dtBulk.update()




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

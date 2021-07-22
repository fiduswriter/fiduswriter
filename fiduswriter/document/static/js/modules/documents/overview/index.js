import {DataTable} from "simple-datatables"
import deepEqual from "fast-deep-equal"
import * as plugins from "../../../plugins/documents_overview"
import {DocumentOverviewActions} from "./actions"
import {DocumentAccessRightsDialog} from "../access_rights"
import {menuModel, bulkMenuModel} from "./menu"
import {activateWait, deactivateWait, addAlert, escapeText, postJson, OverviewMenuView, findTarget, whenReady, baseBodyTemplate, ensureCSS, setDocTitle, DatatableBulk, shortFileTitle} from "../../common"
import {SiteMenu} from "../../menu"
import {FeedbackTab} from "../../feedback"
import {
    docSchema
} from "../../schema/document"
import {
    dateCell,
    deleteFolderCell
} from "./templates"

/*
* Helper functions for the document overview page.
*/

export class DocumentOverview {

    constructor({app, user}, path = '/') {
        this.app = app
        this.user = user
        this.path = path
        this.schema = docSchema
        this.documentList = []
        this.contacts = []
        this.mod = {}
        this.lastSort = {column: 0, dir: 'asc'}
    }

    init() {
        return whenReady().then(() => {
            this.render()
            const smenu = new SiteMenu(this.app, "documents")
            smenu.init()
            new DocumentOverviewActions(this)
            this.menu = new OverviewMenuView(this, menuModel)
            this.menu.init()
            this.dtBulkModel = bulkMenuModel()
            this.activateFidusPlugins()
            this.bind()
            return this.getDocumentListData().then(
                () => deactivateWait()
            )
        })
    }

    render() {
        this.dom = document.createElement('body')
        this.dom.innerHTML = baseBodyTemplate({
            contents: '',
            user: this.user,
            hasOverview: true
        })
        ensureCSS([
            'document_overview.css',
            'add_remove_dialog.css',
            'access_rights_dialog.css'
        ])
        document.body = this.dom
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
                if (this.app.isOffline()) {
                    addAlert('info', gettext("You cannot access revisions of a document while you are offline."))
                } else {
                    docId = parseInt(el.target.dataset.id)
                    this.mod.actions.revisionsDialog(docId)
                }
                break
            case findTarget(event, '.delete-document', el):
                if (this.app.isOffline()) {
                    addAlert('info', gettext("You cannot delete a document while you are offline."))
                } else {
                    docId = parseInt(el.target.dataset.id)
                    this.mod.actions.deleteDocumentDialog([docId])
                }
                break
            case findTarget(event, '.delete-folder', el):
                if (this.app.isOffline()) {
                    addAlert('info', gettext("You cannot delete documents while you are offline."))
                } else {
                    const ids = el.target.dataset.ids.split(',').map(id => parseInt(id))
                    this.mod.actions.deleteDocumentDialog(ids)
                }
                break
            case findTarget(event, '.owned-by-user.rights', el): {
                if (this.app.isOffline()) {
                    addAlert('info', gettext("You cannot access rights data of a document while you are offline."))
                } else {
                    docId = parseInt(el.target.dataset.id)
                    const dialog = new DocumentAccessRightsDialog(
                        [docId],
                        this.contacts,
                        memberDetails => this.contacts.push(memberDetails)
                    )
                    dialog.init()
                }
                break
            }
            case findTarget(event, 'a.fw-data-table-title.subdir, a.fw-data-table-title.parentdir', el):
                event.preventDefault()
                this.path = el.target.dataset.path
                window.history.pushState({}, "", encodeURI(el.target.getAttribute('href')))
                this.initTable()
                break
            case findTarget(event, 'a.fw-data-table-title', el):
                event.preventDefault()
                if (this.app.isOffline()) {
                    addAlert('info', gettext("You cannot open a document while you are offline."))
                } else {
                    this.app.goTo(el.target.getAttribute('href'))
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
        const cachedPromise = this.showCached()
        if (this.app.isOffline()) {
            return cachedPromise
        }
        return postJson(
            '/api/document/documentlist/'
        ).then(
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
                if (this.app.isOffline()) {
                    return cachedPromise
                } else {
                    addAlert('error', gettext('Document data loading failed.'))
                    throw (error)
                }
            }
        )
    }

    showCached() {
        return this.loaddatafromIndexedDB().then(json => {
            if (!json) {
                activateWait(true)
                return
            }
            return this.initializeView(json)
        })
    }

    loaddatafromIndexedDB() {
        return this.app.indexedDB.readAllData("document_data").then(
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
        json.id = 1
        // Clear data if any present
        return this.app.indexedDB.clearData("document_data").then(
            () => this.app.indexedDB.insertData("document_data", [json])
        )
    }

    initializeView(json) {
        const ids = new Set()
        this.documentList = json.documents.filter(doc => {
            if (ids.has(doc.id)) {
                return false
            }
            ids.add(doc.id)
            return true
        })

        this.contacts = json.contacts
        this.documentStyles = json.document_styles
        this.documentTemplates = json.document_templates
        this.initTable()
        if (Object.keys(this.documentTemplates).length > 1) {
            this.multipleNewDocumentMenuItem()
        } else {
            this.singleNewDocumentMenuItem()
        }
        return json
    }

    onResize() {
        if (!this.table) {
            return
        }
        this.initTable()
    }

    /* Initialize the overview table */
    initTable(searching = false) {
        if (this.table) {
            this.table.destroy()
            this.table = false
        }
        const subdirs = {}
        const tableEl = document.createElement('table')
        tableEl.classList.add('fw-data-table')
        tableEl.classList.add('fw-document-table')
        tableEl.classList.add('fw-large')
        const contentsEl = document.querySelector('.fw-contents')
        contentsEl.innerHTML = '' // Delete any old table
        contentsEl.appendChild(tableEl)

        if (this.path !== '/') {
            const headerEl = document.createElement('h1')
            headerEl.innerHTML = escapeText(this.path)
            contentsEl.insertBefore(headerEl, tableEl)
        }

        this.dtBulk = new DatatableBulk(this, this.dtBulkModel)

        const hiddenCols = [0, 1]

        if (window.innerWidth < 500) {
            hiddenCols.push(2, 5)
            if (window.innerWidth < 400) {
                hiddenCols.push(6)
            }
        }
        const fileList = this.documentList.map(
            doc => this.createTableRow(doc, subdirs, searching)
        ).filter(row => !!row)

        if (!searching && this.path !== '/') {
            const pathParts = this.path.split('/')
            pathParts.pop()
            pathParts.pop()
            const parentPath = pathParts.join('/') + '/'
            const href = parentPath === "/" ? parentPath : `/documents${parentPath}`
            fileList.unshift([
                '-1',
                'top',
                '',
                `<a class="fw-data-table-title fw-link-text parentdir" href="${href}" data-path="${parentPath}">
                    <i class="fas fa-folder"></i>
                    <span>..</span>
                </a>`,
                '',
                '',
                '',
                '',
                '',
                ''
            ])
        }

        this.table = new DataTable(tableEl, {
            searchable: searching,
            paging: false,
            scrollY: `${Math.max(window.innerHeight - 360, 200)}px`,
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
                data: fileList
            },
            columns: [
                {
                    select: hiddenCols,
                    hidden: true
                },
                {
                    select: [2, 4, 8, 9],
                    sortable: false
                },
                {
                    select: [this.lastSort.column],
                    sort: this.lastSort.dir
                }
            ]
        })
        this.table.on('datatable.sort', (column, dir) => {
            this.lastSort = {column, dir}
        })

        this.dtBulk.init(this.table.table)
    }

    createTableRow(doc, subdirs, searching) {
        let path = doc.path
        if (!path.startsWith('/')) {
            path = '/' + path
        }
        if (!path.startsWith(this.path)) {
            return false
        }
        if (path.endsWith('/')) {
            path += doc.title.replace(/\//g, '')
        }
        const currentPath = path.slice(this.path.length)
        if (!searching && currentPath.includes('/')) {
            // There is a subdir
            const subdir = currentPath.split('/').shift()
            if (subdirs[subdir]) {
                // subdir has been covered already
                // We only update the update/added columns if needed.
                if (doc.added < subdirs[subdir].added) {
                    subdirs[subdir].added = doc.added
                    subdirs[subdir].row[5] = dateCell({date: doc.added})
                }
                if (doc.updated > subdirs[subdir].updated) {
                    subdirs[subdir].updated = doc.updated
                    subdirs[subdir].row[6] = dateCell({date: doc.updated})
                }
                if (this.user.id === doc.owner.id) {
                    subdirs[subdir].ownedIds.push(doc.id)
                    subdirs[subdir].row[9] = deleteFolderCell({subdir, ids: subdirs[subdir].ownedIds})
                }
                return false
            }

            const ownedIds = this.user.id === doc.owner.id ? [doc.id] : []
            // Display subdir
            const row = [
                '0',
                'folder',
                '',
                `<a class="fw-data-table-title fw-link-text subdir" href="/documents${this.path}${subdir}/" data-path="${this.path}${subdir}/">
                    <i class="fas fa-folder"></i>
                    <span>${escapeText(subdir)}</span>
                </a>`,
                '',
                dateCell({date: doc.added}),
                dateCell({date: doc.updated}),
                '',
                '',
                ownedIds.length ? deleteFolderCell({subdir, ids: ownedIds}) : ''
            ]
            subdirs[subdir] = {row, added: doc.added, updated: doc.updated, ownedIds}
            return row
        }

        // This is the folder of the file. Return the file.
        return [
            String(doc.id),
            'file',
            `<input type="checkbox" class="entry-select fw-check" data-id="${doc.id}" id="doc-${doc.id}"><label for="doc-${doc.id}"></label>`,
            `<a class="fw-data-table-title fw-link-text" href="/document/${doc.id}">
                <i class="far fa-file-alt"></i>
                <span class="fw-searchable">
                    ${shortFileTitle(doc.title, doc.path)}
                </span>
            </a>`,
            doc.revisions.length ?
                `<span class="revisions" data-id="${doc.id}">
                <i class="fas fa-history"></i>
            </span>` :
                '',
            dateCell({date: doc.added}),
            dateCell({date: doc.updated}),
            `<span>
                ${doc.owner.avatar.html}
            </span>
            <span class="fw-searchable">${escapeText(doc.owner.name)}</span>`,
            `<span class="rights${doc.is_owner ? ' owned-by-user' : ''}" data-id="${doc.id}" title="${doc.rights}">
                <i data-id="${doc.id}" class="icon-access-right icon-access-${doc.rights}"></i>
            </span>`,
            `<span class="delete-document fw-link-text" data-id="${doc.id}"
                    data-title="${escapeText(currentPath)}">
                ${
    this.user.id === doc.owner.id ?
        '<i class="fa fa-trash-alt"></i>' :
        ''
}
            </span>`
        ]


    }

    multipleNewDocumentMenuItem() {
        const menuItem = this.menu.model.content.find(menuItem => menuItem.id === 'new_document')
        menuItem.type = 'dropdown'
        menuItem.content = Object.values(this.documentTemplates).map(docTemplate => ({
            title: docTemplate.title || gettext('Undefined'),
            action: () => this.goToNewDocument(`n${docTemplate.id}`)
        }))
        this.menu.update()

        if (this.dtBulkModel.content.find(item => item.id === 'copy_as')) {
            // Menuitem already present
            return
        }

        this.dtBulkModel.content.push({
            id: 'copy_as',
            title: gettext('Copy selected as...'),
            tooltip: gettext('Copy the documents and assign them to a specific template.'),
            action: overview => {
                const ids = overview.getSelected()
                if (ids.length) {
                    overview.mod.actions.copyFilesAs(ids)
                }
            },
            disabled: overview => !overview.getSelected().length || overview.app.isOffline(),
            order: 2.5
        })

        this.dtBulk.update()
    }

    singleNewDocumentMenuItem() {
        const menuItem = this.menu.model.content.find(menuItem => menuItem.id === 'new_document')
        if (menuItem.type === 'text') {
            // Already correctly set
            return
        }
        menuItem.type = 'text'
        delete menuItem.content
        this.menu.update()

        this.dtBulkModel.content = this.dtBulkModel.content.filter(item => item.id !== 'copy_as')
        this.dtBulk.update()

    }

    getSelected() {
        return Array.from(
            document.querySelectorAll('.entry-select:checked:not(:disabled)')
        ).map(el => parseInt(el.getAttribute('data-id')))
    }

    goToNewDocument(id) {
        this.app.goTo(`/document${this.path}${id}`)
    }

}

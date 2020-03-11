import {DataTable} from "simple-datatables"

import {configureCitationTemplate, selectedCitationTemplate} from "./templates"
import {setCheckableLabel, Dialog, findTarget, escapeText, addAlert} from "../../common"
import {nameToText, litToText} from "../../bibliography/tools"
import * as plugins from "../../../plugins/citation_dialog"

export class CitationDialog {
    constructor(editor) {
        this.editor = editor
        this.initialReferences = []
        this.initialFormat = 'autocite'
        this.node = this.editor.currentView.state.selection.node
        this.dialog = false
        this.buttons = []
        this.submitButtonText = gettext('Insert')
    }

    init() {
        if (this.node && this.node.type && this.node.type.name==='citation') {
            this.initialFormat = this.node.attrs.format
            this.initialReferences = this.node.attrs.references
        }

        this.buttons.push({
            text: gettext('Register new source'),
            click: () => this.registerNewSource(),
            classes: 'fw-light fw-add-button register-new-bib-source'
        })

        if (this.node && this.node.type && this.node.type.name==='citation') {
            this.buttons.push({
                text: gettext('Remove'),
                click: () => {
                    const transaction = this.editor.currentView.state.tr.deleteSelection()
                    this.editor.currentView.dispatch(transaction)
                    this.dialog.close()
                },
                classes: 'fw-orange'
            })
            this.submitButtonText = gettext('Update')
        }

        this.buttons.push({
            text: this.submitButtonText,
            click: () => {
                if (this.dialogSubmit()) {
                    this.dialog.close()
                }
            },
            classes: "fw-dark insert-citation"
        })

        this.buttons.push({
            type: 'cancel'
        })

        this.activatePlugins()

        this.dialog = new Dialog({
            id: 'configure-citation',
            title: gettext('Configure Citation'),
            buttons: this.buttons,
            body: this.citationDialogHTML(),
            width: 836,
            onClose: () => this.editor.currentView.focus()
        })
        this.dialog.open()
        this.initTable()
        this.bind()
    }

    activatePlugins() {
        // Add plugins
        this.plugins = {}

        Object.keys(plugins).forEach(plugin => {
            if (typeof plugins[plugin] === 'function') {
                this.plugins[plugin] = new plugins[plugin](this)
                this.plugins[plugin].init()
            }
        })
    }

    createAllTableRows() {
        const data = []
        // unify bibs from both document and user
        Object.keys(this.editor.mod.db.bibDB.db).forEach(id => {
            data.push(this.createTableRow(this.editor.mod.db.bibDB.db[id], id, 'document', false))
        })
        Object.keys(this.editor.app.bibDB.db).forEach(id => {
            const bib = this.editor.app.bibDB.db[id]
            if (!this.editor.mod.db.bibDB.hasReference(bib)) {
                data.push(this.createTableRow(bib, id, 'user', false))
            }
        })
        return data
    }

    createTableRow(bib, id, db, checked) {
        const bibauthors = bib.fields.author || bib.fields.editor
        return [
            `${db}-${id}`,
            `<span class="fw-data-table-title fw-inline">
                <i class="fa fa-book"></i>
                <span class="fw-searchable">${bib.fields.title ? escapeText(litToText(bib.fields.title)) : gettext('Untitled')}</span>
            </span>`,
            bibauthors ? escapeText(nameToText(bibauthors)) : '',
            checked ? '<i class="fa fa-check" aria-hidden="true"></i>' : ''
        ]
    }

    citationDialogHTML() {
        // Assemble the HTML of the 'cited' column of the dialog,
        // and return the templated dialog HTML.
        let citedItemsHTML = ''

        Object.keys(this.editor.mod.db.bibDB.db).forEach(id => {
            const citEntry = this.initialReferences.find(bibRef => bibRef.id==id)

            if (citEntry) {
                const bibEntry = this.bibDBToBibEntry(this.editor.mod.db.bibDB.db[id], id, 'document')
                bibEntry.prefix = citEntry.prefix ?  citEntry.prefix : ''
                bibEntry.locator = citEntry.locator ? citEntry.locator : ''
                citedItemsHTML += selectedCitationTemplate(bibEntry)
            }
        })

        return configureCitationTemplate({
            citedItemsHTML,
            citeFormat: this.initialFormat
        })
    }

    registerNewSource() {
        import("../../bibliography/form").then(({BibEntryForm}) => {
            const form = new BibEntryForm(this.editor.mod.db.bibDB)
            form.init().then(
                idTranslations => {
                    const ids = idTranslations.map(idTrans => idTrans[1])
                    this.addToCitableItems(ids)
                }
            )
        })
    }

    bibDBToBibEntry(bib, id, db) {
        const bibauthors = bib.fields.author || bib.fields.editor
        return {
            id,
            db,
            bib_type: bib.bib_type,
            title: bib.fields.title ? litToText(bib.fields.title) : gettext('Untitled'),
            author: bibauthors ? nameToText(bibauthors) : ''
        }
    }

    // Update the citation dialog with new items in 'citable' column.
    // Not when dialog is first opened.
    addToCitableItems(ids) {
        const data = []
        ids.forEach(id => {
            const citeItemData = this.bibDBToBibEntry(this.editor.mod.db.bibDB.db[id], id, 'document')
            this.addToCitedItems([citeItemData])
            data.push(this.createTableRow(this.editor.mod.db.bibDB.db[id], id, 'document', false))
        })

        this.table.insert({data})
        this.table.columns().sort(this.lastSort.column, this.lastSort.dir)
    }

    // Update the citation dialog with new items in 'cited' column.
    // Not when dialog is first opened.
    addToCitedItems(items) {
        const len = items.length
        for (let i = 0; i < len; i ++) {
            const item = items[i]
            document.querySelector('#selected-cite-source-table .fw-data-table-body').insertAdjacentHTML(
                'beforeend',
                selectedCitationTemplate({
                    id: item.id,
                    db: item.db,
                    title: item.title,
                    author: item.author,
                    locator: '',
                    prefix: ''
                })
            )
        }
    }

    initTable() {
        const tableEl = document.createElement('table')
        tableEl.classList.add('fw-data-table')
        tableEl.classList.add('fw-large')
        this.dialog.dialogEl.querySelector('#my-sources').appendChild(tableEl)
        this.table = new DataTable(tableEl, {
            searchable: true,
            paging: false,
            scrollY: "225px",
            labels: {
                noRows: gettext("No sources registered"), // Message shown when there are no search results
                placeholder: gettext("Search...") // placeholder for search field
            },
            layout: {
                top: "{search}"
            },
            data: {
                headings: ['', gettext("Title"), gettext("Author"), ''],
                data: this.createAllTableRows()
            },
            columns: [
                {
                    select: 0,
                    hidden: true
                },
                {
                    select: 3,
                    sortable: false
                }
            ]
        })
        this.table.on('datatable.sort', (column, dir) => {
            this.lastSort = {column, dir}
        })
        this.table.columns().sort(0, 'asc')
    }

    checkRow(dataIndex) {
        const data = this.table.data[dataIndex]
        if (!data) {
            return
        }
        const checkCell = data.cells[3]

        if (checkCell.innerHTML.trim().length) {
            checkCell.innerHTML = ''
        } else {
            checkCell.innerHTML = '<i class="fa fa-check" aria-hidden="true"></i>'
        }
        this.table.columns().rebuild()
    }


    bind() {
        this.table.body.addEventListener('click', event => {
            const el = {}
            switch (true) {
                case findTarget(event, 'tr', el):
                    this.checkRow(el.target.dataIndex)
                    break
                default:
                    break
            }
        })

        document.getElementById('add-cite-source').addEventListener('click', () => {
            const selectedItems = []

            this.table.data.forEach(
                data => {
                    if (!data.cells[3].innerHTML.trim().length) {
                        return
                    }
                    data.cells[3].innerHTML = ''
                    const [db, id] = data.cells[0].textContent.split('-').map(
                        (val, index) => index ? parseInt(val) : val // only parseInt id (where index > 0)
                    )
                    if (document.querySelector(`#selected-source-${db}-${id}`)) {
                        return
                    }
                    selectedItems.push({
                        id,
                        db,
                        title: data.cells[1].textContent,
                        author: data.cells[2].textContent
                    })
                }
            )

            this.addToCitedItems(selectedItems)
            this.table.columns().rebuild()
        })

        this.dialog.dialogEl.addEventListener('click', event => {
            const el = {}
            let documentEl
            switch (true) {
                case findTarget(event, '.selected-source .delete', el):
                    documentEl = document.getElementById(`selected-source-${el.target.dataset.db}-${el.target.dataset.id}`)
                    if (documentEl) {
                        documentEl.parentElement.removeChild(documentEl)
                    }
                    break
                case findTarget(event, '.fw-checkable', el):
                    setCheckableLabel(el.target)
                    break
                default:
                    break
            }
        })
    }

    dialogSubmit() {
        const citeItems = Array.from(
                document.querySelectorAll('#selected-cite-source-table .fw-cite-parts-table')
            ),
            references = citeItems.map(bibRef => {
                const deleteButton = bibRef.querySelector('.delete'),
                    db = deleteButton.dataset.db
                let id = parseInt(deleteButton.dataset.id)
                if (db === 'user') {
                    // entry is from user's bibDB. We need to import it into the
                    // document's bibDB.
                    const bib = this.editor.app.bibDB.db[id]
                    id = this.editor.mod.db.bibDB.addReference(bib, id)
                }
                const returnObj = {
                    id
                }
                const prefix = bibRef.querySelector('.fw-cite-text').value
                if (prefix.length) {
                    returnObj['prefix'] = prefix
                }
                const locator = bibRef.querySelector('.fw-cite-page').value
                if (locator.length) {
                    returnObj['locator'] = locator
                }
                return returnObj
            })

        if (!citeItems.length) {
            addAlert('info', gettext('Please select at least one citation source!'))
            return false
        }

        const format = document.getElementById('citation-style-selector').value

        if (
            JSON.stringify(references) === JSON.stringify(this.initialReferences) &&
            format == this.initialFormat
        ) {
            // Nothing has been changed, so we just close the dialog again
            return true
        }

        const citationNode = this.editor.currentView.state.schema.nodes['citation'].create({format, references})
        const transaction = this.editor.currentView.state.tr.replaceSelectionWith(citationNode, true)
        this.editor.currentView.dispatch(transaction)
        return true
    }
}

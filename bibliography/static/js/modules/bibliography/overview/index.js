import fixUTF8 from "fix-utf8"
import {DataTable} from "simple-datatables"

import {BibLatexImporter} from "../import"
import {litToText, nameToText} from "../tools"
import {BibEntryForm} from "../form"
import {editCategoriesTemplate} from "./templates"
import {BibliographyDB} from "../database"
import {BibTypeTitles} from "../form/strings"
import {SiteMenu} from "../../menu"
import {OverviewMenuView, findTarget, whenReady, Dialog, baseBodyTemplate, ensureCSS, setDocTitle} from "../../common"
import {FeedbackTab} from "../../feedback"
import {menuModel} from "./menu"
import * as plugins from "../../../plugins/bibliography_overview"
import {escapeText} from "../../common"

export class BibliographyOverview {

    constructor({username, staticUrl}) {
        this.username = username
        this.staticUrl = staticUrl
    }

    /** Bind the init function to doc loading.
     * @function bind
     */
    init() {
        whenReady().then(() => {
            this.render()
            let smenu = new SiteMenu("bibliography")
            smenu.init()
            this.menu = new OverviewMenuView(this, menuModel)
            this.menu.init()
            this.getBibDB()
            this.activatePlugins()
            this.bindEvents()
        })
    }

    render() {
        document.body.innerHTML = baseBodyTemplate({
            contents: '<ul id="fw-overview-menu"></ul>',
            username: this.username,
            staticUrl: this.staticUrl
        })
        ensureCSS([
            'bibliography.css',
            'prosemirror.css'
        ], this.staticUrl)
        setDocTitle(gettext('Bibliography Manager'))
        const feedbackTab = new FeedbackTab({staticUrl: this.staticUrl})
        feedbackTab.init()
    }

    /* load data from the bibliography */
    getBibDB() {
        this.bibDB = new BibliographyDB()
        this.bibDB.getDB().then(({bibPKs, bibCats}) => {
            this.setBibCategoryList(bibCats)
            this.initTable(bibPKs)
        })
    }

    /* Initialize the overview table */
    initTable(ids) {
        let tableEl = document.createElement('table')
        tableEl.classList.add('fw-document-table')
        tableEl.classList.add('fw-large')
        document.querySelector('.fw-contents').appendChild(tableEl)
        this.table = new DataTable(tableEl, {
            searchable: true,
            paging: false,
            scrollY: "calc(100vh - 320px)",
            labels: {
                noRows: gettext("No sources registered") // Message shown when there are no search results
            },
            layout: {
                top: ""
            },
            data: {
                headings: ['','&emsp;&emsp;', gettext("Title"), gettext("Sourcetype"), gettext("Author"), gettext("Published"), ''],
                data: ids.map(id => this.createTableRow(id))
            },
            columns: [
                {
                    select: 0,
                    hidden: true
                },
                {
                    select: [1,6],
                    sortable: false
                }
            ]
        })
        this.lastSort = {column: 0, dir: 'asc'}

        this.table.on('datatable.sort', (column, dir) => {
            this.lastSort = {column, dir}
        })
    }

    /** Adds a list of bibliography categories to current list of bibliography categories.
     * @function setBibCategoryList
     * @param newBibCategories The new categories which will be added to the existing ones.
     */
    setBibCategoryList(bibCategories) {
        let catSelector = this.menu.model.content.find(menuItem => menuItem.id==='cat_selector')
        catSelector.content = catSelector.content.filter(cat => cat.type !== 'category')

        catSelector.content = catSelector.content.concat(bibCategories.map(cat => ({
            title: cat.category_title,
            type: 'category',
            action: overview => {
                let trs = document.querySelectorAll('#bibliography > tbody > tr')
                trs.forEach(tr => {
                    if (tr.classList.contains(`cat_${cat.id}`)) {
                        tr.style.display = ''
                    } else {
                        tr.style.display = 'none'
                    }
                })
            }
        })))
        this.menu.update()
    }

    /** This takes a list of new bib entries and adds them to BibDB and the bibliography table
     * @function updateTable
     */
    updateTable(ids) {
        // Remove items that already exist
        this.removeTableRows(ids)
        this.table.insert({data: ids.map(id => this.createTableRow(id))})
        // Redo last sort
        this.table.columns().sort(this.lastSort.column, this.lastSort.dir)
    }

    createTableRow(id) {
        let bibInfo = this.bibDB.db[id]
        let bibauthors = bibInfo.fields.author || bibInfo.fields.editor
        return [
            String(id),
            `<input type="checkbox" class="entry-select" data-id="${id}">`, // checkbox
            `<span class="fw-document-table-title fw-inline">
                <i class="fa fa-book"></i>
                <span class="edit-bib fw-link-text fw-searchable" data-id="${id}">
                    ${bibInfo.fields.title ? escapeText(litToText(bibInfo.fields.title)) : gettext('Untitled')}
                </span>
            </span>`, // title
            BibTypeTitles[bibInfo.bib_type], // sourcetype
            bibauthors ? nameToText(bibauthors) : '', // author
            `<span class="date">${bibInfo.fields.date ? bibInfo.fields.date.replace('/', ' ') : ''}</span>`, // published,
            `<span class="delete-bib fw-link-text" data-id="${id}"><i class="fa fa-trash-o">&nbsp;&nbsp;</i></span>` // delete icon
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

    /** Opens a dialog for editing categories.
     * @function editCategoriesDialog
     */
    editCategoriesDialog () {
        let buttons = [
            {
                text: gettext('Submit'),
                classes: "fw-dark",
                click: () => {
                    const cats = {ids:[], titles:[]}
                    document.querySelectorAll('#editCategories .category-form').forEach(
                        el => {
                            const title = el.value.trim()
                            if(title.length) {
                                cats.ids.push(parseInt(el.getAttribute('data-id') || 0))
                                cats.titles.push(title)
                            }
                        }
                    )
                    this.saveCategories(cats)
                    dialog.close()
                }
            },
            {
                type: 'cancel'
            }
        ]

        let dialog = new Dialog({
            id: 'editCategories',
            width: 350,
            height: 350,
            title: gettext('Edit Categories'),
            body: editCategoriesTemplate({
                categories: this.bibDB.cats
            }),
            buttons
        })
        dialog.open()

    }

    /** Dialog to confirm deletion of bibliography items.
     * @function deleteBibEntryDialog
          * @param ids Ids of items that are to be deleted.
     */
    deleteBibEntryDialog(ids) {
        let buttons = [
            {
                text: gettext('Delete'),
                class: "fw-dark",
                click: () => {
                    this.deleteBibEntries(ids)
                    dialog.close()
                }
            },
            {
                type: 'cancel'
            }
        ]

        let dialog = new Dialog({
            id: 'confirmdeletion',
            title: gettext('Confirm deletion'),
            body: `<p>${gettext('Delete the bibliography item(s)')}?</p>`,
            height: 180,
            buttons,
            icon: 'exclamation-triangle'
        })
        dialog.open()
    }

    // get IDs of selected bib entries
    getSelected() {
        return Array.from(
            document.querySelectorAll('.entry-select:checked:not(:disabled)')
        ).map(el => parseInt(el.getAttribute('data-id')))
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

    /** Initialize the bibliography table and bind interactive parts.
     * @function bibEvents
          */
    bindEvents() {
        document.addEventListener('click', event => {
            let el = {}, bookId
            switch (true) {
                case findTarget(event, '.delete-bib', el):
                    bookId = parseInt(el.target.dataset.id)
                    this.deleteBibEntryDialog([bookId])
                    break
                case findTarget(event, '.edit-bib', el):
                    bookId = parseInt(el.target.dataset.id)
                    let form = new BibEntryForm(this.bibDB, bookId)
                    form.init().then(
                        idTranslations => {
                            let ids = idTranslations.map(idTrans => idTrans[1])
                            return this.updateTable(ids)
                        }
                    )
                    break
                case findTarget(event, '.fw-add-input', el):
                    let itemEl = el.target.closest('.fw-list-input')
                    if (!itemEl.nextElementSibling) {
                        itemEl.insertAdjacentHTML(
                            'afterend',
                            `<tr class="fw-list-input">
                                <td>
                                    <input type="text" class="category-form">
                                    <span class="fw-add-input icon-addremove"></span>
                                </td>
                            </tr>`
                        )
                    } else {
                        itemEl.parentElement.removeChild(itemEl)
                    }
                    break
                default:
                    break
            }
        })

        // Allow pasting of bibtex data.
        document.body.addEventListener('paste', event => {
            if (event.target.nodeName === 'INPUT') {
                // We are inside of an input element, cancel.
                return false
            }
            let text = event.clipboardData.getData('text')
            return this.getBibtex(text)
        })

        // The two drag events are needed to allow dropping
        document.body.addEventListener('dragover', event => {
            if (event.dataTransfer.types.includes('text/plain')) {
                event.preventDefault()
            }
        })

        document.body.addEventListener('dragenter', event => {
            if (event.dataTransfer.types.includes('text/plain')) {
                event.preventDefault()
            }
        })

        // Allow dropping of bibtex data
        document.body.addEventListener('drop', event => {
            if (event.target.nodeName === 'INPUT') {
                // We are inside of an input element, cancel.
                return false
            }
            let text = fixUTF8(event.dataTransfer.getData('text'))
            return this.getBibtex(text)
        })
    }

    // find bibtex in pasted or dropped data.
    getBibtex(text) {
        const importer = new BibLatexImporter(
            text,
            this.bibDB,
            newIds => this.updateTable(newIds),
            false,
            this.staticUrl
        )
        importer.init()
        return true
    }


    saveCategories(cats) {
        this.bibDB.saveCategories(cats).then(bibCats => this.setBibCategoryList(bibCats))
    }

    deleteBibEntries(ids) {
        this.bibDB.deleteBibEntries(ids).then(ids => this.removeTableRows(ids))
    }

}

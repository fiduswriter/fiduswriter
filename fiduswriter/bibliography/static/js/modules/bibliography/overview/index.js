import fixUTF8 from "fix-utf8"
import {DataTable} from "simple-datatables"

import {litToText, nameToText} from "../tools"
import {editCategoriesTemplate} from "./templates"
import {BibTypeTitles} from "../form/strings"
import {SiteMenu} from "../../menu"
import {OverviewMenuView, findTarget, whenReady, Dialog, baseBodyTemplate, ensureCSS, setDocTitle, escapeText, DatatableBulk} from "../../common"
import {FeedbackTab} from "../../feedback"
import {menuModel, bulkModel} from "./menu"
import * as plugins from "../../../plugins/bibliography_overview"

export class BibliographyOverview {

    constructor({app, user, staticUrl}) {
        this.app = app
        this.user = user
        this.staticUrl = staticUrl
    }

    /** Bind the init function to doc loading.
     * @function bind
     */
    init() {
        whenReady().then(() => {
            this.render()
            const smenu = new SiteMenu("bibliography")
            smenu.init()
            this.menu = new OverviewMenuView(this, menuModel)
            this.menu.init()
            this.setBibCategoryList(this.app.bibDB.cats)
            this.initTable(Object.keys(this.app.bibDB.db))
            this.activatePlugins()
            this.bindEvents()
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
            'bibliography.css',
            'prosemirror.css',
            'inline_tools.css'
        ], this.staticUrl)
        setDocTitle(gettext('Bibliography Manager'), this.app)
        const feedbackTab = new FeedbackTab({staticUrl: this.staticUrl})
        feedbackTab.init()
    }


    /* Initialize the overview table */
    initTable(ids) {
        const tableEl = document.createElement('table')
        tableEl.id = "bibliography"
        tableEl.classList.add('fw-data-table')
        tableEl.classList.add('fw-large')
        document.querySelector('.fw-contents').appendChild(tableEl)

        const dt_bulk = new DatatableBulk(this, bulkModel)

        this.table = new DataTable(tableEl, {
            searchable: true,
            paging: false,
            scrollY: "calc(100vh - 240px)",
            labels: {
                noRows: gettext("No sources registered") // Message shown when there are no search results
            },
            layout: {
                top: ""
            },
            data: {
                headings: ['', dt_bulk.getHTML(), gettext("Title"), gettext("Sourcetype"), gettext("Author"), gettext("Published"), ''],
                data: ids.map(id => this.createTableRow(id))
            },
            columns: [
                {
                    select: 0,
                    hidden: true
                },
                {
                    select: [1, 6],
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

    /** Adds a list of bibliography categories to current list of bibliography categories.
     * @function setBibCategoryList
     * @param newBibCategories The new categories which will be added to the existing ones.
     */
    setBibCategoryList(bibCategories) {
        const catSelector = this.menu.model.content.find(menuItem => menuItem.id==='cat_selector')
        catSelector.content = catSelector.content.filter(cat => cat.type !== 'category')

        catSelector.content = catSelector.content.concat(bibCategories.map(cat => ({
            title: cat.category_title,
            type: 'category',
            action: _overview => {
                const trs = document.querySelectorAll('#bibliography > tbody > tr')
                trs.forEach(tr => {
                    if (tr.querySelector('.fw-data-table-title').classList.contains(`cat_${cat.id}`)) {
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
        const bibInfo = this.app.bibDB.db[id]
        const bibauthors = bibInfo.fields.author || bibInfo.fields.editor
        const cats = bibInfo.entry_cat.map(cat => `cat_${cat}`)
        return [
            String(id),
            `<input type="checkbox" class="entry-select fw-check" data-id="${id}" id="bib-${id}"><label for="bib-${id}"></label>`, // checkbox
            `<span class="fw-data-table-title ${cats.join(' ')}">
                <i class="fa fa-book"></i>
                <span class="edit-bib fw-link-text fw-searchable" data-id="${id}">
                    ${bibInfo.fields.title ? escapeText(litToText(bibInfo.fields.title)) : gettext('Untitled')}
                </span>
            </span>`, // title
            BibTypeTitles[bibInfo.bib_type], // sourcetype
            bibauthors ? nameToText(bibauthors) : '', // author
            `<span class="date">${bibInfo.fields.date ? bibInfo.fields.date.replace('/', ' ') : ''}</span>`, // published,
            `<span class="delete-bib fw-link-text" data-id="${id}"><i class="fa fa-trash-alt">&nbsp;&nbsp;</i></span>` // delete icon
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

    /** Opens a dialog for editing categories.
     * @function editCategoriesDialog
     */
    editCategoriesDialog() {
        const buttons = [
            {
                text: gettext('Submit'),
                classes: "fw-dark",
                click: () => {
                    const cats = {ids:[], titles:[]}
                    document.querySelectorAll('#editCategories .category-form').forEach(
                        el => {
                            const title = el.value.trim()
                            if (title.length) {
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

        const dialog = new Dialog({
            id: 'editCategories',
            width: 350,
            height: 350,
            title: gettext('Edit Categories'),
            body: editCategoriesTemplate({
                categories: this.app.bibDB.cats
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
        const buttons = [
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

        const dialog = new Dialog({
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
        document.body.addEventListener('click', event => {
            const el = {}
            switch (true) {
                case findTarget(event, '.delete-bib', el): {
                    const bookId = parseInt(el.target.dataset.id)
                    this.deleteBibEntryDialog([bookId])
                    break
                }
                case findTarget(event, '.edit-bib', el): {
                    const bookId = parseInt(el.target.dataset.id)
                    import("../form").then(({BibEntryForm}) => {
                        const form = new BibEntryForm(this.app.bibDB, bookId)
                        form.init().then(
                            idTranslations => {
                                const ids = idTranslations.map(idTrans => idTrans[1])
                                return this.updateTable(ids)
                            }
                        )
                    })
                    break
                }
                case findTarget(event, '.fw-add-input', el): {
                    const itemEl = el.target.closest('.fw-list-input')
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
                }
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
            const text = event.clipboardData.getData('text')
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
            const text = fixUTF8(event.dataTransfer.getData('text'))
            return this.getBibtex(text)
        })
    }

    // find bibtex in pasted or dropped data.
    getBibtex(text) {
        import("../import").then(({BibLatexImporter}) => {
            const importer = new BibLatexImporter(
                text,
                this.app.bibDB,
                newIds => this.updateTable(newIds),
                false,
                this.staticUrl
            )
            importer.init()
        })
        return true
    }


    saveCategories(cats) {
        this.app.bibDB.saveCategories(cats).then(bibCats => this.setBibCategoryList(bibCats))
    }

    deleteBibEntries(ids) {
        this.app.bibDB.deleteBibEntries(ids).then(ids => this.removeTableRows(ids))
    }

}

import fixUTF8 from "fix-utf8"
import DataTable from "vanilla-datatables"

import {BibLatexImporter} from "../import"
import {litToText, nameToText} from "../tools"
import {BibEntryForm} from "../form"
import {editCategoriesTemplate, bibtableTemplate} from "./templates"
import {BibliographyDB} from "../database"
import {BibTypeTitles} from "../form/strings"
import {SiteMenu} from "../../menu"
import {OverviewMenuView, getCsrfToken, findTarget, whenReady, Dialog} from "../../common"
import {menuModel} from "./menu"
import * as plugins from "../../../plugins/bibliography_overview"

export class BibliographyOverview {

    constructor() {
        let smenu = new SiteMenu("bibliography")
        smenu.init()
        this.menu = new OverviewMenuView(this, menuModel)
        this.menu.init()
        this.getBibDB()
        this.activatePlugins()
        this.bind()
    }

    /* load data from the bibliography */
    getBibDB() {
        this.bibDB = new BibliographyDB()
        this.bibDB.getDB().then(({bibPKs, bibCats}) => {
            this.initTable()
            this.setBibCategoryList(bibCats)
            this.addBibList(bibPKs)
        })
    }

    /* Initialize the overview table */
    initTable() {
        let tableEl = document.createElement('table')
        tableEl.classList.add('fw-document-table')
        tableEl.classList.add('fw-large')
        document.querySelector('.fw-contents').appendChild(tableEl)
        this.table = new DataTable(tableEl, {
            searchable: true,
            perPage: 100,
            labels: {
                noRows: gettext("No entries found"), // Message shown when there are no search results
                info: gettext("Showing {start} to {end} of {rows} entries") //
            },
            layout: {
                top: "",
                bottom: "{info}{pager}"
            }
        })
        this.table.insert({headings: [gettext("Title"), gettext("Sourcetype"), gettext("Author"), gettext("Published")]})
        console.log(this.table)
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
                let trs = [].slice.call(document.querySelectorAll('#bibliography > tbody > tr'))
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
     * @function addBibList
     */
    addBibList(pks) {
        this.stopBibliographyTable()
        pks.forEach(pk =>
            this.appendToBibTable(pk, this.bibDB.db[pk])
        )
        this.startBibliographyTable()
    }

    /** Opens a dialog for editing categories.
     * @function createCategoryDialog
     */
    createCategoryDialog () {
        let buttons = [
            {
                text: gettext('Submit'),
                classes: "fw-dark",
                click: () => {
                    let cats = {
                        'ids': [],
                        'titles': []
                    }
                    document.querySelectorAll('#editCategories .category-form').forEach(el => {
                        let thisVal = el.value.trim()
                        let thisId = el.getAttribute('data-id')
                        if ('undefined' == typeof (thisId)) thisId = 0
                        if ('' !== thisVal) {
                            cats.ids.push(thisId)
                            cats.titles.push(thisVal)
                        }
                    })
                    this.createCategory(cats)
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
            icon: 'fa-exclamation-triangle'
        })
        dialog.open()
    }

    // get IDs of selected bib entries
    getSelected() {
        return [].slice.call(
            document.querySelectorAll('.entry-select:checked:not(:disabled)')
        ).map(el => parseInt(el.getAttribute('data-id')))
    }


    /** Add or update an item in the bibliography table (HTML).
     * @function appendToBibTable
          * @param pk The pk specifying the bibliography item.
     * @param bibInfo An object with the current information about the bibliography item.
     */
    appendToBibTable(pk, bibInfo) {

        let bibauthors = bibInfo.fields.author || bibInfo.fields.editor

        this.table.rows().add([
            bibInfo.fields.title ? litToText(bibInfo.fields.title) : gettext('Untitled'), // title
            BibTypeTitles[bibInfo.bib_type], // sourcetype
            bibauthors ? nameToText(bibauthors) : '', // author
            bibInfo.fields.date ? bibInfo.fields.date.replace('/', ' ') : '' // published,
        ])

        //let tr = document.getElementById(`Entry_${pk}`)



        // if (tr) { //if the entry exists, update
        //     tr.insertAdjacentHTML(
        //         'afterend',
        //         bibtableTemplate({
        //             id: pk,
        //             cats: bibInfo.entry_cat,
        //             type: bibInfo.bib_type,
        //             typetitle: BibTypeTitles[bibInfo.bib_type],
        //             title: bibInfo.fields.title ? litToText(bibInfo.fields.title) : gettext('Untitled'),
        //             author: bibauthors ? nameToText(bibauthors) : '',
        //             published: bibInfo.fields.date ? bibInfo.fields.date.replace('/', ' ') : ''
        //         })
        //     )
        //     tr.parentElement.removeChild(tr)
        // } else { //if this is the new entry, append
        //     document.querySelector('#bibliography > tbody').insertAdjacentHTML(
        //         'beforeend',
        //         bibtableTemplate({
        //             id: pk,
        //             cats: bibInfo.entry_cat,
        //             type: bibInfo.bib_type,
        //             typetitle: BibTypeTitles[bibInfo.bib_type],
        //             title: bibInfo.fields.title ? litToText(bibInfo.fields.title) : gettext('Untitled'),
        //             author: bibauthors ? nameToText(bibauthors) : '',
        //             published: bibInfo.fields.date ? bibInfo.fields.date.replace('/', ' ') : ''
        //         })
        //     )
        // }
    }

    /** Stop the interactive parts of the bibliography table.
     * @function stopBibliographyTable
          */
    stopBibliographyTable () {
        jQuery('#bibliography').dataTable().fnDestroy()
    }
    /** Start the interactive parts of the bibliography table.
     * @function startBibliographyTable
          */
    startBibliographyTable() {
        // The sortable table seems not to have an option to accept new data added to the DOM. Instead we destroy and recreate it.
        let table = jQuery('#bibliography').dataTable({
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
                "aTargets": [0, 5]
            }],
        })
        document.querySelector('#bibliography_filter input').setAttribute('placeholder', gettext('Search for Bibliography'))

        jQuery('#bibliography_filter input').unbind('focus, blur')
        jQuery('#bibliography_filter input').bind('focus', function () {
            this.parentElement.classList.add('focus')
        })
        jQuery('#bibliography_filter input').bind('blur', function () {
            this.parentElement.classList.remove('focus')
        })

        let autocompleteTags = []
        document.querySelectorAll('#bibliography .fw-searchable').forEach(el => {
            autocompleteTags.push(el.textContent.replace(/^\s+/g, '').replace(/\s+$/g, ''))
        })
        autocompleteTags = [...new Set(autocompleteTags)] //unique values
        jQuery("#bibliography_filter input").autocomplete({
            source: autocompleteTags
        })
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

    /** Bind the init function to doc loading.
     * @function bind
     */
    bind() {
        whenReady().then(() => this.bindEvents())
    }

    /** Initialize the bibliography table and bind interactive parts.
     * @function init
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
                            return this.addBibList(ids)
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
        let importer = new BibLatexImporter(
            text,
            this.bibDB,
            getCsrfToken(),
            newIds => this.addBibList(newIds),
            false
        )
        importer.init()
        return true
    }


    createCategory(cats) {
        this.bibDB.createCategory(cats).then(bibCats => this.setBibCategoryList(bibCats))
    }

    deleteBibEntries(ids) {
        this.bibDB.deleteBibEntries(ids).then(ids => {
            this.stopBibliographyTable()
            ids.forEach(id => {
                let el = document.querySelector(`#Entry_${id}`)
                if (el) {
                    el.parentElement.removeChild(el)
                }
            })
            this.startBibliographyTable()
        })
    }

}

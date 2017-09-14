import fixUTF8 from "fix-utf8"
import {BibLatexParser} from "biblatex-csl-converter"
import {addRemoveListHandler, litToText, nameToText} from "../tools"
import {BibEntryForm} from "../form"
import {editCategoriesTemplate, bibtableTemplate} from "./templates"
import {BibliographyDB} from "../database"
import {BibTypeTitles} from "../form/strings"
import {SiteMenu} from "../../menu"
import {OverviewMenuView} from "../../common"
import {menuModel} from "./menu"
import * as plugins from "../../plugins/bibliography-overview"

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
            this.setBibCategoryList(bibCats)
            this.addBibList(bibPKs)
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
        let dialogHeader = gettext('Edit Categories')
        let dialogBody = editCategoriesTemplate({
            dialogHeader,
            categories: this.bibDB.cats
        })
        jQuery('body').append(dialogBody)
        let buttons = {}
        let that = this
        buttons[gettext('Submit')] = function () {
            let cats = {
                'ids': [],
                'titles': []
            }
            jQuery('#editCategories .category-form').each(function () {
                let thisVal = jQuery.trim(jQuery(this).val())
                let thisId = jQuery(this).attr('data-id')
                if ('undefined' == typeof (thisId)) thisId = 0
                if ('' !== thisVal) {
                    cats.ids.push(thisId)
                    cats.titles.push(thisVal)
                }
            })
            that.createCategory(cats)
            jQuery(this).dialog('close')
        }
        buttons[gettext('Cancel')] = function () {
            jQuery(this).dialog('close')
        }

        jQuery("#editCategories").dialog({
            resizable: false,
            width: 350,
            height: 350,
            modal: true,
            buttons,
            create: function () {
                let theDialog = jQuery(this).closest(".ui-dialog")
                theDialog.find(".ui-button:first-child").addClass("fw-button fw-dark")
                theDialog.find(".ui-button:last").addClass("fw-button fw-orange")
            },
            close: function () {
                jQuery("#editCategories").dialog('destroy').remove()
            },
        })

        addRemoveListHandler()

    }


    /** Dialog to confirm deletion of bibliography items.
     * @function deleteBibEntryDialog
          * @param ids Ids of items that are to be deleted.
     */
    deleteBibEntryDialog(ids) {
        let that = this
        jQuery('body').append('<div id="confirmdeletion" title="' + gettext(
            'Confirm deletion') + '"><p>' + gettext(
            'Delete the bibliography item(s)') + '?</p></div>')
        let diaButtons = {}
        diaButtons[gettext('Delete')] = function () {
            that.deleteBibEntries(ids)
            jQuery(this).dialog('close')
        }
        diaButtons[gettext('Cancel')] = function () {
            jQuery(this).dialog('close')
        }
        jQuery("#confirmdeletion").dialog({
            resizable: false,
            height: 180,
            modal: true,
            buttons: diaButtons,
            create: function () {
                let theDialog = jQuery(this).closest(".ui-dialog")
                theDialog.find(".ui-button:first-child").addClass(
                    "fw-button fw-dark")
                theDialog.find(".ui-button:last").addClass(
                    "fw-button fw-orange")
            },
            close: function () {
                jQuery("#confirmdeletion").dialog('destroy').remove()
            }
        })
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
        let $tr = jQuery(`#Entry_${pk}`)

        let bibauthors = bibInfo.fields.author || bibInfo.fields.editor

        if (0 < $tr.length) { //if the entry exists, update

            $tr.replaceWith(bibtableTemplate({
                'id': pk,
                'cats': bibInfo.entry_cat,
                'type': bibInfo.bib_type,
                'typetitle': BibTypeTitles[bibInfo.bib_type],
                'title': bibInfo.fields.title ? litToText(bibInfo.fields.title) : gettext('Untitled'),
                'author': bibauthors ? nameToText(bibauthors) : '',
                'published': bibInfo.fields.date ? bibInfo.fields.date.replace('/', ' ') : ''
            }))
        } else { //if this is the new entry, append
            jQuery('#bibliography > tbody').append(bibtableTemplate({
                'id': pk,
                'cats': bibInfo.entry_cat,
                'type': bibInfo.bib_type,
                'typetitle': BibTypeTitles[bibInfo.bib_type],
                'title': bibInfo.fields.title ? litToText(bibInfo.fields.title) : gettext('Untitled'),
                'author': bibauthors ? nameToText(bibauthors) : '',
                'published': bibInfo.fields.date ? bibInfo.fields.date.replace('/', ' ') : ''
            }))
        }
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
        jQuery('#bibliography_filter input').attr('placeholder', gettext('Search for Bibliography'))

        jQuery('#bibliography_filter input').unbind('focus, blur')
        jQuery('#bibliography_filter input').bind('focus', function () {
            jQuery(this).parent().addClass('focus')
        })
        jQuery('#bibliography_filter input').bind('blur', function () {
            jQuery(this).parent().removeClass('focus')
        })

        let autocompleteTags = []
        jQuery('#bibliography .fw-searchable').each(function () {
            autocompleteTags.push(this.textContent.replace(/^\s+/g, '').replace(/\s+$/g, ''))
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

    /** Bind the init function to jQuery(document).ready.
     * @function bind
     */
    bind() {
        jQuery(document).ready(() => this.bindEvents())
    }

    /** Initialize the bibliography table and bind interactive parts.
     * @function init
          */
    bindEvents() {
        let that = this
        jQuery(document).on('click', '.delete-bib', function () {
            let bookId = parseInt(jQuery(this).attr('data-id'))
            that.deleteBibEntryDialog([bookId])
        })

        jQuery(document).on('click', '.edit-bib', function () {
            let bookId = parseInt(jQuery(this).attr('data-id'))
            let form = new BibEntryForm(that.bibDB, bookId)
            form.init().then(
                idTranslations => {
                    let ids = idTranslations.map(idTrans => idTrans[1])
                    return that.addBibList(ids)
                }
            )
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
        let bibData = new BibLatexParser(text)
        let tmpDB = bibData.output
        if (!Object.keys(tmpDB).length) {
            // No entries have been found. skip
            return false
        }

        // Add missing data to entries.
        Object.values(tmpDB).forEach(bibEntry => {
            // We add an empty category list for all newly imported bib entries.
            bibEntry.entry_cat = []
            // If the entry has no title, add an empty title
            if (!bibEntry.fields.title) {
                bibEntry.fields.title = []
            }
            // If the entry has no date, add an uncertain date
            if (!bibEntry.fields.date) {
                bibEntry.fields.date = 'uuuu'
            }
            // If the entry has no editor or author, add empty author
            if (!bibEntry.fields.author && !bibEntry.fields.editor) {
                bibEntry.fields.author = [{'literal': []}]
            }
        })

        this.bibDB.saveBibEntries(tmpDB, true).then(idTranslations => {
            this.addBibList(
                idTranslations.map(trans => trans[1])
            )
        })
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

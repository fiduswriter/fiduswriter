import {addRemoveListHandler, dateFormat, litToText, nameToText} from "../tools"
import {BibEntryForm} from "../form/form"
import {editCategoriesTemplate, categoryFormsTemplate, bibtableTemplate,
    bibliographyCategoryListItemTemplate} from "./templates"
import {BibliographyDB} from "../database"
import {BibTypes} from "../statics"
import {BibTypeTitles} from "../titles"
import {BibLatexFileImporter} from "../import"
import {BibLatexFileExporter} from "../export"
import {addDropdownBox} from "../../common/common"
import {Menu} from "../../menu/menu"

export class BibliographyOverview {

    constructor() {
        new Menu("bibliography")
        this.getBibDB()
        this.bind()
    }

    /* load data from the bibliography */
    getBibDB(callback) {
        let that = this
        let docOwnerId = 0 // 0 = current user.
        this.bibDB = new BibliographyDB(docOwnerId, true, false, false)

        this.bibDB.getDB(function(bibPks, bibCats){

            that.addBibCategoryList(bibCats)
            that.addBibList(bibPks)
            if (callback) {
                callback()
            }
        })
    }

    /** Adds a list of bibliography categories to current list of bibliography categories.
     * @function addBibCategoryList
     * @param newBibCategories The new categories which will be added to the existing ones.
     */
    addBibCategoryList(newBibCategories) {
        for (let i = 0; i < newBibCategories.length; i++) {
            this.appendToBibCatList(newBibCategories[i])
        }
    }

    /** Add an item to the HTML list of bibliography categories.
     * @function appendToBibCatList
     * @param bCat Category to be appended.
     */
    appendToBibCatList(bCat) {
        jQuery('#bib-category-list').append(bibliographyCategoryListItemTemplate({
            'bCat': bCat
        }))
    }

    /** This takes a list of new bib entries and adds them to BibDB and the bibliography table
     * @function addBibList
     */
    addBibList(pks) {
        //if (jQuery('#bibliography').length > 0) {
        this.stopBibliographyTable()
        for (let i = 0; i < pks.length; i++) {
            this.appendToBibTable(pks[i], this.bibDB.db[pks[i]])
        }
        this.startBibliographyTable()
        //}

    }

    /** Opens a dialog for editing categories.
     * @function createCategoryDialog
     */
    createCategoryDialog () {
        let that = this
        let dialogHeader = gettext('Edit Categories')
        let dialogBody = editCategoriesTemplate({
            'dialogHeader': dialogHeader,
            'categories': categoryFormsTemplate({
                'categories': this.bibDB.cats
            })
        })
        jQuery('body').append(dialogBody)
        let diaButtons = {}
        diaButtons[gettext('Submit')] = function () {
            let newCat = {
                'ids': [],
                'titles': []
            }
            jQuery('#editCategories .category-form').each(function () {
                let thisVal = jQuery.trim(jQuery(this).val())
                let thisId = jQuery(this).attr('data-id')
                if ('undefined' == typeof (thisId)) thisId = 0
                if ('' !== thisVal) {
                    newCat.ids.push(thisId)
                    newCat.titles.push(thisVal)
                } else if ('' === thisVal && 0 < thisId) {
                    that.deletedCat[that.deletedCat
                        .length] = thisId
                }
            })
            that.bibDB.deleteCategory(that.deletedCat)
            that.createCategory(newCat)
            jQuery(this).dialog('close')
        }
        diaButtons[gettext('Cancel')] = function () {
            jQuery(this).dialog('close')
        }

        jQuery("#editCategories").dialog({
            resizable: false,
            width: 350,
            height: 350,
            modal: true,
            buttons: diaButtons,
            create: function () {
                let theDialog = jQuery(this).closest(".ui-dialog")
                theDialog.find(".ui-button:first-child").addClass("fw-button fw-dark")
                theDialog.find(".ui-button:last").addClass("fw-button fw-orange")
            },
            close: function () {
                jQuery("#editCategories").dialog('destroy').remove()
            },
        })

        this.deletedCat = []
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
            that.deleteBibEntry(ids)
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


    /** Add or update an item in the bibliography table (HTML).
     * @function appendToBibTable
          * @param pk The pk specifying the bibliography item.
     * @param bibInfo An object with the current information about the bibliography item.
     */
    appendToBibTable(pk, bibInfo) {
        let $tr = jQuery('#Entry_' + pk)

        let bibauthors = bibInfo.fields.author || bibInfo.fields.editor

        if (0 < $tr.length) { //if the entry exists, update

            $tr.replaceWith(bibtableTemplate({
                'id': pk,
                'cats': bibInfo.entry_cat.split(','),
                'type': bibInfo.bib_type,
                'typetitle': BibTypeTitles[bibInfo.bib_type],
                'title': litToText(bibInfo.fields.title),
                'author': nameToText(bibauthors),
                'published': bibInfo.fields.date.replace('/', ' ')
            }))
        } else { //if this is the new entry, append
            jQuery('#bibliography > tbody').append(bibtableTemplate({
                'id': pk,
                'cats': bibInfo.entry_cat.split(','),
                'type': bibInfo.bib_type,
                'typetitle': BibTypeTitles[bibInfo.bib_type],
                'title': litToText(bibInfo.fields.title),
                'author': nameToText(bibauthors),
                'published': bibInfo.fields.date.replace('/', ' ')
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
        autocompleteTags = _.uniq(autocompleteTags)
        jQuery("#bibliography_filter input").autocomplete({
            source: autocompleteTags
        })
    }
    /** Bind the init function to jQuery(document).ready.
     * @function bind
     */
    bind() {
        let that = this
        jQuery(document).ready(function () {
            that.bindEvents()
        })

    }

    /** Initialize the bibliography table and bind interactive parts.
     * @function init
          */
    bindEvents() {
        let that = this
        jQuery(document).on('click', '.delete-bib', function () {
            let BookId = jQuery(this).attr('data-id')
            that.deleteBibEntryDialog([BookId])
        })
        jQuery('#edit-category').bind('click', function(){
            that.createCategoryDialog()
        })

        jQuery(document).on('click', '.edit-bib', function () {
            let eID = jQuery(this).attr('data-id')
            let eType = jQuery(this).attr('data-type')
            new BibEntryForm(eID, eType, that.bibDB.db, that.bibDB.cats, false, function(bibEntryData){
                that.createBibEntry(bibEntryData)
            })
        })

        //open dropdown for bib category
        addDropdownBox(jQuery('#bib-category-btn'), jQuery('#bib-category-pulldown'))
        jQuery(document).on('mousedown', '#bib-category-pulldown li > span', function () {
            jQuery('#bib-category-btn > label').html(jQuery(this).html())
            jQuery('#bib-category').val(jQuery(this).attr('data-id'))
            jQuery('#bib-category').trigger('change')
        })

        //filtering function for the list of bib entries
        jQuery('#bib-category').bind('change', function () {
            let catVal = jQuery(this).val()
            if ('0' === catVal) {
                jQuery('#bibliography > tbody > tr').show()
            } else {
                jQuery('#bibliography > tbody > tr').hide()
                jQuery('#bibliography > tbody > tr.cat_' + catVal).show()
            }
        })

        //select all entries
        jQuery('#select-all-entry').bind('change', function () {
            let newBool = false
            if (jQuery(this).prop("checked"))
                newBool = true
            jQuery('.entry-select').each(function () {
                this.checked = newBool
            })
        })

        //open dropdown for selecting action
        addDropdownBox(jQuery('#select-action-dropdown'), jQuery('#action-selection-pulldown'))

        //import a bib file
        jQuery('.import-bib').bind('click', function () {
            new BibLatexFileImporter(that.bibDB, function(bibEntries) {
                that.addBibList(bibEntries)
            })
        })

        //submit entry actions
        jQuery('#action-selection-pulldown li > span').bind('mousedown', function () {
            let actionName = jQuery(this).attr('data-action'),
                ids = []

            if ('' === actionName || 'undefined' == typeof (actionName)) {
                return
            }

            jQuery('.entry-select:checked').each(function () {
                ids[ids.length] = parseInt(jQuery(this).attr('data-id'))
            })

            if (0 === ids.length) {
                return
            }

            switch (actionName) {
            case 'delete':
                that.deleteBibEntryDialog(ids)
                break
            case 'export':
                let exporter = new BibLatexFileExporter(that.bibDB, ids)
                exporter.init()
                break
            }
        })

    }


    createCategory(cats) {
        let that = this
        this.bibDB.createCategory(cats, function(bibCats){
            jQuery('#bib-category-list li').not(':first').remove()
            that.addBibCategoryList(bibCats)
        })
    }

    deleteBibEntry(ids) {
        let that = this
        this.bibDB.deleteBibEntry(ids, function(ids){
            that.stopBibliographyTable()
            let elementsId = '#Entry_' + ids.join(', #Entry_')
            jQuery(elementsId).detach()
            that.startBibliographyTable()
        })
    }

    createBibEntry(bibEntryData) {
        let that = this
        this.bibDB.createBibEntry(bibEntryData, function(newBibPks) {
             that.addBibList(newBibPks)
        })
    }


}

import {formatDateString, addRemoveListHandler, dateFormat} from "../tools"
import {BibEntryForm} from "../form/form"
import {editCategoriesTemplate, categoryFormsTemplate, bibtableTemplate,
    bibliographyCategoryListItemTemplate} from "./templates"
import {BibliographyDB} from "../database"
import {BibEntryTypes} from "../statics"
import {BibLatexImporter} from "../importer/biblatex"

export class BibliographyOverview {

    constructor() {
        this.getBibDB()
        this.bind()
    }

    /* load data from the bibliography */
    getBibDB(callback) {
        let that = this
        let docOwnerId = 0 // 0 = current user.
        this.db = new BibliographyDB(docOwnerId, true, false, false)

        this.db.getBibDB(function(bibPks, bibCats){

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
            this.appendToBibTable(pks[i], this.db.bibDB[pks[i]])
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
                'categories': this.db.bibCats
            })
        })
        jQuery('body').append(dialogBody)
        let diaButtons = {}
        diaButtons[gettext('Submit')] = function () {
            let new_cat = {
                'ids': [],
                'titles': []
            }
            jQuery('#editCategories .category-form').each(function () {
                let this_val = jQuery.trim(jQuery(this).val())
                let this_id = jQuery(this).attr('data-id')
                if ('undefined' == typeof (this_id)) this_id = 0
                if ('' != this_val) {
                    new_cat.ids.push(this_id)
                    new_cat.titles.push(this_val)
                } else if ('' == this_val && 0 < this_id) {
                    that.deleted_cat[that.deleted_cat
                        .length] = this_id
                }
            })
            that.db.deleteCategory(that.deleted_cat)
            that.createCategory(new_cat)
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

        this.deleted_cat = []
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
     * @param bib_info An object with the current information about the bibliography item.
     */
    appendToBibTable(pk, bib_info) {
        let $tr = jQuery('#Entry_' + pk)
        //reform author field
        let bibauthor = bib_info.author || bib_info.editor
        // If neither author nor editor were registered, use an empty string instead of nothing.
        // TODO: Such entries should likely not be accepted by the importer.
        if (typeof bibauthor === 'undefined') bibauthor = ''
        let bibauthors = bibauthor.split('} and {')
        //if there are more authors, add "and others" behind.
        let and_others = (1 < bibauthors.length) ? gettext(' and others') : ''
        bibauthor = bibauthors[0]
        let bibauthor_list = bibauthor.split('} {')
        if (1 < bibauthor_list.length) {
            bibauthor = bibauthor_list[1] + ', ' + bibauthor_list[0]
        } else {
            bibauthor = bibauthor_list[0]
        }
        bibauthor = bibauthor.replace(/[{}]/g, '')
        bibauthor += and_others
        // If title is undefined, set it to an empty string.
        // TODO: Such entries should likely not be accepted by the importer.
        if (typeof bib_info.title === 'undefined') bib_info.title = ''


        if (0 < $tr.size()) { //if the entry exists, update
            $tr.replaceWith(bibtableTemplate({
                'id': pk,
                'cats': bib_info.entry_cat.split(','),
                'type': bib_info.entry_type,
                'typetitle': BibEntryTypes[bib_info.entry_type]['title'],
                'title': bib_info.title.replace(/[{}]/g, ''),
                'author': bibauthor,
                'published': formatDateString(bib_info.date)
            }))
        } else { //if this is the new entry, append
            jQuery('#bibliography > tbody').append(bibtableTemplate({
                'id': pk,
                'cats': bib_info.entry_cat.split(','),
                'type': bib_info.entry_type,
                'typetitle': BibEntryTypes[bib_info.entry_type]['title'],
                'title': bib_info.title.replace(/[{}]/g, ''),
                'author': bibauthor,
                'published': formatDateString(bib_info.date)
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
        jQuery('#bibliography').dataTable({
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

        let autocomplete_tags = []
        jQuery('#bibliography .fw-searchable').each(function () {
            autocomplete_tags.push(this.textContent.replace(/^\s+/g, '').replace(/\s+$/g, ''))
        })
        autocomplete_tags = _.uniq(autocomplete_tags)
        jQuery("#bibliography_filter input").autocomplete({
            source: autocomplete_tags
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
            new BibEntryForm(eID, eType, that.db.bibDB, that.db.bibCats, false, function(bibEntryData){
                that.createBibEntry(bibEntryData)
            })
        })

        //open dropdown for bib category
        $.addDropdownBox(jQuery('#bib-category-btn'), jQuery('#bib-category-pulldown'))
        jQuery(document).on('click', '#bib-category-pulldown li > span', function () {
            jQuery('#bib-category-btn > label').html(jQuery(this).html())
            jQuery('#bib-category').val(jQuery(this).attr('data-id'))
            jQuery('#bib-category').trigger('change')
        })

        //filtering function for the list of bib entries
        jQuery('#bib-category').bind('change', function () {
            let cat_val = jQuery(this).val()
            if (0 == cat_val) {
                jQuery('#bibliography > tbody > tr').show()
            } else {
                jQuery('#bibliography > tbody > tr').hide()
                jQuery('#bibliography > tbody > tr.cat_' + cat_val).show()
            }
        })

        //select all entries
        jQuery('#select-all-entry').bind('change', function () {
            let new_bool = false
            if (jQuery(this).prop("checked"))
                new_bool = true
            jQuery('.entry-select').each(function () {
                this.checked = new_bool
            })
        })

        //open dropdown for selecting action
        $.addDropdownBox(jQuery('#select-action-dropdown'), jQuery('#action-selection-pulldown'))

        //import a bib file
        jQuery('.import-bib').bind('click', function () {
            new BibLatexImporter(that.db, function(bibEntries) {
                that.addBibList(bibEntries)
            })
        })

        //submit entry actions
        jQuery('#action-selection-pulldown li > span').bind('mousedown', function () {
            let action_name = jQuery(this).attr('data-action'),
                ids = []

            if ('' == action_name || 'undefined' == typeof (action_name)) {
                return
            }

            jQuery('.entry-select:checked').each(function () {
                ids[ids.length] = jQuery(this).attr('data-id')
            })

            if (0 == ids.length) {
                return
            }

            switch (action_name) {
            case 'delete':
                that.deleteBibEntryDialog(ids)
                break
            case 'export':
                new BibLatexExporter(ids, window.BibDB, true)
                break
            }
        })

    }


    createCategory(cats) {
        let that = this
        this.db.createCategory(cats, function(bibCats){
            jQuery('#bib-category-list li').not(':first').remove()
            that.addBibCategoryList(bibCats)
        })
    }

    deleteBibEntry(ids) {
        let that = this
        this.db.deleteBibEntry(ids, function(ids){
            that.stopBibliographyTable()
            let elements_id = '#Entry_' + ids.join(', #Entry_')
            jQuery(elements_id).detach()
            that.startBibliographyTable()
        })
    }

    createBibEntry(bibEntryData) {
        let that = this
        this.db.createBibEntry(bibEntryData, function(newBibPks) {
             that.addBibList(newBibPks)
        })
    }


}

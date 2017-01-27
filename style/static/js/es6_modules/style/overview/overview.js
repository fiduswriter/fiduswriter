import {StyleUploadDialog} from "../upload-dialog/upload-dialog"
import {addDropdownBox, activateWait, deactivateWait, addAlert, localizeDate} from "../../common"
import {csrfToken} from "../../common"
import {Menu} from "../../menu"
import {usermediaTableTemplate} from "./templates"
import {StyleDB} from "../database"


export class StyleOverview {

    constructor() {
        new Menu("Style")
        this.getStyleDB()
        this.bind()
    }

    /* load data from the Style */
    getStyleDB(callback) {
        let that = this
        let docOwnerId = 0 // 0 = current user.
        this.styleDB = new StyleDB(docOwnerId, true, false, false)

        this.styleDB.getDB(false,function(stylePks){

            that.addStyleList(stylePks)
            if (callback) {
                callback()
            }
        })
    }

    /** This takes a list of new style entries and adds them to StyleDB and the style table
     * @function addStyleList
     */
    addStyleList(pks) {
        this.stopStyleTable()
        for (let i = 0; i < pks.length; i++) {
            this.appendToStyleTable(pks[i], this.styleDB.db[pks[i]])
        }
        this.startStyleTable()

    }


    
    /** Dialog to confirm deletion of style items.
     * @function deleteStyleDialog
          * @param ids Ids of items that are to be deleted.
     */
    deleteStyleDialog(ids) {
        let that = this
        jQuery('body').append('<div id="confirmdeletion" title="' + gettext(
            'Confirm deletion') + '"><p>' + gettext(
            'Delete the Style item(s)') + '?</p></div>')
        let diaButtons = {}
        diaButtons[gettext('Delete')] = function () {
            that.deleteStyle(ids)
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


    /** Add or update an item in the style table (HTML).
     * @function appendToStyleTable
          * @param pk The pk specifying the Style item.
     * @param styleInfo An object with the current information about the style item.
     */
    appendToStyleTable(pk) {
        let styleInfo = this.styleDB.db[pk]
        let $tr = jQuery('#style_' + pk)
        
        if (0 < $tr.length) { //if the image entry exists, update
            $tr.replaceWith(usermediaTableTemplate({
                pk,
                'font' :styleInfo.font,
                'title': styleInfo.title,
                'css': styleInfo.css,
                'latexcls': styleInfo.latexcls,
                'docx': styleInfo.docx,
                'added': styleInfo.added
            }))
        } else { //if this is the new image, append
            jQuery('#stylelist > tbody').append(usermediaTableTemplate({
                pk,
                'font' :styleInfo.font,
                'title': styleInfo.title,
                'css': styleInfo.css,
                'latexcls': styleInfo.latexcls,
                'docx': styleInfo.docx,
                'added': styleInfo.added
            }))
        }
    }
    /** Stop the interactive parts of the Style table.
     * @function stopStyleTable
          */
    stopStyleTable () {
        jQuery('#style').dataTable().fnDestroy()
    }
    /** Start the interactive parts of the style table.
     * @function startStyleTable
          */
    startStyleTable() {
        // The sortable table seems not to have an option to accept new data added to the DOM. Instead we destroy and recreate it.
        let table = jQuery('#style').dataTable({
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
        jQuery('#style_filter input').attr('placeholder', gettext('Search for Styles'))

        jQuery('#style_filter input').unbind('focus, blur')
        jQuery('#style_filter input').bind('focus', function () {
            jQuery(this).parent().addClass('focus')
        })
        jQuery('#style_filter input').bind('blur', function () {
            jQuery(this).parent().removeClass('focus')
        })

        let autocompleteTags = []
        jQuery('#style .fw-searchable').each(function () {
            autocompleteTags.push(this.textContent.replace(/^\s+/g, '').replace(/\s+$/g, ''))
        })
        autocompleteTags = _.uniq(autocompleteTags)
        jQuery("#style_filter input").autocomplete({
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

    /** Initialize the style table and bind interactive parts.
     * @function init
          */
    bindEvents() {
        let that = this
        jQuery(document).on('click', '.delete-style', function () {
            let StyleId = jQuery(this).attr('data-id')
            that.deleteStyleDialog([StyleId])
        })

        jQuery(document).on('click', '.edit-style', function () {
            let styleID = jQuery(this).attr('data-id')
            new StyleUploadDialog(that.styleDB, styleID, 0, function(newStylePks) {
             that.addStyleList(newStylePks)
        })
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


        //submit entry actions
        jQuery('#action-selection-pulldown li > span').bind('mousedown', function () {
            let actionName = jQuery(this).attr('data-action'),
                ids = []

            if ('' === actionName || 'undefined' == typeof (actionName)) {
                return
            }

            jQuery('.entry-select:checked').each(function () {
                ids[ids.length] = jQuery(this).attr('data-id')
            })

            if (0 === ids.length) {
                return
            }

            switch (actionName) {
            case 'delete':
                that.deleteStyleDialog(ids)
                break
            case 'export':
                new StyleExporter(ids, that.style.db, true)
                break
            }
        })

    }



    deleteStyle(ids) {
        let that = this
        this.styleDB.deleteStyle(ids, function(ids){
            that.stopStyleTable()
            let elementsId = '#style_' + ids.join(', #style_')
            jQuery(elementsId).detach()
            that.startStyleTable()
        })
    }

    createStyle(styleData) {
        let that = this
        this.styleDB.createStyle(styleData, function(newStylePks) {
             that.addStyleList(newStylePks)
        })
    }


}

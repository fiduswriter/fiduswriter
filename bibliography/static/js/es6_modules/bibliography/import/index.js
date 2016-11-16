import {BibLatexParser} from "biblatex-csl-converter"
import {importBibTemplate} from "./templates"
import {activateWait, deactivateWait, addAlert, csrfToken} from "../../common/common"

/** First step of the BibTeX file import. Creates a dialog box to specify upload file.
 */

export class BibLatexFileImporter {

    constructor(db, callback) {
        this.db = db
        this.callback = callback
        this.openDialog()
    }

    openDialog() {
        let that = this
        jQuery('body').append(importBibTemplate())
        let diaButtons = {}
        diaButtons[gettext('Import')] = function () {
            let bibFile = jQuery('#bib-uploader')[0].files
            if (0 === bibFile.length) {
                console.warn('no file found')
                return false
            }
            bibFile = bibFile[0]
            if (10485760 < bibFile.size) {
                console.warn('file too big')
                return false
            }
            activateWait()
            let reader = new window.FileReader()
            reader.onerror = function (e) {
                console.error('error', e.target.error.code)
            }
            reader.onload = function(event){that.processFile(event.target.result)}
            reader.readAsText(bibFile)
            jQuery(this).dialog('close')
        }
        diaButtons[gettext('Cancel')] = function () {
            jQuery(this).dialog('close')
        }
        jQuery("#importbibtex").dialog({
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
                jQuery('#bib-uploader').bind('change', function () {
                    jQuery('#import-bib-name').html(jQuery(this).val().replace(
                        /C:\\fakepath\\/i, ''))
                })
                jQuery('#import-bib-btn').bind('click', function () {
                    jQuery('#bib-uploader').trigger('click')
                })
            },
            close: function () {
                jQuery("#importbibtex").dialog('destroy').remove()
            }
        })
    }

    /** Second step of the BibTeX file import. Takes a BibTeX file object,
     * processes client side and cuts into chunks to be uploaded to the server.
     * @param e File object that is to be imported.
     */
    processFile(fileContents) {
        let that = this
        let bibData = new BibLatexParser(fileContents)
        this.bibEntries = bibData.output
        this.bibEntries.forEach((bibEntry) => {
            // We add an empty category list for all newly imported bib entries.
            bibEntry.entry_cat = ''
        })
        if (_.isEmpty(this.bibEntries)) {
            deactivateWait()
            addAlert('error', gettext('No bibliography entries could be found in import file.'))
            return
        } else {
            bibData.errors.forEach(function(error){
                switch (error.type) {
                    case 'variable_error':
                        addAlert('error', gettext('A variable could not be identified. Possible error in bibtex syntax.'))
                        break
                    case 'unknown_field':
                        addAlert('error', error.field_name + gettext(' of ') +
                            error.entry +
                            gettext(' cannot not be saved. Fidus Writer does not support the field.')
                        )
                        break
                    case 'unknown_type':
                        addAlert('warning', error.type_name + gettext(' of ') +
                            error.entry +
                            gettext(' is saved as "misc". Fidus Writer does not support the entry type.')
                        )
                        break
                }
            })
            this.totalChunks = Math.ceil(this.bibEntries.length / 50)
            this.currentChunkNumber = 0
            this.processChunk()
        }

    }

    processChunk() {
        let that = this
        if (this.currentChunkNumber < this.totalChunks) {
            let fromNumber = this.currentChunkNumber * 50
            let toNumber = fromNumber + 50
            let currentChunk = this.bibEntries.slice(fromNumber, toNumber)
            this.sendChunk(currentChunk, function () {
                that.currentChunkNumber++
                that.processChunk()
            })
        } else {
            deactivateWait()
        }
    }
    /** Third step of the BibTeX file import. Takes lists of bibliography entries and sends them to the server.
     * @param bibEntries The list of bibEntries received from processFile.
     * @param callback Function to be called when import to server has finished.
     *
     */

    sendChunk(bibEntries, callback) {

        let postData = {
            'bibs': JSON.stringify(bibEntries)
        }, that = this

        jQuery.ajax({
            url: '/bibliography/save/',
            type: 'post',
            data: postData,
            dataType: 'json',
            crossDomain: false, // obviates need for sameOrigin test
            beforeSend: function(xhr, settings) {
                xhr.setRequestHeader("X-CSRFToken", csrfToken)
            },
            success: function (response, textStatus, jqXHR) {
                let ids = []
                response.bibs.forEach(function(bibEntry) {
                    that.db.serverBibItemToBibDB(bibEntry)
                    ids.push(bibEntry.id)
                })
                if (that.callback) {
                    that.callback(ids)
                }

                callback()

            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.error(jqXHR.responseText)
            },
            complete: function () {
            }
        })
    }

}

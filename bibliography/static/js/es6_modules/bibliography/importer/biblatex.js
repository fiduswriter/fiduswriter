import {BibLatexParser} from "./biblatex-parser"
import {importBibTemplate} from "./templates"
/** First step of the BibTeX file import. Creates a dialog box to specify upload file.
 */

export class BibLatexImporter {

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
            if (0 == bibFile.length) {
                console.log('no file found')
                return false
            }
            bibFile = bibFile[0]
            if (10485760 < bibFile.size) {
                console.log('file too big')
                return false
            }
            $.activateWait()
            let reader = new FileReader()
            reader.onerror = function (e) {
                console.log('error', e.target.error.code)
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
    processFile(file) {
        let that = this
        let bibData = new BibLatexParser()
        bibData.setInput(file)
        bibData.bibtex()
        this.bibEntries = bibData.getEntries()
        if (_.isEmpty(this.bibEntries)) {
            $.deactivateWait()
            $.addAlert('error', gettext('No bibliography entries could be found in import file.'))
            return
        } else {
            this.bibKeylist = Object.keys(this.bibEntries)
            this.totalChunks = Math.ceil(this.bibKeylist.length / 50)
            this.currentChunkNumber = 0
            this.processChunk()
        }

    }

    processChunk() {
        let that = this
        if (this.currentChunkNumber < this.totalChunks) {
            let currentChunk = {}
            let fromNumber = this.currentChunkNumber * 50
            let toNumber = fromNumber + 50
            for (let i = fromNumber; i < toNumber; i++) {
                currentChunk[this.bibKeylist[i]] = this.bibEntries[this.bibKeylist[i]]
            }
            this.sendChunk(currentChunk, function () {
                that.currentChunkNumber++
                that.processChunk()
            })
        } else {
            $.deactivateWait()
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

        $.ajax({
            url: '/bibliography/import_bibtex/',
            type: 'post',
            data: postData,
            dataType: 'json',
            success: function (response, textStatus, jqXHR) {
                let ids = []
                response.bibs.forEach(function(bibEntry) {
                    that.db.serverBibItemToBibDB(bibEntry)
                    ids.push(bibEntry.id)
                })
                if (that.callback) {
                    that.callback(ids)
                }
                let errors = response.errors,
                    warnings = response.warning,
                    len = errors.length

                for (let i = 0; i < len; i++) {
                    $.addAlert('error', errors[i])
                }
                len = warnings.length
                for (let i = 0; i < len; i++) {
                    $.addAlert('warning', warnings[i])
                }

                callback()

            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.log(jqXHR.responseText)
            },
            complete: function () {
            }
        })
    }

}

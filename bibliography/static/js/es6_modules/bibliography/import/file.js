import {BibLatexParser} from "biblatex-csl-converter"
import {importBibFileTemplate} from "./templates"
import {activateWait, deactivateWait, addAlert, csrfToken} from "../../common"

/** First step of the BibTeX file import. Creates a dialog box to specify upload file.
 */

export class BibLatexFileImporter {

    constructor(bibDB, addToListCall) {
        this.bibDB = bibDB
        this.addToListCall = addToListCall
        this.openDialog()
        this.tmpDB = false
    }

    openDialog() {
        let that = this
        jQuery('body').append(importBibFileTemplate())
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
            reader.onerror = error => console.error('error', error.target.error.code)
            reader.onload = event => that.processFile(event.target.result)
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
                jQuery('#import-bib-btn').bind('click', () =>
                    jQuery('#bib-uploader').trigger('click')
                )
            },
            close: () =>
                jQuery("#importbibtex").dialog('destroy').remove()
        })
    }

    /** Second step of the BibTeX file import. Takes a BibTeX file object,
     * processes client side and cuts into chunks to be uploaded to the server.
     */
    processFile(fileContents) {
        let bibData = new BibLatexParser(fileContents)
        this.tmpDB = bibData.output
        this.bibKeys = Object.keys(this.tmpDB)
        if (_.isEmpty(this.bibKeys)) {
            deactivateWait()
            addAlert('error', gettext('No bibliography entries could be found in import file.'))
            return
        } else {
            this.bibKeys.forEach((bibKey) => {
                let bibEntry = this.tmpDB[bibKey]
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
            bibData.errors.forEach(error => {
                let errorMsg = gettext('An error occured while reading the bibtex file')
                errorMsg += `, error_code: ${error.type}`
                if (error.key) {
                    errorMsg += `, key: ${error.key}`
                }
                addAlert('error', errorMsg)
            })
            bibData.warnings.forEach(warning => {
                let warningMsg
                switch (warning.type) {
                    case 'unknown_field':
                        warningMsg = warning.field_name + gettext(' of ') +
                            warning.entry +
                            gettext(' cannot not be saved. Fidus Writer does not support the field.')
                        break
                    case 'unknown_type':
                        warningMsg = warning.type_name + gettext(' of ') +
                            warning.entry +
                            gettext(' is saved as "misc". Fidus Writer does not support the entry type.')
                        break
                    case 'unknown_date':
                        warningMsg = warning.field_name + gettext(' of ') +
                            warning.entry +
                            gettext(' not a valid EDTF string.')
                        break
                    default:
                        warningMsg = gettext('An warning occured while reading the bibtex file')
                        warningMsg += `, warning_code: ${warning.type}`
                        if (warning.key) {
                            warningMsg += `, key: ${warning.key}`
                        }
                }
                addAlert('warning', warningMsg)
            })
            this.totalChunks = Math.ceil(this.bibKeys.length / 50)
            this.currentChunkNumber = 0
            this.processChunk()
        }

    }

    processChunk() {
        if (this.currentChunkNumber < this.totalChunks) {
            let fromNumber = this.currentChunkNumber * 50
            let toNumber = fromNumber + 50
            let currentChunk = {}
            this.bibKeys.slice(fromNumber, toNumber).forEach((bibKey)=>{
                currentChunk[bibKey] = this.tmpDB[bibKey]
            })
            this.bibDB.saveBibEntries(currentChunk, true).then(ids => {
                this.addToListCall(ids)
                this.currentChunkNumber++
                this.processChunk()
            })
        } else {
            deactivateWait()
        }
    }

}

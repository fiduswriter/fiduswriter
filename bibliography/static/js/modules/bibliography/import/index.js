import {importBibFileTemplate} from "./templates"
import {activateWait, deactivateWait, addAlert} from "../../common"
import {BibLatexFileImporter} from "../../importer/biblatex"
/** First step of the BibTeX file import. Creates a dialog box to specify upload file.
 */

export class BibLatexFileImportDialog {

    constructor(bibDB, addToListCall) {
        this.bibDB = bibDB
        this.addToListCall = addToListCall
        this.tmpDB = false
    }

    init() {
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

    processFile(fileContents) {
        let importer = new BibLatexFileImporter(fileContents, message => this.onMessage(message))
        importer.init()
    }

    onMessage(message) {
        switch (message.type) {
            case 'error':
                addAlert('error', message.errorMsg)
                break
            case 'warning':
                addAlert('warning', message.warningMsg)
                break
            case 'savedBibEntries':
                this.bibDB.updateLocalBibEntries(message.tmpDB, message.idTranslations)
                let newIds = message.idTranslations.map(idTrans => idTrans[1])
                this.addToListCall(newIds)
                break
            default:
                break
        }
        if (message.done) {
            deactivateWait()
        }
    }

}

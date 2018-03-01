import {importBibFileTemplate} from "./templates"
import {activateWait, deactivateWait, addAlert, getCsrfToken} from "../../common"

/** First step of the BibTeX file import. Creates a dialog box to specify upload file.
 */

const ERROR_MSG = {
    'no_entries': gettext('No bibliography entries could be found in import file.'),
    'entry_error': gettext('An error occured while reading a bibtex entry'),
    'unknown_field': gettext('Field cannot not be saved. Fidus Writer does not support the field.'),
    'unknown_type': gettext('Entry has been saved as "misc". Fidus Writer does not support the entry type.'),
    'unknown_date': gettext('Field does not contain a valid EDTF string.'),
    'server_save': gettext('The bibliography could not be updated')
}


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
        let importWorker = new Worker(`${$StaticUrls.transpile.base$}biblatex_import_worker.js?v=${$StaticUrls.transpile.version$}`);
        let csrfToken = getCsrfToken()
        importWorker.onmessage = message => this.onMessage(message.data, importWorker)
        importWorker.postMessage({fileContents, csrfToken})
    }

    onMessage(message, worker) {
        switch (message.type) {
            case 'error':
            case 'warning':
                let errorMsg = ERROR_MSG[message.errorCode]
                if (!errorMsg) {
                    errorMsg = gettext('There was an issue with the bibtex import')
                }
                if (message.errorType) {
                    errorMsg += `, error_type: ${message.errorType}`
                }
                if (message.key) {
                    errorMsg += `, key: ${message.key}`
                }
                if (message.type_name) {
                    errorMsg += `, entry: ${message.type_name}`
                }
                if (message.field_name) {
                    errorMsg += `, field_name: ${message.field_name}`
                }
                if (message.entry) {
                    errorMsg += `, entry: ${message.entry}`
                }
                addAlert(message.type, errorMsg)
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
            worker.terminate()
        }
    }

}

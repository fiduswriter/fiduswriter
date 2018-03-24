import {importBibFileTemplate} from "./templates"
import {activateWait, deactivateWait, getCsrfToken} from "../../common"
import {BibLatexImporter} from "./biblatex"
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
        document.body.insertAdjacentHTML('beforeend', importBibFileTemplate())
        let buttons = [
            {
                text: gettext('Import'),
                class: 'fw-button fw-dark',
                click: () => {
                    let bibFile = document.getElementById('bib-uploader').files
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
                    reader.onload = event => {
                        let importer = new BibLatexImporter(
                            event.target.result,
                            that.bibDB,
                            getCsrfToken(),
                            that.addToListCall,
                            () => deactivateWait()
                        )
                        importer.init()
                    }
                    reader.readAsText(bibFile)
                    jQuery(this).dialog('close')
                }
            },
            {
                text: gettext('Cancel'),
                class: 'fw-button fw-orange',
                click: () => jQuery(this).dialog('close')
            }
        ]
        jQuery("#importbibtex").dialog({
            resizable: false,
            height: 180,
            modal: true,
            buttons,
            create: function () {
                document.getElementById('bib-uploader').addEventListener(
                    'change',
                    event => document.getElementById('import-bib-name').innerHTML =
                        document.getElementById('bib-uploader').value.replace(/C:\\fakepath\\/i, '')
                )
                document.getElementById('import-bib-btn').addEventListener(
                    'click',
                    event => document.getElementById('bib-uploader').click()
                )
            },
            close: () =>
                jQuery("#importbibtex").dialog('destroy').remove()
        })
    }



}

import {importBibFileTemplate} from "./templates"
import {activateWait, deactivateWait, getCsrfToken, Dialog} from "../../common"
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
        let buttons = [
            {
                text: gettext('Import'),
                classes: 'fw-dark',
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
                            this.bibDB,
                            getCsrfToken(),
                            this.addToListCall,
                            () => deactivateWait()
                        )
                        importer.init()
                    }
                    reader.readAsText(bibFile)
                    dialog.close()
                }
            },
            {
                type: 'cancel'
            }
        ]
        let dialog = new Dialog({
            id: 'importbibtex',
            title: gettext('Import a BibTex library'),
            body: importBibFileTemplate(),
            height: 180,
            buttons
        })
        document.getElementById('bib-uploader').addEventListener(
            'change',
            event => document.getElementById('import-bib-name').innerHTML =
                document.getElementById('bib-uploader').value.replace(/C:\\fakepath\\/i, '')
        )
        document.getElementById('import-bib-btn').addEventListener(
            'click',
            event => document.getElementById('bib-uploader').click()
        )
    }



}

import {importBibFileTemplate} from "./templates"
import {activateWait, deactivateWait, Dialog} from "../../common"
import {BibLatexImporter} from "./biblatex"
/** First step of the BibTeX file import. Creates a dialog box to specify upload file.
 */


export class BibLatexFileImportDialog {

    constructor(bibDB, addToListCall, staticUrl) {
        this.bibDB = bibDB
        this.addToListCall = addToListCall
        this.staticUrl = staticUrl
        this.tmpDB = false
    }

    init() {
        let buttons = [
            {
                text: gettext('Import'),
                classes: 'fw-dark submit-import',
                click: () => {
                    let bibFile = document.getElementById('bib-uploader').files
                    if (0 === bibFile.length) {
                        return false
                    }
                    bibFile = bibFile[0]
                    if (10485760 < bibFile.size) {
                        return false
                    }
                    activateWait()
                    let reader = new window.FileReader()
                    reader.onload = event => {
                        let importer = new BibLatexImporter(
                            event.target.result,
                            this.bibDB,
                            this.addToListCall,
                            () => deactivateWait(),
                            this.staticUrl
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
        dialog.open()
        document.getElementById('bib-uploader').addEventListener(
            'change',
            () => document.getElementById('import-bib-name').innerHTML =
                document.getElementById('bib-uploader').value.replace(/C:\\fakepath\\/i, '')
        )
        document.getElementById('import-bib-btn').addEventListener(
            'click',
            () => document.getElementById('bib-uploader').click()
        )
    }



}

import {BibLatexExporter} from "biblatex-csl-converter"
import {zipFileCreator} from "../../exporter/tools/zip"

export class BibLatexFileExporter {

    constructor(bibDB, pks) {
        this.pks = pks // A list of pk values of the bibliography items to be exported.
        this.bibDB = bibDB // The bibliography database to export from.
    }

    init() {
        let exporter = new BibLatexExporter(this.bibDB.db, this.pks)
        let exportObj = [{
                'filename': 'bibliography.bib',
                'contents': exporter.output
            }]
        zipFileCreator(exportObj, [], 'bibliography.zip')

    }

}

import {createSlug} from "../tools/file"
import {removeHidden, fixTables} from "../tools/doc-contents"
import {LatexExporterConvert} from "./convert"
import {ZipFileCreator} from "../tools/zip"
import {BibLatexExporter} from "biblatex-csl-converter"
import {readMe} from "./readme"
import download from "downloadjs"
/*
 Exporter to LaTeX
*/

export class LatexExporter {
    constructor(doc, bibDB, imageDB) {
        this.doc = doc
        this.bibDB = bibDB
        this.imageDB = imageDB
        this.docContents = false
        this.zipFileName = false
        this.textFiles = []
        this.httpFiles = []
        this.init()
    }

    init() {
        this.zipFileName = `${createSlug(this.doc.title)}.latex.zip`
        this.docContents = fixTables(removeHidden(this.doc.contents))
        this.converter = new LatexExporterConvert(this, this.imageDB, this.bibDB)
        this.conversion = this.converter.init(this.docContents)
        if (Object.keys(this.conversion.usedBibDB).length > 0) {
            let bibExport = new BibLatexExporter(this.conversion.usedBibDB)
            this.textFiles.push({filename: 'bibliography.bib', contents: bibExport.output})
        }
        this.textFiles.push({filename: 'document.tex', contents: this.conversion.latex})
        this.textFiles.push({filename: 'README.txt', contents: readMe})
        this.conversion.imageIds.forEach(
            id => {
                this.httpFiles.push({
                    filename: this.imageDB.db[id].image.split('/').pop(),
                    url: this.imageDB.db[id].image
                })
            }
        )

        let zipper = new ZipFileCreator(
            this.textFiles,
            this.httpFiles
        )

        zipper.init().then(
            blob => download(blob, this.zipFileName, 'application/zip')
        )
    }



}

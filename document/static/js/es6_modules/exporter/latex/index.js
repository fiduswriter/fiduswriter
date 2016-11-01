import {createSlug, getDatabasesIfNeeded} from "../tools/file"
import {removeHidden} from "../tools/doc-contents"
import {LatexExporterConvert} from "./convert"
import {zipFileCreator} from "../tools/zip"
/*
 Exporter to LaTeX
*/

export class LatexExporter {
    constructor(doc, bibDB, imageDB) {
        let that = this
        this.doc = doc
        this.bibDB = bibDB
        this.imageDB = imageDB
        this.docContents = false
        this.zipFileName = false
        this.textFiles = []
        this.httpFiles = []

        getDatabasesIfNeeded(this, doc).then(function(){
            that.init()
        })
    }

    init() {
        let that = this
        this.zipFileName = `${createSlug(this.doc.title)}.latex.zip`
        this.docContents = removeHidden(this.doc.contents)
        this.converter = new LatexExporterConvert(this, this.docContents, this.imageDB, this.bibDB)
        this.conversion = this.converter.init()
        this.textFiles.push({filename: 'document.tex', contents: this.conversion.latex})
        if (this.conversion.bibtex) {
            this.textFiles.push({filename: 'bibliography.bib', contents: this.conversion.bibtex})
        }
        Object.keys(this.conversion.usedImageDB).forEach(function(key){
            that.httpFiles.push({
                filename: that.conversion.usedImageDB[key].image.split('/').pop(),
                url: that.conversion.usedImageDB[key].image
            })
        })

        zipFileCreator(this.textFiles, this.httpFiles, this.zipFileName)
    }



}

import {createSlug, getDatabasesIfNeeded} from "../tools/file"
import {removeHidden} from "../tools/doc-contents"
import {LatexExporterConvert} from "./convert"
import {ZipFileCreator} from "../tools/zip"
import {BibLatexExporter} from "biblatex-csl-converter"
import {PDFFileCreator} from "../tools/pdftex"
import download from "downloadjs"
/*
 Exporter to LaTeX
*/

export class LatexExporter {
    constructor(doc, bibDB, imageDB, styleDB, compiled) {
        this.doc = doc
        this.bibDB = bibDB
        this.imageDB = imageDB
        this.docContents = false
        this.zipFileName = false
        this.textFiles = []
        this.httpFiles = []
        this.compiled = compiled
        if(styleDB.latexcls && styleDB.latexcls != 'Undefined'){
            this.docClass=styleDB.latexcls
        }
        
        getDatabasesIfNeeded(this, doc).then(
            () => {
            if(compiled)
            {this.init2()}
            else{this.init()}
            }
        )
    }

    init() {
        this.zipFileName = `${createSlug(this.doc.title)}.latex.zip`
        this.docContents = removeHidden(this.doc.contents)
        this.converter = new LatexExporterConvert(this, this.imageDB, this.bibDB,this.compiled, this.docClass)
        this.conversion = this.converter.init(this.docContents)
        if (Object.keys(this.conversion.usedBibDB).length > 0) {
            let bibExport = new BibLatexExporter(this.conversion.usedBibDB)
            this.textFiles.push({filename: 'bibliography.bib', contents: bibExport.output})
        }
        this.textFiles.push({filename: 'document.tex', contents: this.conversion.latex})
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

    init2() {

        let that = this
        this.PDFFileName =  this.doc.title
        let docCls = undefined
        this.docContents = removeHidden(this.doc.contents)
        if(this.docClass){
          docCls='/class/'+this.docClass.split('/')[4].split('.')[0]
        }
        this.converter = new LatexExporterConvert(this, this.imageDB, this.bibDB, this.compiled, docCls)
        this.conversion = this.converter.init(this.docContents)
        if (Object.keys(this.conversion.usedBibDB).length > 0) {
            let bibExport = new BibLatexExporter(this.conversion.usedBibDB)
            this.textFiles.push({filename: 'bibliography.bib', contents: bibExport.output})
        }
        this.textFiles.push({filename: 'document.tex', contents: this.conversion.latex})
        this.conversion.imageIds.forEach(
            id => {
                this.httpFiles.push({
                    filename: this.imageDB.db[id].image.split('/').pop(),
                    url: this.imageDB.db[id].image
                })
            }
        )

        PDFFileCreator(this.conversion.latex, this.textFiles, this.httpFiles, this.docClass, createSlug(this.PDFFileName))
    }


}

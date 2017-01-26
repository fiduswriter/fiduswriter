import {createSlug, getDatabasesIfNeeded} from "../tools/file"
import {removeHidden} from "../tools/doc-contents"
import {LatexExporterConvert} from "./convert"
import {zipFileCreator} from "../tools/zip"
import {BibLatexExporter} from "biblatex-csl-converter"
import {PDFFileCreator} from "../tools/pdftex"
/*
 Exporter to LaTeX
*/

export class LatexExporter {
    constructor(doc, bibDB, imageDB, styleDB, compiled) {
        let that = this
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
        getDatabasesIfNeeded(this, doc).then(function(){
            if(compiled){
                that.init2()
            }else{
                that.init()
            }
        })
    }

    init() {
        let that = this
        this.zipFileName = `${createSlug(this.doc.title)}.latex.zip`
        this.docContents = removeHidden(this.doc.contents)
        this.converter = new LatexExporterConvert(this, this.imageDB, this.bibDB,this.compiled, this.docClass)
        this.conversion = this.converter.init(this.docContents)
        if (this.conversion.bibIds.length > 0) {
            let bibExport = new BibLatexExporter(this.conversion.bibIds, this.bibDB.db, false)
            this.textFiles.push({filename: 'bibliography.bib', contents: bibExport.bibtexStr})
        }
        this.textFiles.push({filename: 'document.tex', contents: this.conversion.latex})
        this.conversion.imageIds.forEach(function(id){
            that.httpFiles.push({
                filename: that.imageDB.db[id].image.split('/').pop(),
                url: that.imageDB.db[id].image
            })
        })

        zipFileCreator(this.textFiles, this.httpFiles, this.zipFileName)
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
        if (this.conversion.bibIds.length > 0) {
            let bibExport = new BibLatexExporter(this.conversion.bibIds, this.bibDB.db, false)
            this.textFiles.push({filename: 'bibliography.bib', contents: bibExport.bibtexStr})
        }

        this.conversion.imageIds.forEach(function(id){
            that.httpFiles.push({
                filename: that.imageDB.db[id].image.split('/').pop(),
                url: that.imageDB.db[id].image
            })
        })

        PDFFileCreator(this.conversion.latex, this.textFiles, this.httpFiles, this.docClass, createSlug(this.PDFFileName))
    }


}

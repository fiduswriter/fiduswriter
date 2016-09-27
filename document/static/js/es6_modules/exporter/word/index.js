import {modelToEditor} from "../../editor/node-convert"
import {downloadFile} from "../download"
import {createSlug, getDatabasesIfNeeded} from "../tools"
import JSZip from "jszip"
import JSZipUtils from "jszip-utils"

import {WordExporterCitations} from "./citations"
import {WordExporterImages} from "./images"
import {WordExporterRender} from "./render"
import {WordExporterRichtext} from "./richtext"
import {WordExporterXml} from "./xml"
import {WordExporterRels} from "./rels"
import {WordExporterFootnotes} from "./footnotes"

/*
Exporter to Microsoft Word.

This exporter is *very* experimental. Do not count on using it unless you
have the time to fix it.

TODO:
* footnotes
* equations (inline and figure)
*/


export class WordExporter {
    constructor(doc, bibDB, imageDB) {
        let that = this
        this.doc = doc
        // We use the doc in the pm format as this is what we will be using
        // throughout the application in the future.
        this.pmDoc = modelToEditor(this.doc)
        this.template = false
        this.zip = false
        this.extraFiles = {}
        this.maxRelId = {}
        this.docTitle = this.pmDoc.child(0).textContent
        this.footnotes = new WordExporterFootnotes(this)
        this.render = new WordExporterRender(this)
        this.richtext = new WordExporterRichtext(this)
        this.xml = new WordExporterXml(this)

        this.rels = {
            'document': new WordExporterRels(this, 'document')
        }
        let db = {bibDB,imageDB}
        getDatabasesIfNeeded(db, doc, function() {
            that.images = new WordExporterImages(that, db.imageDB, that.rels['document'], that.pmDoc)
            that.citations = new WordExporterCitations(that, db.bibDB)
            that.exporter()
        })
    }

    getTemplate() {
        let that = this
        return new window.Promise((resolve) => {
            JSZipUtils.getBinaryContent(
                staticUrl + 'docx/template.docx',
                function(err, template){
                    that.template = template
                    resolve()
                }
            )
        })
    }

    exporter() {
        let that = this
        this.citations.formatCitations()
        that.zip = new JSZip()


        this.getTemplate().then(() => {
                return that.zip.loadAsync(that.template)
            }).then(() => {
                return that.render.init()
            }).then(() => {
                return that.rels['document'].init()
            }).then(() => {
                return that.images.init()
            }).then(() => {
                return that.footnotes.init()
            }).then(() => {
                that.render.getTagData()
                that.render.render()
                that.prepareAndDownload()
            })


    }


    prepareAndDownload() {
        let that = this

        this.xml.allToZip()

        for (let fileName in this.extraFiles) {
            this.zip.file(fileName, this.extraFiles[fileName])
        }
        this.zip.generateAsync({type:"blob"}).then(function(out){
            downloadFile(createSlug(that.docTitle)+'.docx', out)
        })
    }


}

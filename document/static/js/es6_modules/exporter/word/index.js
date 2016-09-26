import {modelToEditor} from "../../editor/node-convert"
import {downloadFile} from "../download"
import {createSlug, getDatabasesIfNeeded} from "../tools"
import JSZip from "jszip"
import JSZipUtils from "jszip-utils"

import {escapeText} from "./tools"
import {WordExporterCitations} from "./citations"
import {WordExporterImages} from "./images"
import {WordExporterRender} from "./render"
import {WordExporterRichtext} from "./richtext"
import {WordExporterXml} from "./xml"

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

        this.render = new WordExporterRender(this)
        this.richtext = new WordExporterRichtext(this)
        this.xml = new WordExporterXml(this)
        let db = {
            bibDB
            imageDB
        }
        getDatabasesIfNeeded(db, doc, function() {
            that.images = new WordExporterImages(that, db.imageDB)
            that.citations = new WordExporterCitations(that, db.bibDB)
            that.exporter()
        })
    }

    getTemplate(callback) {
        let that = this
        JSZipUtils.getBinaryContent(
            staticUrl + 'docx/template.docx',
            function(err, template){
                that.template = template
                callback()
            }
        )
    }

    exporter() {
        let that = this
        this.citations.formatCitations()

        this.getTemplate(function(){
            that.zip = new JSZip()
            that.zip.loadAsync(that.template).then(function(){
                let p = []
                p.push(that.xml.fromZip("word/document.xml"))
                p.push(that.xml.fromZip("word/_rels/document.xml.rels"))
                p.push(that.xml.fromZip("[Content_Types].xml"))
                window.Promise.all(p).then(function(){

                    that.findMaxRelId("word/_rels/document.xml.rels")
                    that.images.exportImages(function(){
                        that.render.getTagData()
                        that.render.render()
                        that.prepareAndDownload()
                    })
                })
            })

        })
    }

    // Go through a rels xml file and file all the listed relations
    findMaxRelId(filePath) {
        let xml = this.xml.docs[filePath]
        let rels = [].slice.call(xml.querySelectorAll('Relationship'))
        let maxId = 0

        rels.forEach(function(rel){
            let id = parseInt(rel.getAttribute("Id").replace(/\D/g,''))
            if (id > maxId) {
                maxId = id
            }
        })
        this.maxRelId[filePath] = maxId
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

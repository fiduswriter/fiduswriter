import {modelToEditor} from "../../editor/node-convert"
import {downloadFile} from "../download"
import {createSlug, getDatabasesIfNeeded} from "../tools"
import JSZip from "jszip"
import JSZipUtils from "jszip-utils"

import {DocxExporterCitations} from "./citations"
import {DocxExporterImages} from "./images"
import {DocxExporterRender} from "./render"
import {DocxExporterRichtext} from "./richtext"
import {DocxExporterXml} from "./xml"
import {DocxExporterRels} from "./rels"
import {DocxExporterFootnotes} from "./footnotes"
import {DocxExporterMetadata} from "./metadata"
import {textContent} from "./tools"
/*
Exporter to Microsoft Word.

This exporter is experimental.

TODO:
* equations (inline and figure)
*/

export class DocxExporter {
    constructor(doc, bibDB, imageDB) {
        let that = this
        this.doc = doc
        // We use the doc in the pm format as this is what we will be using
        // throughout the application in the future.
        this.pmJSON = this.createPmJSON(this.doc)
        this.template = false
        this.zip = false
        this.extraFiles = {}
        this.maxRelId = {}
        this.pmBib = false
        this.docTitle = textContent(this.pmJSON.content[0])
        this.metadata = new DocxExporterMetadata(this, this.pmJSON)
        this.footnotes = new DocxExporterFootnotes(this, this.pmJSON)
        this.render = new DocxExporterRender(this, this.pmJSON)

        this.xml = new DocxExporterXml(this)

        this.rels = new DocxExporterRels(this, 'document')
        getDatabasesIfNeeded(this, doc, function() {
            that.images = new DocxExporterImages(that, that.imageDB, that.rels, that.pmJSON)
            that.citations = new DocxExporterCitations(that, that.bibDB, that.pmJSON)
            that.richtext = new DocxExporterRichtext(
                that,
                that.rels,
                that.citations,
                that.images
            )
            that.createFile()
        })
    }

    createPmJSON(doc) {
        let pmJSON = modelToEditor(doc).toJSON()
        // We remove those parts of the doc that are't enabled in the settings
        if (!doc.settings['metadata-subtitle']) {
            delete pmJSON.content[1].content
        }
        if (!doc.settings['metadata-authors']) {
            delete pmJSON.content[2].content
        }
        if (!doc.settings['metadata-abstract']) {
            delete pmJSON.content[3].content
        }
        if (!doc.settings['metadata-keywords']) {
            delete pmJSON.content[4].content
        }
        return pmJSON
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

    createFile() {
        let that = this
        this.citations.formatCitations()
        this.pmBib = this.citations.pmBib
        this.zip = new JSZip()

        this.getTemplate().then(() => {
                return that.zip.loadAsync(that.template)
            }).then(() => {
                return that.metadata.init()
            }).then(() => {
                return that.render.init()
            }).then(() => {
                return that.rels.init()
            }).then(() => {
                return that.images.init()
            }).then(() => {
                return that.footnotes.init()
            }).then(() => {
                that.render.getTagData(that.pmBib)
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

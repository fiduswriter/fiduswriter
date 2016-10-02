import {modelToEditor} from "../../editor/node-convert"
import {downloadFile} from "../download"
import {createSlug, getDatabasesIfNeeded} from "../tools"
import JSZip from "jszip"
import JSZipUtils from "jszip-utils"

import {OdtExporterCitations} from "./citations"
import {OdtExporterImages} from "./images"
import {OdtExporterRender} from "./render"
import {OdtExporterRichtext} from "./richtext"
import {OdtExporterXml} from "./xml"
import {OdtExporterFootnotes} from "./footnotes"
import {OdtExporterMetadata} from "./metadata"
import {textContent} from "./tools"
import {OdtExporterStyles} from "./styles"
/*
Exporter to Open Document Text (LibreOffice)

This exporter is experimental.

TODO:
* equations (inline and figure)
*/

export class OdtExporter {
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
        this.metadata = new OdtExporterMetadata(this, this.pmJSON)
        this.footnotes = new OdtExporterFootnotes(this, this.pmJSON)
        this.render = new OdtExporterRender(this, this.pmJSON)
        this.styles = new OdtExporterStyles(this)
        this.xml = new OdtExporterXml(this)

        getDatabasesIfNeeded(this, doc, function() {
            that.images = new OdtExporterImages(that, that.imageDB, that.pmJSON)
            that.citations = new OdtExporterCitations(that, that.bibDB, that.pmJSON)
            that.richtext = new OdtExporterRichtext(
                that,
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
                staticUrl + 'odt/template.odt',
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
                return that.styles.init()
            }).then(() => {
                return that.render.init()
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
            downloadFile(createSlug(that.docTitle)+'.odt', out)
        })
    }

}

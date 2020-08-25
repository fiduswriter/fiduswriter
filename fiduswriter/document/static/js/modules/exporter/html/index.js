import download from "downloadjs"
import pretty from "pretty"

import {createSlug} from "../tools/file"
import {modifyImages} from "../tools/html"
import {ZipFileCreator} from "../tools/zip"
import {removeHidden} from "../tools/doc_content"
import {htmlExportTemplate} from "../html/templates"
import {addAlert} from "../../common"
import {DOMExporter} from "../tools/dom_export"

export class HTMLExporter extends DOMExporter {
    constructor(schema, csl, documentStyles, doc, bibDB, imageDB, updated) {
        super(schema, csl, documentStyles)
        this.doc = doc
        this.bibDB = bibDB
        this.imageDB = imageDB
        this.updated = updated

        this.outputList = []
        this.includeZips = []
    }

    init() {
        addAlert('info', `${this.doc.title}: ${gettext('HTML export has been initiated.')}`)
        this.docContent = removeHidden(this.doc.content, false)

        this.addDocStyle(this.doc)

        return this.loadStyles().then(
            () => this.joinDocumentParts()
        ).then(
            () => this.fillToc()
        ).then(
            () => this.postProcess()
        ).then(
            ({title, html, math}) => this.save({title, html, math})
        )

    }

    prepareBinaryFiles() {
        this.binaryFiles = this.binaryFiles.concat(modifyImages(this.content)).concat(this.fontFiles)
    }

    postProcess() {

        const title = this.doc.title

        const math = this.content.querySelectorAll('.equation, .figure-equation').length ? true : false

        if (math) {
            this.addMathliveStylesheet()
        }

        this.prepareBinaryFiles()

        const html = htmlExportTemplate({
            contents: this.content,
            settings: this.doc.settings,
            styleSheets: this.styleSheets,
            title
        })

        return {html, title, math}
    }

    save({html, math}) {
        this.outputList.push({
            filename: 'document.html',
            contents: pretty(this.replaceImgSrc(html), {ocd: true})
        })

        this.styleSheets.forEach(styleSheet => {
            if (styleSheet.filename) {
                this.outputList.push(styleSheet)
            }
        })

        if (math) {
            this.includeZips.push({
                'directory': 'css',
                'url': `${settings_STATIC_URL}zip/mathlive_style.zip?v=${transpile_VERSION}`,
            })
        }

        return this.createZip()
    }

    addMathliveStylesheet() {
        this.styleSheets.push({filename: `css/mathlive.css`})
    }

    createZip() {
        const zipper = new ZipFileCreator(
            this.outputList,
            this.binaryFiles,
            this.includeZips,
            undefined,
            this.updated
        )

        return zipper.init().then(
            blob => this.download(blob)
        )
    }

    download(blob) {
        return download(blob, createSlug(this.doc.title) + '.html.zip', 'application/zip')
    }

}

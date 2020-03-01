import download from "downloadjs"
import pretty from "pretty"

import {createSlug} from "../tools/file"
import {modifyImages} from "../tools/html"
import {ZipFileCreator} from "../tools/zip"
import {removeHidden} from "../tools/doc_contents"
import {htmlExportTemplate} from "../html/templates"
import {addAlert} from "../../common"
import {DOMExporter} from "../tools/dom_export"

export class HTMLExporter extends DOMExporter {
    constructor(schema, csl, documentStyles, doc, bibDB, imageDB) {
        super(schema, csl, documentStyles)
        this.doc = doc
        this.bibDB = bibDB
        this.imageDB = imageDB
    }

    init() {
        addAlert('info', `${this.doc.title}: ${gettext('HTML export has been initiated.')}`)
        this.docContents = removeHidden(this.doc.contents, false)

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
        this.binaryFiles = this.binaryFiles.concat(modifyImages(this.contents)).concat(this.fontFiles)
    }

    postProcess() {

        const title = this.doc.title

        const math = this.contents.querySelectorAll('.equation, .figure-equation').length ? true : false

        if (math) {
            this.styleSheets.push({url: `${settings.STATIC_URLl}css/libs/mathlive/mathlive.css?v=${transpile.VERSION}`})
        }

        this.prepareBinaryFiles()

        const html = htmlExportTemplate({
            contents: this.contents,
            part: false,
            settings: this.doc.settings,
            styleSheets: this.styleSheets,
            title
        })

        return {title, html, math}
    }

    save({title, html, math}) {
        const textFiles = [{
            filename: 'document.html',
            contents: pretty(this.replaceImgSrc(html), {ocd: true})
        }]

        this.styleSheets.forEach(styleSheet => {
            if (styleSheet.filename) {
                textFiles.push(styleSheet)
            }
        })

        const includeZips = []

        if (math) {
            includeZips.push({
                'directory': '',
                'url': `${settings.STATIC_URL}zip/mathlive_style.zip?v=${transpile.VERSION}`,
            })
        }

        const zipper = new ZipFileCreator(
            textFiles,
            this.binaryFiles,
            includeZips
        )

        zipper.init().then(
            blob => download(blob, createSlug(title) + '.html.zip', 'application/zip')
        )
    }

}

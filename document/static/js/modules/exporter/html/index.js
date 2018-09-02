import download from "downloadjs"
import pretty from "pretty"

import {createSlug} from "../tools/file"
import {findImages} from "../tools/html"
import {ZipFileCreator} from "../tools/zip"
import {htmlExportTemplate} from "../html/templates"
import {addAlert} from "../../common"
import katex from "katex"
import {BaseHTMLExporter} from "../html/base"

export class HTMLExporter extends BaseHTMLExporter{
    constructor(doc, bibDB, imageDB, citationStyles, citationLocales) {
        super()
        this.doc = doc
        this.citationStyles = citationStyles
        this.citationLocales = citationLocales
        this.bibDB = bibDB
        this.imageDB = imageDB
    }

    init() {
        addAlert('info', `${this.doc.title}: ${gettext('HTML export has been initiated.')}`)

        return this.joinDocumentParts().then(
            () => this.postProcess()
        ).then(
            ({title, html, math, styleSheets, binaryFiles}) => this.save({title, html, math, styleSheets, binaryFiles})
        )

    }

    postProcess() {

        const styleSheets = []

        const title = this.doc.title

        const math = contents.querySelectorAll('.equation, .figure-equation').length ? true : false

        if (math) {
            styleSheets.push({filename: 'katex.min.css'})
        }

        this.addFigureNumbers(this.contents)

        const html = htmlExportTemplate({
            part: false,
            title,
            settings: this.doc.settings,
            styleSheets,
            contents: this.contents
        })

        const binaryFiles = findImages(this.contents)

        return {title, html, math, styleSheets, binaryFiles}
    }

    save({title, html, math, styleSheets, binaryFiles}) {

        const textFiles = [{
            filename: 'document.html',
            contents: pretty(this.replaceImgSrc(html), {ocd: true})
        }]

        styleSheets.forEach(styleSheet => {
            if (styleSheet.contents && styleSheet.filename) {
                textFiles.push(styleSheet)
            }
        })

        const includeZips = []

        if (math) {
            includeZips.push({
                'directory': '',
                'url': `${$StaticUrls.base$}zip/katex_style.zip?v=${$StaticUrls.transpile.version$}`,
            })
        }

        const zipper = new ZipFileCreator(
            textFiles,
            binaryFiles,
            includeZips
        )

        zipper.init().then(
            blob => download(blob, createSlug(title) + '.html.zip', 'application/zip')
        )
    }

}

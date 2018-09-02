import download from "downloadjs"
import pretty from "pretty"
import katex from "katex"

import {createSlug} from "../tools/file"
import {modifyImages} from "../tools/html"
import {ZipFileCreator} from "../tools/zip"
import {htmlExportTemplate} from "../html/templates"
import {addAlert} from "../../common"
import {BaseHTMLExporter} from "../html/base"

export class HTMLExporter extends BaseHTMLExporter{
    constructor(doc, bibDB, imageDB, citationStyles, citationLocales, documentStyles) {
        super()
        this.doc = doc
        this.citationStyles = citationStyles
        this.citationLocales = citationLocales
        this.documentStyles = documentStyles
        this.bibDB = bibDB
        this.imageDB = imageDB
        this.styleSheets = []
        this.removeUrlPrefix = true
    }

    init() {
        addAlert('info', `${this.doc.title}: ${gettext('HTML export has been initiated.')}`)

        let docStyle
        return this.addStyle().then(
            style => docStyle = style
        ).then(
            () => this.joinDocumentParts()
        ).then(
            () => this.postProcess()
        ).then(
            ({title, html, math, imageFiles}) => this.save({title, html, math, imageFiles, docStyle})
        )

    }

    addStyle() {
        const docStyle = this.documentStyles.find(docStyle => docStyle.filename===this.doc.settings.documentstyle)

        const docStyleCSS = `
        ${docStyle.fonts.map(font => {
            return `@font-face {${
                font[1].replace('[URL]', this.removeUrlPrefix ? font[0].split('/').pop() : font[0])
            }}`
        }).join('\n')}

        ${docStyle.contents}
        `
        this.styleSheets.push({contents: docStyleCSS})

        return Promise.resolve(docStyle)
    }

    postProcess() {

        const title = this.doc.title

        const math = this.contents.querySelectorAll('.equation, .figure-equation').length ? true : false

        if (math) {
            this.styleSheets.push({filename: `${$StaticUrls.base$}css/libs/katex/katex.min.css`})
        }

        this.addFigureNumbers(this.contents)

        const imageFiles = this.removeUrlPrefix ? modifyImages(this.contents) : []

        const html = htmlExportTemplate({
            part: false,
            title,
            settings: this.doc.settings,
            styleSheets: this.styleSheets,
            contents: this.contents,
            removeUrlPrefix: this.removeUrlPrefix
        })

        return {title, html, math, imageFiles}
    }


    // The save function is specific to HTMl saving and therefore assumes that this.removeUrlPrefix === true
    save({title, html, math, imageFiles, docStyle}) {

        const fontFiles = docStyle.fonts.map(font => ({
            filename: font[0].split('/').pop(),
            url: font[0]
        }))

        const binaryFiles = fontFiles.concat(imageFiles)

        const textFiles = [{
            filename: 'document.html',
            contents: pretty(this.replaceImgSrc(html), {ocd: true})
        }]

        this.styleSheets.forEach(styleSheet => {
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

import {createSlug} from "../tools/file"
import {findImages} from "../tools/html"
import {ZipFileCreator} from "../tools/zip"
import {htmlExportTemplate} from "./templates"
import {addAlert} from "../../common"
import {katexRender} from "../../katex"
import {BaseHTMLRDFaExporter} from "./base"
import download from "downloadjs"

export class HTMLRDFaExporter extends BaseHTMLRDFaExporter {
    constructor(doc, bibDB, imageDB, citationStyles, citationLocales) {
        super()
        this.doc = doc
        this.citationStyles = citationStyles
        this.citationLocales = citationLocales
        this.bibDB = bibDB
        this.imageDB = imageDB
        this.exportOne()
    }

    exportOne() {
        addAlert('info', this.doc.title + ': ' + gettext(
            'HTML export has been initiated.'))

        this.joinDocumentParts().then(() => this.exportTwo())

    }

    exportTwo() {

        let styleSheets = [],
            math = false

        let title = this.doc.title

        let contents = this.contents
        console.log(contents)

        let equations = contents.querySelectorAll('.equation')

        let figureEquations = contents.querySelectorAll('.figure-equation')

        if (equations.length > 0 || figureEquations.length > 0) {
            math = true
            styleSheets.push({
                filename: 'katex.min.css'
            })
        }

        for (let i = 0; i < equations.length; i++) {
            let node = equations[i]
            let formula = node.getAttribute('data-equation')
            katexRender(formula, node, {
                throwOnError: false
            })
        }
        for (let i = 0; i < figureEquations.length; i++) {
            let node = figureEquations[i]
            let formula = node.getAttribute('data-equation')
            katexRender(formula, node, {
                displayMode: true,
                throwOnError: false
            })
        }

        let includeZips = []

        let httpOutputList = findImages(contents)

        contents = this.addFigureNumbers(contents)

        contents = this.converTitleToRDFa(contents)

        contents = this.convertAbstractToRDF(contents)

        contents = this.converAuthorsToRDFa(contents)

        contents = this.addSectionsTag(contents)

        let contentsCode = this.replaceImgSrc(contents.innerHTML)

        let htmlCode = htmlExportTemplate({
            part: false,
            title,
            metadata: this.doc.metadata,
            settings: this.doc.settings,
            styleSheets,
            contents: contentsCode
        })

        let outputList = [{
            filename: 'document.html',
            contents: htmlCode
        }]

        for (let i = 0; i < styleSheets.length; i++) {
            let styleSheet = styleSheets[i]
            if (styleSheet.contents) {
                outputList.push(styleSheet)
            }
        }

        if (math) {
            includeZips.push({
                'directory': '',
                'url': window.staticUrl + 'zip/katex-style.zip',
            })
        }

        let zipper = new ZipFileCreator(
            outputList,
            httpOutputList,
            includeZips
        )

        zipper.init().then(
            blob => download(blob, createSlug(title) + '.html.zip',
                'application/zip')
        )
    }

}

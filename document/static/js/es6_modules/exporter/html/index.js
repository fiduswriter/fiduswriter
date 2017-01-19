import {createSlug} from "../tools/file"
import {findImages} from "../tools/html"
import {zipFileCreator} from "../tools/zip"
import {htmlExportTemplate} from "./templates"
import {BibliographyDB} from "../../bibliography/database"
import {addAlert} from "../../common"
import {katexRender} from "../../katex"
import {BaseHTMLExporter} from "./base"

export class HTMLExporter extends BaseHTMLExporter{
    constructor(doc, bibDB) {
        super()
        this.doc = doc
        if (bibDB) {
            this.bibDB = bibDB // the bibliography has already been loaded for some other purpose. We reuse it.
            this.exportOne()
        } else {
            this.bibDB = new BibliographyDB(doc.owner.id, false, false, false)
            this.bibDB.getDB().then(() => this.exportOne())
        }
    }

    exportOne() {
        addAlert('info', this.doc.title + ': ' + gettext(
            'HTML export has been initiated.'))

        this.joinDocumentParts().then(() => this.exportTwo())

    }

    exportTwo() {

        let styleSheets = [], math = false

        let title = this.doc.title

        let contents = this.contents

        let equations = contents.querySelectorAll('.equation')

        let figureEquations = contents.querySelectorAll('.figure-equation')

        if (equations.length > 0 || figureEquations.length > 0) {
            math = true
            styleSheets.push({filename: 'katex.min.css'})
        }

        for (let i = 0; i < equations.length; i++) {
            let node = equations[i]
            let formula = node.getAttribute('data-equation')
            katexRender(formula, node, {throwOnError: false})
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
        zipFileCreator(outputList, httpOutputList, createSlug(
                title) +
            '.html.zip', false, includeZips)
    }

}

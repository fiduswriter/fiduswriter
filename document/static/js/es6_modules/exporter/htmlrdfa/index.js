import {createSlug} from "../tools/file"
import {findImages} from "../tools/html"
import {ZipFileCreator} from "../tools/zip"
import {htmlExportTemplate} from "./templates"
import {BibliographyDB} from "../../bibliography/database"
import {addAlert} from "../../common"
import {katexRender} from "../../katex"
import {BaseHTMLExporter} from "./base"
import download from "downloadjs"

export class HTMLRDFaExporter extends BaseHTMLExporter{
    constructor(doc, bibDB, citationStyles, citationLocales) {
        super()
        this.doc = doc
        this.citationStyles = citationStyles
        this.citationLocales = citationLocales
        if (bibDB) {
            this.bibDB = bibDB // the bibliography has already been loaded for some other purpose. We reuse it.
            this.exportOne()
        } else {
            this.bibDB = new BibliographyDB(doc.owner.id)
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

	//contents = this.addArticleRDFa(contents)  parts related to body tag is added in template.js but I keep it for later use in other tags.

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
            blob => download(blob, createSlug(title) + '.html.zip', 'application/zip')
        )
    }

}

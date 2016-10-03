import {obj2Node} from "../tools/json"
import {createSlug} from "../tools/file"
import {findImages} from "../tools/html"
import {zipFileCreator} from "../tools/zip"
import {BibLatexExporter} from "../../bibliography/exporter/biblatex"
import {BibliographyDB} from "../../bibliography/database"
import {addAlert} from "../../common/common"
import {BaseLatexExporter} from "./base"


export class LatexExporter extends BaseLatexExporter {
    constructor(doc, bibDB) {
        super()
        let that = this
        this.doc = doc
        if (bibDB) {
            this.bibDB = bibDB // the bibliography has already been loaded for some other purpose. We reuse it.
            this.exportOne()
        } else {
            this.bibDB = new BibliographyDB(doc.owner.id, false, false, false)
            this.bibDB.getDB(function() {
                that.exportOne()
            })
        }
    }


    exportOne() {
        let title = this.doc.title

        addAlert('info', title + ': ' + gettext(
            'Latex export has been initiated.'))

        let contents = document.createElement('div')

        let tempNode = obj2Node(this.doc.contents)

        while (tempNode.firstChild) {
            contents.appendChild(tempNode.firstChild)
        }

        let httpOutputList = findImages(contents)

        let latexCode = this.htmlToLatex(title, this.doc.owner.name, contents,
            this.doc.settings, this.doc.metadata)

        let outputList = [{
            filename: 'document.tex',
            contents: latexCode.latex
        }]

        if (latexCode.bibtex.length > 0) {
            outputList.push({
                filename: 'bibliography.bib',
                contents: latexCode.bibtex
            })
        }

        zipFileCreator(outputList, httpOutputList, createSlug(
                title) +
            '.latex.zip')
    }
}

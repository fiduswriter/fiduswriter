import fixUTF8 from "fix-utf8"
import {BibLatexParser} from "biblatex-csl-converter"


export class TextPaste {
    constructor(editor, inText, pmType) {
        this.editor = editor
        this.inText = inText
        this.pmType = pmType
    }


    getOutput() {
        // Chrome on Linux has an encoding problem:
        // it recognizes UTF as Windows 1252. Bug has been filed. This is a temp
        // solution for western European languages.
        // https://bugs.chromium.org/p/chromium/issues/detail?id=760613
        this.text = fixUTF8(this.inText)
        this.getBibtex()
        return this.text
    }

    getBibtex() {
        let bibData = new BibLatexParser(this.text)
        let tmpDB = bibData.output
        if (!Object.keys(tmpDB).length) {
            // No entries have been found. skip
            return
        }
        // Reset insertion text
        this.text = ''

        // Add missing data to entries.
        Object.values(tmpDB).forEach(bibEntry => {
            // We add an empty category list for all newly imported bib entries.
            bibEntry.entry_cat = []
            // If the entry has no title, add an empty title
            if (!bibEntry.fields.title) {
                bibEntry.fields.title = []
            }
            // If the entry has no date, add an uncertain date
            if (!bibEntry.fields.date) {
                bibEntry.fields.date = 'uuuu'
            }
            // If the entry has no editor or author, add empty author
            if (!bibEntry.fields.author && !bibEntry.fields.editor) {
                bibEntry.fields.author = [{'literal': []}]
            }
        })

        this.editor.mod.db.bibDB.saveBibEntries(tmpDB, true).then(idTranslations => {
            let format = 'autocite',
            references = idTranslations.map(trans => ({id: trans[1]}))

            let citationNode = this.editor.currentView.state.schema.nodes['citation'].create(
                {format, references}
            )
            let transaction = this.editor.currentView.state.tr.replaceSelectionWith(
                citationNode, true
            )
            this.editor.currentView.dispatch(transaction)
        })

    }


}

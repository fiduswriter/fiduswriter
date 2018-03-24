import fixUTF8 from "fix-utf8"

import {__parseFromClipboard} from "prosemirror-view"

import {BibLatexImporter} from "../../bibliography/import"


export class TextPaste {
    constructor(editor, inText, view) {
        this.editor = editor
        this.inText = inText
        // Chrome on Linux has an encoding problem:
        // it recognizes UTF as Windows 1252. Bug has been filed. This is a temp
        // solution for western European languages.
        // https://bugs.chromium.org/p/chromium/issues/detail?id=760613
        this.text = fixUTF8(this.inText)
        this.view = view
        this.foundBibEntries = false
    }

    init() {

        let importer = new BibLatexImporter(
            this.text,
            this.editor.mod.db.bibDB,
            false, // no csrf token so that it does not try to write directly to the database
            newIds => {
                this.foundBibEntries = true
                let format = 'autocite',
                    references = newIds.map(id => ({id}))

                let citationNode = this.editor.currentView.state.schema.nodes['citation'].create(
                    {format, references}
                )
                let tr = this.editor.currentView.state.tr.replaceSelectionWith(
                    citationNode, true
                )
                this.view.dispatch(tr)
            },
            () => {
                if (!this.foundBibEntries) {
                    // There were no citations in the pasted text.
                    this.insertText()
                }
            },
            false // no messages to end user. Would be confusing if user just wants to paste unrelated text.
        )
        importer.init()
    }

    sliceSingleNode(slice) {
        return slice.openStart == 0 && slice.openEnd == 0 && slice.content.childCount == 1 ? slice.content.firstChild : null
    }

    insertText() {
        // Inserts text as if it was pasted. We do that by converting it to html and inserting it that way.
        // Adapted from prosemirror-view/src/input.js
        let dom = document.createElement("div")
        this.text.trim().split(/(?:\r\n?|\n)+/).forEach(block => {
            dom.appendChild(document.createElement("p")).textContent = block
        })
        let html = dom.innerHTML

        let slice = __parseFromClipboard(this.view, '', html, this.view.shiftKey, this.view.state.selection.$from)

        if (!slice) {
            return
        }

        let singleNode = this.sliceSingleNode(slice)
        let tr = singleNode ? this.view.state.tr.replaceSelectionWith(singleNode, this.view.shiftKey) : this.view.state.tr.replaceSelection(slice)
        this.view.dispatch(tr.scrollIntoView().setMeta("paste", true).setMeta("uiEvent", "paste"))
    }

}

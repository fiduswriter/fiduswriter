import {wordCounterDialogTemplate} from "./templates"
import {Dialog} from "../../../common"

export class WordCountDialog {
    constructor(editor) {
        this.editor = editor
    }

    init() {
        const dialog = new Dialog({
            title: gettext('Word counter'),
            body: wordCounterDialogTemplate(this.countWords()),
            buttons: [{type: 'close'}],
            canEscape: true
        })
        dialog.open()
    }

    getNonDeletedTextContent(topNode) {
        let text = ''
        topNode.descendants((node) => {
            if (node.marks.find(mark => mark.type.name === 'deletion')) {
                return
            } else if (node.isBlock) {
                text += '\n'
            } else if (node.isText) {
                text += node.text
            }
        })
        return text.replace(/(^\s*)|(\s*$)/gi, "").replace(/[ ]{2,}/gi, " ").replace(/\n /, "\n").replace(/\n{2,}/gi, "\n")
    }

    countWords() {
        const textContent = this.getNonDeletedTextContent(this.editor.view.state.doc),
            footnoteContent = this.getNonDeletedTextContent(this.editor.mod.footnotes.fnEditor.view.state.doc),
            bibliographyContent = document.querySelector('.article-bibliography').textContent
        const docContent = textContent + ' ' + footnoteContent + ' ' + bibliographyContent
        const docNumChars = docContent.split('\n').join('').length - 2 // Subtract two for added spaces
        const docWords = docContent.split(/[\n ]+/)

        const docNumNoSpace = docWords.join('').length
        const docNumWords = docNumNoSpace ? docWords.length : 0

        const selectionContent = this.getNonDeletedTextContent(
            this.editor.currentView.state.doc.cut(
                this.editor.currentView.state.selection.from,
                this.editor.currentView.state.selection.to
            )
        )
        const selectionNumChars = selectionContent.split('\n').join('').length
        const selectionWords = selectionContent.split(/[\n ]+/)
        const selectionNumNoSpace = selectionWords.join('').length
        const selectionNumWords = selectionNumNoSpace ? selectionWords.length : 0

        return {
            docNumWords,
            docNumNoSpace,
            docNumChars,
            selectionNumWords,
            selectionNumNoSpace,
            selectionNumChars
        }
    }


}

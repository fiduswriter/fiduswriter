import {wordCounterDialogTemplate} from "./word_count_templates"
import {Dialog} from "../../common"

export class ModToolsWordCount {
    constructor(mod) {
        mod.wordCount = this
        this.mod = mod
    }

    countWords() {
        const textContent = this.mod.editor.view.state.doc.textContent,
            footnoteContent = this.mod.editor.mod.footnotes.fnEditor.view.state.doc.textContent,
            bibliographyContent = document.querySelector('.article-bibliography').textContent
        let wholeContent = textContent + ' ' + footnoteContent + ' ' + bibliographyContent
        const numChars = wholeContent.length - 2 // Subtract two for added spaces

        wholeContent = wholeContent.replace(/(^\s*)|(\s*$)/gi, "")
        wholeContent = wholeContent.replace(/[ ]{2,}/gi, " ")
        wholeContent = wholeContent.replace(/\n /, "\n")
        wholeContent = wholeContent.split(' ')

        const numWords = wholeContent.length
        const numNoSpace = wholeContent.join('').length

        return {
            numWords,
            numNoSpace,
            numChars
        }
    }

    wordCountDialog() {
        const stats = this.countWords(),
            dialog = new Dialog({
                title: gettext('Word counter'),
                body: wordCounterDialogTemplate({
                    'words': stats.numWords,
                    'chars_no_space': stats.numNoSpace,
                    'chars': stats.numChars
                }),
                buttons: [{type: 'close'}]
            })
        dialog.open()
    }

}

import {wordCounterDialogTemplate} from "./word_count_templates"

export class ModToolsWordCount {
    constructor(mod) {
        mod.wordCount = this
        this.mod = mod
    }

    countWords() {
        let textContent = this.mod.editor.view.state.doc.textContent,
            footnoteContent = this.mod.editor.mod.footnotes.fnEditor.view.state.doc.textContent,
            bibliographyContent = document.querySelector('.article-bibliography').textContent,
            wholeContent = textContent + ' ' + footnoteContent + ' ' + bibliographyContent,
            numChars = wholeContent.length - 2 // Subtract two for added spaces

        wholeContent = wholeContent.replace(/(^\s*)|(\s*$)/gi,"")
        wholeContent = wholeContent.replace(/[ ]{2,}/gi," ")
        wholeContent = wholeContent.replace(/\n /,"\n")
        wholeContent = wholeContent.split(' ')

        let numWords = wholeContent.length
        let numNoSpace = wholeContent.join('').length

        return {
            numWords: numWords,
            numNoSpace: numNoSpace,
            numChars: numChars
        }
    }

    wordCountDialog() {
        let stats = this.countWords()
        let dialog = new Dialog({
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

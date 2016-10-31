import {wordCounterDialogTemplate} from "./word-count-templates"

export class ModToolsWordCount {
    constructor(mod) {
        mod.wordCount = this
        this.mod = mod
    }

    countWords() {
        let textContent = this.mod.editor.pm.doc.textContent,
            footnoteContent = this.mod.editor.mod.footnotes.fnPm.doc.textContent,
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

        jQuery('body').append(wordCounterDialogTemplate({
            'dialogHeader': gettext('Word counter'),
            'words': stats.numWords,
            'chars_no_space': stats.numNoSpace,
            'chars': stats.numChars
        }))

        jQuery('#word-counter-dialog').dialog({
            draggable : false,
            resizable : false,
            modal : true,
            buttons : {'Close': function() {
                jQuery('#word-counter-dialog').dialog('close')
            }},
            create : function () {
                let theDialog = jQuery(this).closest(".ui-dialog");
                theDialog.find(".ui-dialog-buttonset .ui-button:eq(0)").addClass("fw-button fw-orange")
            },

            close : function() {
                jQuery(this).dialog('destroy').remove()
            }
        })
    }

}

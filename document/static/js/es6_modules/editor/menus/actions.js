import {savecopy} from "../../exporter/copy"
import {downloadNative, uploadNative} from "../../exporter/native"
import {downloadLatex} from "../../exporter/latex"
import {downloadHtml} from "../../exporter/html"
import {downloadEpub} from "../../exporter/epub"

export class ModMenusActions {
    constructor(mod) {
        mod.actions = this
        this.mod = mod
    }

    saveRevision() {
        let that = this
        that.mod.editor.getUpdates(function() {
            that.mod.editor.sendDocumentUpdate(function() {
                uploadNative(that.mod.editor)
            })
        })
    }

    saveCopy() {
        let that = this
        that.mod.editor.getUpdates(function() {
            that.mod.editor.sendDocumentUpdate(function (){
                savecopy(that.mod.editor.doc, that.mod.editor)
            })
        })
    }

    download() {
        let that = this
        that.mod.editor.getUpdates(function() {
            that.mod.editor.sendDocumentUpdate(function (){
                downloadNative(that.mod.editor.doc, true)
            })
        })
    }

    downloadLatex() {
        let that = this
        that.mod.editor.getUpdates(function() {
              that.mod.editor.sendDocumentUpdate(function () {
                  downloadLatex(that.mod.editor.doc, true)
              })
        })
    }

    downloadEpub() {
        let that = this
        that.mod.editor.getUpdates(function() {
            that.mod.editor.sendDocumentUpdate(function () {
                downloadEpub(that.mod.editor.doc, true)
            })
        })
    }

    downloadHtml() {
        let that = this
        that.mod.editor.getUpdates(function() {
            that.mod.editor.sendDocumentUpdate(function () {
                downloadHtml(that.mod.editor.doc, true)
            })
        })
    }

    close() {
        let that = this
        that.mod.editor.getUpdates(function() {
            that.mod.editor.sendDocumentUpdate(function () {
                window.location.href = '/'
            })
        })
    }

    showKeyBindings() {
        this.mod.editor.mod.tools.showKeyBindings.show()
    }

    print() {
        this.mod.editor.mod.tools.print.print()
    }

    wordCounter() {
        this.mod.editor.mod.tools.wordCount.wordCountDialog()
    }


}

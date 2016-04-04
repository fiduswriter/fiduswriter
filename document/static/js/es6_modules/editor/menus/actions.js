import {savecopy} from "../../exporter/copy"
import {downloadNative, uploadNative} from "../../exporter/native"
import {LatexExporter} from "../../exporter/latex"
import {HTMLExporter} from "../../exporter/html"
import {EpubExporter} from "../../exporter/epub"

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
                savecopy(that.mod.editor.doc, that.mod.editor, that.mod.editor.user, false)
            })
        })
    }

    download() {
        let that = this
        that.mod.editor.getUpdates(function() {
            that.mod.editor.sendDocumentUpdate(function (){
                downloadNative(that.mod.editor.doc, window.BibDB)
            })
        })
    }

    downloadLatex() {
        let that = this
        that.mod.editor.getUpdates(function() {
              that.mod.editor.sendDocumentUpdate(function () {
                  new LatexExporter(that.mod.editor.doc, window.BibDB)
              })
        })
    }

    downloadEpub() {
        let that = this
        that.mod.editor.getUpdates(function() {
            that.mod.editor.sendDocumentUpdate(function () {
                new EpubExporter(that.mod.editor.doc, window.BibDB)
            })
        })
    }

    downloadHtml() {
        let that = this
        that.mod.editor.getUpdates(function() {
            that.mod.editor.sendDocumentUpdate(function () {
                new HTMLExporter(that.mod.editor.doc, window.BibDB)
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

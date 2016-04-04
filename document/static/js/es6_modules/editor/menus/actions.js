import {savecopy} from "../../exporter/copy"
import {NativeExporter, uploadNative} from "../../exporter/native"
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
                if (that.mod.editor.doc.owner.id === that.mod.editor.user.id) {
                    // We are copying from and to the same user. We don't need different databases for this.
                    savecopy(that.mod.editor.doc, that.mod.editor.bibDB, that.mod.editor.imageDB, that.mod.editor.bibDB, that.mod.editor.imageDB, that.mod.editor.user, function(doc, docInfo){
                        that.mod.editor.doc = doc
                        that.mod.editor.docInfo = docInfo
                        window.history.pushState("", "", "/document/"+that.mod.editor.doc.id+"/")
                    })
                } else {
                    // We copy from one user to another. So we first load one set of databases, and then the other
                    let oldBibDB = that.mod.editor.bibDB
                    let oldImageDB = that.mod.editor.imageDB
                    that.mod.editor.removeBibDB()
                    that.mod.editor.removeImageDB()
                    the.mod.editor.getBibDB(that.mod.editor.user.id, function(){
                        the.mod.editor.getImageDB(that.mod.editor.user.id, function(){
                            savecopy(that.mod.editor.doc, oldBibDB, oldImageDB, that.mod.editor.bibDB,
                                    that.mod.editor.imageDB, that.mod.editor.user, function(doc, docInfo){
                                if (that.mod.editor.docInfo.rights ==='r') {
                                    /* We only had right access to the document,
                                    so the editing elements won't show. We therefore need to reload the page to get them.
                                    TODO: Find out if this restriction still is true.
                                    */
                                    window.location = '/document/'+doc.id+'/'
                                } else {
                                    that.mod.editor.doc = doc
                                    that.mod.editor.docInfo = docInfo
                                    window.history.pushState("", "", "/document/"+that.mod.editor.doc.id+"/")
                                }
                            })
                        })
                    })
                }
            })

        })
    }

    download() {
        let that = this
        that.mod.editor.getUpdates(function() {
            that.mod.editor.sendDocumentUpdate(function (){
                new NativeExporter(that.mod.editor.doc, that.mod.editor.bibDB, that.mod.editor.imageDB)
            })
        })
    }

    downloadLatex() {
        let that = this
        that.mod.editor.getUpdates(function() {
              that.mod.editor.sendDocumentUpdate(function () {
                  new LatexExporter(that.mod.editor.doc, that.mod.editor.bibDB)
              })
        })
    }

    downloadEpub() {
        let that = this
        that.mod.editor.getUpdates(function() {
            that.mod.editor.sendDocumentUpdate(function () {
                new EpubExporter(that.mod.editor.doc, that.mod.editor.bibDB)
            })
        })
    }

    downloadHtml() {
        let that = this
        that.mod.editor.getUpdates(function() {
            that.mod.editor.sendDocumentUpdate(function () {
                new HTMLExporter(that.mod.editor.doc, that.mod.editor.bibDB)
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

import {savecopy} from "../../exporter/native/copy"
import {NativeExporter, uploadNative} from "../../exporter/native"
import {LatexExporter} from "../../exporter/latex"
import {HTMLExporter} from "../../exporter/html"
import {EpubExporter} from "../../exporter/epub"
import {DocxExporter} from "../../exporter/docx"
import {OdtExporter} from "../../exporter/odt"

export class ModMenusActions {
    constructor(mod) {
        mod.actions = this
        this.mod = mod
    }

    saveRevision() {
        let that = this
        that.mod.editor.save(function() {
            uploadNative(that.mod.editor)
        })
    }

    saveCopy() {
        let that = this
        that.mod.editor.save(function() {
            if (that.mod.editor.doc.owner.id === that.mod.editor.user.id) {
                // We are copying from and to the same user. We don't need different databases for this.
                savecopy(that.mod.editor.doc, that.mod.editor.bibDB.db, that.mod.editor.imageDB.db,
                    that.mod.editor.bibDB.db, that.mod.editor.imageDB.db, that.mod.editor.user,
                    function(doc, docInfo, newBibEntries){
                        window.location.href = `/document/${doc.id}/`
                })
            } else {
                // We copy from one user to another. So we first load one set of databases, and then the other
                let oldBibDB = that.mod.editor.bibDB.db
                let oldImageDB = that.mod.editor.imageDB.db
                that.mod.editor.removeBibDB()
                that.mod.editor.removeImageDB()
                that.mod.editor.getBibDB(that.mod.editor.user.id, function(){
                    that.mod.editor.getImageDB(that.mod.editor.user.id, function(){
                        savecopy(that.mod.editor.doc, oldBibDB, oldImageDB, that.mod.editor.bibDB.db,
                                that.mod.editor.imageDB.db, that.mod.editor.user,
                                function(doc, docInfo, newBibEntries){
                            window.location.href = `/document/${doc.id}/`
                        })
                    })
                })
            }
        })
    }

    download() {
        let that = this
        that.mod.editor.save(function (){
            new NativeExporter(that.mod.editor.doc, that.mod.editor.bibDB, that.mod.editor.imageDB.db)
        })
    }

    downloadOdt() {
        let that = this
        that.mod.editor.save(function() {
            new OdtExporter(that.mod.editor.doc, that.mod.editor.bibDB, that.mod.editor.imageDB)
        })
    }

    downloadDocx() {
        let that = this
        that.mod.editor.save(function() {
            new DocxExporter(that.mod.editor.doc, that.mod.editor.bibDB, that.mod.editor.imageDB)
        })
    }

    downloadLatex() {
        let that = this
        that.mod.editor.save(function() {
            new LatexExporter(that.mod.editor.doc, that.mod.editor.bibDB)
        })
    }

    downloadEpub() {
        let that = this
        that.mod.editor.save(function () {
            new EpubExporter(that.mod.editor.doc, that.mod.editor.bibDB)
        })
    }

    downloadHtml() {
        let that = this
        that.mod.editor.save(function() {
            new HTMLExporter(that.mod.editor.doc, that.mod.editor.bibDB)
        })
    }

    close() {
        let that = this
        that.mod.editor.save(function () {
            window.location.href = '/'
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

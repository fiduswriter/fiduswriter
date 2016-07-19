import {savecopy} from "../../exporter/copy"
import {NativeExporter, uploadNative} from "../../exporter/native"
import {LatexExporter} from "../../exporter/latex"
import {HTMLExporter} from "../../exporter/html"
import {EpubExporter} from "../../exporter/epub"
import {selectJournal} from "../../submit/journal"

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
                savecopy(that.mod.editor.doc, that.mod.editor.bibDB.bibDB, that.mod.editor.imageDB.db,
                    that.mod.editor.bibDB.bibDB, that.mod.editor.imageDB.db, that.mod.editor.user,
                    function(doc, docInfo, newBibEntries){
                        window.location.href = `/document/${doc.id}/`
                })
            } else {
                // We copy from one user to another. So we first load one set of databases, and then the other
                let oldBibDB = that.mod.editor.bibDB.bibDB
                let oldImageDB = that.mod.editor.imageDB.db
                that.mod.editor.removeBibDB()
                that.mod.editor.removeImageDB()
                that.mod.editor.getBibDB(that.mod.editor.user.id, function(){
                    that.mod.editor.getImageDB(that.mod.editor.user.id, function(){
                        savecopy(that.mod.editor.doc, oldBibDB, oldImageDB, that.mod.editor.bibDB.bibDB,
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
            new NativeExporter(that.mod.editor.doc, that.mod.editor.bibDB.bibDB, that.mod.editor.imageDB.db)
        })
    }

    downloadLatex() {
        let that = this
        that.mod.editor.save(function() {
            new LatexExporter(that.mod.editor.doc, that.mod.editor.bibDB.bibDB)
        })
    }

    downloadEpub() {
        let that = this
        that.mod.editor.save(function () {
            new EpubExporter(that.mod.editor.doc, that.mod.editor.bibDB.bibDB)
        })
    }

    downloadHtml() {
        let that = this
        that.mod.editor.save(function() {
            new HTMLExporter(that.mod.editor.doc, that.mod.editor.bibDB.bibDB)
        })
    }

    close() {
        let that = this
        that.mod.editor.save(function () {
            window.location.href = '/'
        })
    }

    submitOjs() {
        let that = this
        let list = null
        that.mod.editor.save(function () {
            selectJournal(that.mod.editor)
            /*jQuery.ajax({
                type: "GET",
                dataType: "json",
                url:'http://10.6.13.146/index.php/mda/gateway/plugin/RestApiGatewayPlugin/journals',
                success: function (result) {
                    //console.log(JSON.stringify(result['journals'][1]['name']))
                    //let journal = null
                    //let list =result['journals']
                    //for (journal in list)
                    //console.log(list[journal]['name'])
                    console.log(that.mod.editor.doc)
                    //let journal = null
                    that.list =result['journals']
                    //for (journal in that.list)
                    //console.log(that.list[journal]['name'])
                    let journal = null
            let fields = ""
            for (journal in that.list){
                console.log(that.list[journal]['name'])
                fields += '<input type="radio" id="'+that.list[journal]['id']+'" name="journalList" value="'
                +that.list[journal]['name']+'"><label for="'+that.list[journal]['id']+'"> '+that.list[journal]['name']+'</label><br><br>'
                }
            let journalDialogTemplate = '<div title="List of journals to submit the paper"><from><fieldset>'+fields+'</fieldset></form></div>'
            jQuery(journalDialogTemplate).dialog({
            autoOpen: true,
            height: 180,
            width: 300,
            modal: true,
            create: function() {
                let theDialog = jQuery(this).closest(".ui-dialog")
                theDialog.find(".ui-button:first-child").addClass(
                    "fw-button fw-dark")
                theDialog.find(".ui-button:last").addClass(
                    "fw-button fw-orange")
            },
            })
                }
            })*/
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

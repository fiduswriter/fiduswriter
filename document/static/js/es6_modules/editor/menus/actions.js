import {saveCopy} from "../../exporter/native/copy"
import {NativeExporter, uploadNative} from "../../exporter/native"
import {LatexExporter} from "../../exporter/latex"
import {HTMLExporter} from "../../exporter/html"
import {EpubExporter} from "../../exporter/epub"
import {DocxExporter} from "../../exporter/docx"
import {OdtExporter} from "../../exporter/odt"
import {selectJournal, reviewSubmit, submissionRevisionDone} from "../../submission"

export class ModMenusActions {
    constructor(mod) {
        mod.actions = this
        this.mod = mod
    }

    saveRevision() {
        this.mod.editor.save().then(() => {
            uploadNative(this.mod.editor)
        })
    }

    saveCopy() {
        this.mod.editor.save().then(() => {
            if (this.mod.editor.doc.owner.id === this.mod.editor.user.id) {
                // We are copying from and to the same user. We don't need different databases for this.
                saveCopy(
                    this.mod.editor.doc,
                    this.mod.editor.bibDB.db,
                    this.mod.editor.imageDB.db,
                    this.mod.editor.bibDB.db,
                    this.mod.editor.imageDB.db,
                    this.mod.editor.user
                ).then(
                    ({doc, docInfo}) => {
                        window.location.href = `/document/${doc.id}/`
                    }
                )
            } else {
                // We copy from one user to another. So we first load one set of
                // databases, and then the other
                let oldBibDB = this.mod.editor.bibDB.db
                let oldImageDB = this.mod.editor.imageDB.db
                this.mod.editor.removeBibDB()
                this.mod.editor.removeImageDB()
                this.mod.editor.getBibDB(
                    this.mod.editor.user.id
                ).then(
                    () => this.mod.editor.getImageDB(this.mod.editor.user.id)
                ).then(() => {
                    saveCopy(
                        this.mod.editor.doc,
                        oldBibDB,
                        oldImageDB,
                        this.mod.editor.bibDB.db,
                        this.mod.editor.imageDB.db,
                        this.mod.editor.user
                    ).then(
                        ({doc, docInfo}) => {
                            window.location.href = `/document/${doc.id}/`
                        }
                    )
                })
            }
        })
    }

    download() {
        this.mod.editor.save().then(() => {
            new NativeExporter(
                this.mod.editor.doc,
                this.mod.editor.bibDB,
                this.mod.editor.imageDB.db
            )
        })
    }

    downloadTemplateExport(templateUrl, templateType) {
        this.mod.editor.save().then(() => {
            if (templateType === 'docx') {
                new DocxExporter(
                    this.mod.editor.doc,
                    templateUrl,
                    this.mod.editor.bibDB,
                    this.mod.editor.imageDB
                )
            } else {
                new OdtExporter(
                    this.mod.editor.doc,
                    templateUrl,
                    this.mod.editor.bibDB,
                    this.mod.editor.imageDB
                )
            }

        })
    }

    downloadLatex() {
        this.mod.editor.save().then(() => {
            new LatexExporter(
                this.mod.editor.doc,
                this.mod.editor.bibDB,
                this.mod.editor.imageDB
            )
        })
    }

    downloadEpub() {
        this.mod.editor.save().then(() => {
            new EpubExporter(
                this.mod.editor.doc,
                this.mod.editor.bibDB
            )
        })
    }

    downloadHtml() {
        this.mod.editor.save().then(() => {
            new HTMLExporter(
                this.mod.editor.doc,
                this.mod.editor.bibDB
            )
        })
    }

    close() {
        this.mod.editor.save().then(() => {
            window.location.href = '/'
        })
    }

    submitOjs() {
        this.mod.editor.save().then(() => selectJournal(this.mod.editor))
    }

    submitReview() {
        this.mod.editor.save().then(() => reviewSubmit(this.mod.editor))
    }

    revisionFinished() {
        this.mod.editor.save().then(() => submissionRevisionDone(this.mod.editor))
    }

    returnToOJS() {
        this.mod.editor.save().then(() => {
            window.location.href = window.ojsUrl
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

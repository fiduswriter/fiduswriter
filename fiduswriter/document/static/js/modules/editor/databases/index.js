import {ModImageDB} from "./images"
import {ModBibliographyDB} from "./bibliography"

export class ModDB {
    constructor(editor) {
        editor.mod.db = this
        this.editor = editor
        new ModImageDB(this)
        new ModBibliographyDB(this)
        // assign bibDB to be used in document schema.
        this.editor.schema.cached.bibDB = this.bibDB
        // assign bibDB to be used in footnote schema.
        this.editor.mod.footnotes.fnEditor.schema.cached.bibDB = this.bibDB
        // assign image DB to be used in document schema.
        this.editor.schema.cached.imageDB = this.imageDB
        // assign image DB to be used in footnote schema.
        this.editor.mod.footnotes.fnEditor.schema.cached.imageDB = this.imageDB
    }

    // remove images/citation items that are no longer part of the document.
    clean() {
        const usedImages = [],
            usedBibs = []
        this.editor.view.state.doc.descendants(node => {
            if (node.type.name==='citation') {
                node.attrs.references.forEach(ref => usedBibs.push(parseInt(ref.id)))
            } else if (node.type.name==='figure' && node.attrs.image) {
                usedImages.push(node.attrs.image)
            }
        })

        this.editor.mod.footnotes.fnEditor.view.state.doc.descendants(node => {
            if (node.type.name==='citation') {
                node.attrs.references.forEach(ref => usedBibs.push(parseInt(ref.id)))
            } else if (node.type.name==='figure' && node.attrs.image) {
                usedImages.push(node.attrs.image)
            }
        })

        const unusedImages = Object.keys(this.imageDB.db).filter(value =>
                !usedImages.includes(parseInt(value))
            ),
            unusedBibs = Object.keys(this.bibDB.db).filter(value =>
                !usedBibs.includes(parseInt(value))
            )
        unusedImages.forEach(id => this.imageDB.deleteImage(id))
        unusedBibs.forEach(id => this.bibDB.deleteReference(id))
    }
}

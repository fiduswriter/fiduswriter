import {ZipFidus} from "./zip"
import {ShrinkFidus} from "./shrink"
import {createSlug} from "../tools/file"
import {BibliographyDB} from "../../bibliography/database"
import {ImageDB} from "../../images/database"
import download from "downloadjs"

export class ExportFidusFile {
    constructor(doc, bibDB, imageDB) {
        this.doc = doc
        this.bibDB = bibDB
        this.imageDB = imageDB
        this.init()
    }

    init() {
        this.getBibDB().then(
            () => this.getImageDB()
        ).then(
            () => {
                let shrinker = new ShrinkFidus(this.doc, this.imageDB, this.bibDB)
                return shrinker.init()
            }
        ).then(
            ({doc, shrunkImageDB, shrunkBibDB, httpIncludes}) => {
                let zipper = new ZipFidus(doc, shrunkImageDB, shrunkBibDB, httpIncludes)
                return zipper.init()
            }
        ).then(
            blob => download(blob, createSlug(this.doc.title) + '.fidus', 'application/fidus+zip')
        )
    }

    getBibDB() {
        if (!this.bibDB) {
            this.bibDB = new BibliographyDB(this.doc.owner.id)
            return this.bibDB.getDB()
        } else {
            return Promise.resolve()
        }
    }

    getImageDB() {
        if (!this.imageDB) {
            this.imageDB = new ImageDB(this.doc.owner.id)
            return this.imageDB.getDB()
        } else {
            return Promise.resolve()
        }
    }
}

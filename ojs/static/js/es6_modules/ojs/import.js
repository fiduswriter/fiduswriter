import {BibliographyDB} from "../bibliography/database"
import {ImageDB} from "../images/database"
import JSZipUtils from "jszip-utils"
import {ImportFidusFile} from "../importer/file"

// Imports a zipped submission revision file into the doc connected to the
// revision.
export class ImportSubmissionRevisionDoc {
    constructor (revId, docId, ownerId) {
        this.revId = revId
        this.docId = docId
        this.owner = {
            id: ownerId,
            //username: '',
            //avatar: ''
        }

        this.revFile = false
        this.bibDB = false
        this.imageDB = false
    }

    init() {
        return this.getBibDB().then(
            () => this.getImageDB()
        ).then(
            () => this.importRevisionFile()
        ).then(
            () => this.redirect()
        )
    }

    getBibDB() {
        let bibGetter = new BibliographyDB(this.owner.id)
        return bibGetter.getDB().then(({bibPKs, bibCats}) => {
            this.bibDB = bibGetter
        })
    }

    getImageDB() {
        let imageGetter = new ImageDB(this.owner.id)
        return imageGetter.getDB().then(() => {
            this.imageDB = imageGetter
        })
    }

    importRevisionFile () {
        return new Promise(resolve => {
            JSZipUtils.getBinaryContent(
                `/ojs/get_revision_file/${this.revId}/`,
                (err, fidusFile) => {
                    let importer = new ImportFidusFile(
                        fidusFile,
                        this.owner,
                        false,
                        this.bibDB,
                        this.imageDB,
                        this.docId
                    )
                    importer.init().then(
                        () => resolve()
                    )
                }
            )
        })
    }

    redirect () {
        window.location.replace(`/document/${this.docId}/`);
    }

}

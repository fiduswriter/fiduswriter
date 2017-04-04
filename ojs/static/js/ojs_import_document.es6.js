import {ImportSubmissionRevisionDoc} from "./es6_modules/ojs"

let theImporter = new ImportSubmissionRevisionDoc(
    window.revId,
    window.docId,
    window.ownerId
)

theImporter.init()

window.theImporter = theImporter

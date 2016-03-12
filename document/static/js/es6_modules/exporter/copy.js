import {exportNative} from "./native"
import {getDBs} from "../importer/get-extra-data"

export let savecopy = function(aDocument, editor) {
    function importAsUser(aDocument, shrunkImageDB, shrunkBibDB,
        images) {
        // switch to user's own ImageDB and BibDB:
        if (editor) {
            editor.doc.owner = editor.user
            delete window.ImageDB
            delete window.BibDB
        }
        getDBs(aDocument, shrunkBibDB, shrunkImageDB,
            images)

    }
    if (editor) {
        exportNative(aDocument, ImageDB, BibDB, importAsUser)
    } else {
        bibliographyHelpers.getABibDB(aDocument.owner, function(
            aBibDB) {
            usermediaHelpers.getAnImageDB(aDocument.owner,
                function(anImageDB) {
                    exportNative(aDocument, anImageDB,
                        aBibDB, importAsUser)
                })
        })
    }

}

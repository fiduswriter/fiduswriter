import {exportNative} from "./native"

export let savecopy = function(aDocument, editor) {
    function importAsUser(aDocument, shrunkImageDB, shrunkBibDB,
        images) {
        // switch to user's own ImageDB and BibDB:
        if (editor) {
            editor.doc.owner = editor.user
            delete window.ImageDB
            delete window.BibDB
        }
        importer.getDBs(aDocument, shrunkBibDB, shrunkImageDB,
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

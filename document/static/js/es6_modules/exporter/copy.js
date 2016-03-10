import {exportNative} from "./native"

export let savecopy = function(aDocument) {
    function importAsUser(aDocument, shrunkImageDB, shrunkBibDB,
        images) {
        // switch to user's own ImageDB and BibDB:
        if (window.hasOwnProperty('theEditor')) {
            theEditor.doc.owner = theEditor.user
            delete window.ImageDB
            delete window.BibDB
        }
        importer.getDBs(aDocument, shrunkBibDB, shrunkImageDB,
            images)

    }
    if (window.hasOwnProperty('theEditor')) {
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

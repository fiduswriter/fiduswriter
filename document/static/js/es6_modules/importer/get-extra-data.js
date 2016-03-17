import {importNative} from "./compare-DBs"

export let getDBs = function (aDocument, shrunkBibDB, shrunkImageDB,
    entries) {
    // get BibDB and ImageDB if we don't have them already. Then invoke the native importer.
    if ('undefined' === typeof (BibDB)) {
        bibliographyHelpers.getBibDB(function () {
            if ('undefined' === typeof (ImageDB)) {
                usermediaHelpers.getImageDB(function () {
                    importNative(aDocument, shrunkBibDB, shrunkImageDB,
    entries)
                })
            } else {
                importNative(aDocument, shrunkBibDB, shrunkImageDB,
    entries)
            }
        })
    } else if ('undefined' === typeof (ImageDB)) {
        usermediaHelpers.getImageDB(function () {
            importNative(aDocument, shrunkBibDB, shrunkImageDB,
    entries)
        })
    } else {
        importNative(aDocument, shrunkBibDB, shrunkImageDB,
    entries)
    }
}

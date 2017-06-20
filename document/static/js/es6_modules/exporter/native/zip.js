import {ZipFileCreator} from "../tools/zip"

/** The current Fidus Writer filetype version.
 * The importer will not import from a higher version and the exporter
  * will include this number in all exports.
 */
export let FW_FILETYPE_VERSION = "1.7"

/** Create a zip blob for a shrunk fidus file.
*/

export class ZipFidus {
    constructor(doc, shrunkImageDB, shrunkBibDB, httpIncludes) {
        this.doc = doc
        this.shrunkImageDB = shrunkImageDB
        this.shrunkBibDB = shrunkBibDB
        this.httpIncludes = httpIncludes
    }

    init() {
        let outputList = [{
            filename: 'document.json',
            contents: JSON.stringify(this.doc),
        }, {
            filename: 'images.json',
            contents: JSON.stringify(this.shrunkImageDB)
        }, {
            filename: 'bibliography.json',
            contents: JSON.stringify(this.shrunkBibDB)
        }, {
            filename: 'filetype-version',
            contents: FW_FILETYPE_VERSION
        }]

        let zipper = new ZipFileCreator(
            outputList,
            this.httpIncludes,
            [],
            'application/fidus+zip'
        )
        return zipper.init()
    }
}

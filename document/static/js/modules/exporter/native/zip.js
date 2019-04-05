import {ZipFileCreator} from "../tools/zip"

/** The current Fidus Writer filetype version.
 * The importer will not import from a higher version and the exporter
  * will include this number in all exports.
 */
export const FW_FILETYPE_VERSION = "3.0"

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
        const outputList = [{
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

        const zipper = new ZipFileCreator(
            outputList,
            this.httpIncludes,
            [],
            'application/fidus+zip'
        )
        return zipper.init()
    }
}
